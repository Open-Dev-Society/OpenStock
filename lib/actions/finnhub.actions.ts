'use server';

import { getDateRange, validateArticle } from '@/lib/utils';
import { cache } from 'react';

const BRAPI_BASE_URL = (process.env.BRAPI_BASE_URL || 'https://brapi.dev').replace(/\/$/, '');
const BRAPI_API_TOKEN = process.env.BRAPI_API_TOKEN ?? '';
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? '';

type BrapiQuoteSnapshot = {
    shortName: string;
    longName: string;
    currency: string;
    regularMarketPrice: number;
    regularMarketChange: number;
    regularMarketChangePercent: number;
    marketCap: number | null;
    logourl: string;
};

type BrapiQuoteSeries = {
    requestedSymbol: string;
    symbol: string;
    changed: boolean;
    data: BrapiQuoteSnapshot;
};

type BrapiQuoteResponse = {
    results: BrapiQuoteSeries[];
};

type BrapiTicker = {
    symbol: string;
    name: string;
    longName: string | null;
    assetType: string | null;
    subType: string | null;
    exchange: 'B3';
    currency: 'BRL';
    isActive: boolean;
    quote: {
        lastPrice: number | null;
        changePercent: number | null;
    };
};

type BrapiTickerResponse = {
    results: BrapiTicker[];
};

declare global {
    var brapiRequestQueue: Promise<void> | undefined;
}

async function fetchJSON<T>(
    url: string,
    revalidateSeconds?: number,
    headers?: HeadersInit
): Promise<T> {
    const options: RequestInit & { next?: { revalidate?: number } } = revalidateSeconds
        ? { cache: 'force-cache', next: { revalidate: revalidateSeconds }, headers }
        : { cache: 'no-store', headers };

    const res = await fetch(url, options);
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Fetch failed ${res.status}: ${text}`);
    }
    return (await res.json()) as T;
}

export { fetchJSON };

async function withBrapiRequest<T>(request: () => Promise<T>): Promise<T> {
    const previous = globalThis.brapiRequestQueue ?? Promise.resolve();
    let release: () => void = () => {};
    const turn = new Promise<void>((resolve) => { release = resolve; });
    globalThis.brapiRequestQueue = previous.then(() => turn);

    await previous;
    try {
        return await request();
    } finally {
        release();
    }
}

function brapiHeaders(): HeadersInit | undefined {
    return BRAPI_API_TOKEN ? { Authorization: `Bearer ${BRAPI_API_TOKEN}` } : undefined;
}

function normalizeB3Symbol(symbol: string) {
    return symbol.trim().toUpperCase().replace(/^BMFBOVESPA:/, '').replace(/\.SA$/, '');
}

async function getBrapiQuotes(symbols: string[]) {
    const normalized = [...new Set(symbols.map(normalizeB3Symbol).filter(Boolean))];
    if (normalized.length === 0) return [];

    const url = `${BRAPI_BASE_URL}/api/v2/stocks/quote?symbols=${encodeURIComponent(normalized.join(','))}`;
    const response = await withBrapiRequest(() =>
        fetchJSON<BrapiQuoteResponse>(url, 0, brapiHeaders())
    );
    return response.results || [];
}

export async function getQuote(symbol: string) {
    try {
        const [quote] = await getBrapiQuotes([symbol]);
        if (!quote) return null;
        return {
            c: quote.data.regularMarketPrice,
            d: quote.data.regularMarketChange,
            dp: quote.data.regularMarketChangePercent,
        };
    } catch (error) {
        console.error('Error fetching B3 quote for', symbol, error);
        return null;
    }
}

export async function getCompanyProfile(symbol: string) {
    try {
        const [quote] = await getBrapiQuotes([symbol]);
        if (!quote) return null;
        return {
            currency: quote.data.currency,
            exchange: 'B3',
            logo: quote.data.logourl,
            marketCapitalization: quote.data.marketCap ?? undefined,
            name: quote.data.longName || quote.data.shortName,
            ticker: quote.symbol,
        };
    } catch (error) {
        console.error('Error fetching B3 company profile for', symbol, error);
        return null;
    }
}

export async function getWatchlistData(symbols: string[]) {
    if (!symbols?.length) return [];

    try {
        const quotes = await getBrapiQuotes(symbols);
        const byRequestedSymbol = new Map(
            quotes.map((quote) => [normalizeB3Symbol(quote.requestedSymbol), quote])
        );

        return symbols.flatMap((symbol) => {
            const quote = byRequestedSymbol.get(normalizeB3Symbol(symbol));
            if (!quote) return [];

            return [{
                symbol: quote.symbol,
                price: quote.data.regularMarketPrice,
                change: quote.data.regularMarketChange,
                changePercent: quote.data.regularMarketChangePercent,
                currency: quote.data.currency,
                name: quote.data.longName || quote.data.shortName,
                logo: quote.data.logourl,
                marketCap: quote.data.marketCap ?? undefined,
            }];
        });
    } catch (error) {
        console.error('Error fetching B3 watchlist data', error);
        return [];
    }
}

export async function getNews(symbols?: string[]): Promise<MarketNewsArticle[]> {
    const cleanSymbols = (symbols || [])
        .map(normalizeB3Symbol)
        .filter(Boolean);

    if (!FINNHUB_API_KEY || cleanSymbols.length === 0) return [];

    const range = getDateRange(5);
    const perSymbolArticles = await Promise.all(
        cleanSymbols.map(async (symbol) => {
            try {
                const finnhubSymbol = `${symbol}.SA`;
                const url = `${FINNHUB_BASE_URL}/company-news?symbol=${encodeURIComponent(finnhubSymbol)}&from=${range.from}&to=${range.to}&token=${FINNHUB_API_KEY}`;
                const articles = await fetchJSON<RawNewsArticle[]>(url, 300);
                return (articles || [])
                    .filter(validateArticle)
                    .map((article): MarketNewsArticle => ({
                        id: article.id,
                        headline: article.headline!.trim(),
                        summary: article.summary!.trim().substring(0, 200),
                        source: article.source || 'Finnhub',
                        url: article.url!,
                        datetime: article.datetime!,
                        image: article.image || '',
                        category: article.category || 'company',
                        related: symbol,
                    }));
            } catch (error) {
                console.error('Error fetching company news for', symbol, error);
                return [];
            }
        })
    );

    return perSymbolArticles
        .flat()
        .sort((a, b) => b.datetime - a.datetime)
        .slice(0, 6);
}

export const searchStocks = cache(async (query?: string): Promise<StockWithWatchlistStatus[]> => {
    try {
        const params = new URLSearchParams({
            limit: '15',
            sortBy: 'volume',
            sortOrder: 'desc',
        });
        const trimmed = typeof query === 'string' ? query.trim() : '';
        if (trimmed) params.set('search', trimmed);

        const url = `${BRAPI_BASE_URL}/api/v2/tickers?${params.toString()}`;
        const data = await withBrapiRequest(() =>
            fetchJSON<BrapiTickerResponse>(url, 900, brapiHeaders())
        );

        return (data.results || [])
            .filter((stock) => stock.isActive)
            .map((stock) => ({
                symbol: stock.symbol.toUpperCase(),
                name: stock.longName || stock.name,
                exchange: stock.exchange,
                type: stock.subType || stock.assetType || 'Ativo',
                isInWatchlist: false,
                price: stock.quote.lastPrice ?? undefined,
                changePercent: stock.quote.changePercent ?? undefined,
            }))
            .slice(0, 15);
    } catch (error) {
        console.error('Error searching B3 stocks:', error);
        return [];
    }
});
