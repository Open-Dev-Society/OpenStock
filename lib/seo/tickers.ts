import file from '@/data/us-tickers.json';

export type IndexId = 'SP500' | 'NDX100';

export type UsTicker = {
    symbol: string;
    name: string;
    exchange: string;
    sector: string;
    subIndustry: string;
    cik: string;
    indexes: IndexId[];
};

// Sorted by symbol. Regenerated with scripts/build-us-tickers.mjs.
export const US_TICKERS: UsTicker[] = file.tickers as UsTicker[];

const BY_SYMBOL = new Map(US_TICKERS.map((ticker) => [ticker.symbol, ticker]));

const INDEX_LABEL: Record<IndexId, string> = {
    SP500: 'S&P 500',
    NDX100: 'Nasdaq-100',
};

export function findTicker(raw: string): UsTicker | undefined {
    let symbol = raw.trim().toUpperCase();
    try {
        symbol = decodeURIComponent(symbol);
    } catch {
        // Keep the raw segment when it isn't valid percent-encoding.
    }
    return BY_SYMBOL.get(symbol) ?? BY_SYMBOL.get(symbol.replace(/-/g, '.'));
}

export function tickerPath(symbol: string): string {
    return `/s/${encodeURIComponent(symbol)}`;
}

export function indexLabel(id: IndexId): string {
    return INDEX_LABEL[id];
}

function exchangePhrase(exchange: string): string {
    if (!exchange) return 'listed in the United States';
    if (exchange === 'NYSE' || exchange.startsWith('NYSE ')) return `listed on the ${exchange}`;
    return `listed on ${exchange}`;
}

export function tickerIntro(ticker: UsTicker): string {
    const place = [exchangePhrase(ticker.exchange), ticker.sector ? `in the ${ticker.sector} sector` : '']
        .filter(Boolean)
        .join(', ');
    const sub = ticker.subIndustry ? ` (${ticker.subIndustry})` : '';
    const names = ticker.indexes.map((id) => `the ${indexLabel(id)}`);
    const membership = names.length === 0
        ? ''
        : names.length === 1
            ? ` It is in ${names[0]}.`
            : ` It is in ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}.`;
    return `${ticker.name} (${ticker.symbol}) is ${place}${sub}.${membership} This page shows a TradingView chart for ${ticker.symbol} and the company's recent annual and quarterly reports from the SEC EDGAR database. It does not include a price quote.`;
}

export function relatedTickers(ticker: UsTicker, limit = 8): UsTicker[] {
    const peers = US_TICKERS
        .filter((other) => other.sector === ticker.sector && other.symbol !== ticker.symbol)
        .sort((a, b) => a.symbol.localeCompare(b.symbol));
    const after = peers.filter((other) => other.symbol > ticker.symbol);
    const before = peers.filter((other) => other.symbol < ticker.symbol);
    return [...after, ...before].slice(0, limit);
}

export function adjacentTickers(ticker: UsTicker): { prev?: UsTicker; next?: UsTicker } {
    const index = US_TICKERS.findIndex((other) => other.symbol === ticker.symbol);
    return {
        prev: index > 0 ? US_TICKERS[index - 1] : undefined,
        next: index >= 0 && index < US_TICKERS.length - 1 ? US_TICKERS[index + 1] : undefined,
    };
}

export function tickersBySector(): { sector: string; tickers: UsTicker[] }[] {
    const groups = new Map<string, UsTicker[]>();
    for (const ticker of US_TICKERS) {
        const list = groups.get(ticker.sector) ?? [];
        list.push(ticker);
        groups.set(ticker.sector, list);
    }
    return [...groups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([sector, tickers]) => ({ sector, tickers }));
}

export function sectorAnchor(sector: string): string {
    return sector.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
