// Yahoo Finance helpers for exchanges the free sources price badly: Tadawul (.SR) is blocked in TradingView's free
// embeds and on Finnhub free; Warsaw (GPW, .WA) renders in embeds but only end of day, where Yahoo is ~15 minutes delayed.
// Pure functions, covered by tests; the network call lives in lib/actions/yahoo.actions.ts.

type YahooExchange = { suffix: string; ticker: RegExp; indices: Record<string, string> };

// TradingView prefix -> Yahoo suffix, the shape of a ticker, and index tickers with their Yahoo symbols
const YAHOO_EXCHANGES: Record<string, YahooExchange> = {
    TADAWUL: { suffix: 'SR', ticker: /^\d+$/, indices: { TASI: '^TASI.SR' } },
    GPW: { suffix: 'WA', ticker: /^[A-Z0-9]+$/, indices: { WIG20: 'WIG20.WA', WIG: 'WIG.WA', MWIG40: 'MWIG40.WA', SWIG80: 'SWIG80.WA' } },
};

const INDEX_SYMBOLS = new Set(Object.values(YAHOO_EXCHANGES).flatMap((ex) => Object.values(ex.indices)));

// "2222.SR" or "TADAWUL:2222" -> "2222.SR"; "PKN.WA" or "GPW:PKN" -> "PKN.WA".
// Indices: "TADAWUL:TASI" -> "^TASI.SR", "GPW:WIG20" -> "WIG20.WA". Anything else -> null.
export function normalizeYahooSymbol(symbol: string): string | null {
    const upper = (symbol || '').trim().toUpperCase();
    if (INDEX_SYMBOLS.has(upper)) return upper;
    for (const [prefix, ex] of Object.entries(YAHOO_EXCHANGES)) {
        const ticker = upper.startsWith(`${prefix}:`) ? upper.slice(prefix.length + 1)
            : upper.endsWith(`.${ex.suffix}`) ? upper.slice(0, -(ex.suffix.length + 1))
            : null;
        if (ticker === null) continue;
        if (ex.indices[ticker]) return ex.indices[ticker];
        return ex.ticker.test(ticker) ? `${ticker}.${ex.suffix}` : null;
    }
    return null;
}

export const isYahooSymbol = (symbol: string) => normalizeYahooSymbol(symbol) !== null;

// "TADAWUL:2222" -> "2222.SR", "GPW:PKN" -> "PKN.WA": the symbols our stock pages use. Indices have no stock page.
export const yahooAppSymbol = (tvSymbol: string) => {
    const yahoo = normalizeYahooSymbol(tvSymbol);
    return yahoo && !INDEX_SYMBOLS.has(yahoo) ? yahoo : null;
};

export type YahooDailyQuote = {
    price: number;
    change: number;
    changePercent: number;
    currency: string;
    name: string;
};

type YahooChartJson = {
    chart?: {
        result?: Array<{
            meta?: { currency?: string; shortName?: string; longName?: string; regularMarketPrice?: number; fulldayChange?: number; regularMarketChangePercent?: number };
            indicators?: { quote?: Array<{ close?: (number | null)[] }> };
        }>;
    };
};

// Today's quote from a /v8/finance/chart response: Yahoo's own day change when it sends one,
// else the last two daily closes (TASI and the WIG indices only ever return one daily bar, so they need the former).
// longName first: GPW short names look like "PKN C.XWAR PLN".
export function dailyQuoteFromChart(json: unknown): YahooDailyQuote | null {
    const result = (json as YahooChartJson)?.chart?.result?.[0];
    const meta = result?.meta;
    const closes = (result?.indicators?.quote?.[0]?.close ?? []).filter((n): n is number => Number.isFinite(n));
    if (!result || closes.length === 0) return null;
    const price = meta?.regularMarketPrice ?? closes[closes.length - 1];
    const prev = closes.length > 1 ? closes[closes.length - 2] : null;
    const change = meta?.fulldayChange ?? (prev != null ? price - prev : 0);
    return {
        price,
        change,
        changePercent: meta?.regularMarketChangePercent ?? (prev ? (change / prev) * 100 : 0),
        currency: result.meta?.currency || 'USD',
        name: result.meta?.longName || result.meta?.shortName || '',
    };
}
