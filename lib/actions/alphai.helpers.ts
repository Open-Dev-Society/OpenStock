export type AlphaiSentiment = 'positive' | 'neutral' | 'negative';

export interface AlphaiNewsItem {
    id: string;
    title: string;
    url: string;
    source: string;
    publishedAt: string | null;
    /** AlphAI's 1-10 relevance score for the article */
    relevance: number;
    /** Sentiment and one-line impact written for this symbol, when the article has an analysis for it */
    sentiment: AlphaiSentiment | null;
    impact: string | null;
    /** Distinct outlets that covered the same story (1 when it was a single publisher) */
    outlets: number;
}

export interface AlphaiTickerNews {
    symbol: string;
    items: AlphaiNewsItem[];
}

export const ALPHAI_MAX_ITEMS = 5;
// 5 and up: real company news and sector datapoints; recaps of already-known events stay out.
// Sent to AlphAI as min_relevance and checked again here, so the card never depends on the server honouring it.
export const ALPHAI_MIN_RELEVANCE = 5;

const MAX_IMPACT_LENGTH = 240;

// AlphAI tickers are bare US symbols (NVDA, BRK.B), Yahoo-suffixed listings (VOD.L) or crypto pairs (BTC-USD).
// Exchange-prefixed symbols (BINANCE:BTCUSDT) can't match, so they never spend a request.
const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9.-]{0,19}$/;

type Row = Record<string, unknown>;

const asRow = (value: unknown): Row | null =>
    value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : null;

const asText = (value: unknown): string | null =>
    typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

export function isAlphaiSymbol(symbol: string): boolean {
    return SYMBOL_PATTERN.test(symbol);
}

export function alphaiStockUrl(symbol: string): string {
    return `https://alphai.io/stock/${encodeURIComponent(symbol.toUpperCase())}?utm_source=openstock&utm_medium=partner`;
}

function safeHttpUrl(value: unknown): string | null {
    const text = asText(value);
    if (!text) return null;
    try {
        const url = new URL(text);
        return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
    } catch {
        return null;
    }
}

function normalizeSentiment(value: unknown): AlphaiSentiment | null {
    return value === 'positive' || value === 'neutral' || value === 'negative' ? value : null;
}

function truncate(text: string, max: number): string {
    return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

// The analysis for the page's own symbol only: an article about AAPL and MSFT carries one entry per ticker.
function analysisFor(symbol: string, enrichment: Row): { sentiment: AlphaiSentiment | null; impact: string | null } {
    const insights = asRow(enrichment.ai_trading_insights);
    const entries = Array.isArray(insights?.ticker_analysis) ? insights.ticker_analysis : [];
    for (const entry of entries) {
        const row = asRow(entry);
        if (asText(row?.ticker)?.toUpperCase() !== symbol) continue;
        const impact = asRow(row?.impact_analysis);
        const summary = asText(impact?.summary);
        return {
            sentiment: normalizeSentiment(impact?.sentiment),
            impact: summary ? truncate(summary, MAX_IMPACT_LENGTH) : null,
        };
    }
    return { sentiment: null, impact: null };
}

export function normalizeNewsItem(symbol: string, value: unknown): AlphaiNewsItem | null {
    const row = asRow(value);
    const original = asRow(row?.original);
    const enrichment = asRow(row?.enrichment);
    if (!row || !original || !enrichment) return null;

    const title = asText(original.title);
    const url = safeHttpUrl(original.url);
    const relevance = enrichment.relevance_score;
    if (!title || !url || typeof relevance !== 'number' || !Number.isInteger(relevance) || relevance < ALPHAI_MIN_RELEVANCE || relevance > 10) {
        return null;
    }

    const published = asText(original.time_published);
    const outlets = row.sources_count;

    return {
        id: asText(original.uid) ?? url,
        title,
        url,
        source: asText(original.source) ?? asText(original.source_domain) ?? new URL(url).hostname,
        publishedAt: published && !Number.isNaN(Date.parse(published)) ? published : null,
        relevance,
        ...analysisFor(symbol, enrichment),
        outlets: typeof outlets === 'number' && Number.isInteger(outlets) && outlets > 1 ? outlets : 1,
    };
}

export function normalizeAlphaiNews(symbol: string, payload: unknown): AlphaiTickerNews | null {
    const normalizedSymbol = symbol.trim().toUpperCase();
    const results = asRow(payload)?.results;
    if (!Array.isArray(results)) return null;

    const seen = new Set<string>();
    const items: AlphaiNewsItem[] = [];
    for (const result of results) {
        const item = normalizeNewsItem(normalizedSymbol, result);
        if (!item || seen.has(item.id) || seen.has(item.url)) continue;
        seen.add(item.id).add(item.url);
        items.push(item);
        if (items.length === ALPHAI_MAX_ITEMS) break;
    }

    return items.length ? { symbol: normalizedSymbol, items } : null;
}
