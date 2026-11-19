'use server';

import {
    ALPHAI_MAX_ITEMS,
    isAlphaiSymbol,
    normalizeAlphaiNews,
    type AlphaiTickerNews,
} from './alphai.helpers';

const ALPHAI_NEWS_URL = 'https://api.alphai.io/api/news/';
const FETCH_TIMEOUT_MS = 5000;
// The free AlphAI key allows 100 requests a day, so each symbol is asked at most once an hour per instance,
// and a failed or rate-limited request waits ten minutes before the next try.
const NEWS_TTL_SECONDS = 3600;
const FAILURE_TTL_MS = 10 * 60_000;
const MAX_CACHE_ENTRIES = 500;
// 5 and up: real company news and sector datapoints; recaps of already-known events stay out
const MIN_RELEVANCE = 5;

const responseCache = new Map<string, { value: AlphaiTickerNews | null; freshUntil: number }>();
const inFlight = new Map<string, Promise<AlphaiTickerNews | null>>();

function getAlphaiApiKey(): string {
    return process.env.ALPHAI_API_KEY?.trim() ?? '';
}

async function fetchTickerNews(symbol: string, apiKey: string): Promise<{ value: AlphaiTickerNews | null; ttlMs: number }> {
    const url = new URL(ALPHAI_NEWS_URL);
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('page_size', String(ALPHAI_MAX_ITEMS));
    url.searchParams.set('min_relevance', String(MIN_RELEVANCE));
    // One row per story, so five reprints of the same event don't fill the card
    url.searchParams.set('collapse', 'story');

    try {
        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: 'application/json',
            },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            // The in-memory cache below owns both TTLs; the Next data cache would serve a stale or
            // bad body past them, so it stays out.
            cache: 'no-store',
        });

        if (!response.ok) {
            console.error(`AlphAI news request failed for ${symbol}: ${response.status}`);
            return { value: null, ttlMs: FAILURE_TTL_MS };
        }

        return { value: normalizeAlphaiNews(symbol, await response.json()), ttlMs: NEWS_TTL_SECONDS * 1000 };
    } catch (error) {
        console.error(`AlphAI news request failed for ${symbol}`, error);
        return { value: null, ttlMs: FAILURE_TTL_MS };
    }
}

export async function getAlphaiTickerNews(symbol: string): Promise<AlphaiTickerNews | null> {
    const apiKey = getAlphaiApiKey();
    const normalizedSymbol = symbol?.trim().toUpperCase() ?? '';
    if (!apiKey || !isAlphaiSymbol(normalizedSymbol)) {
        return null;
    }

    const hit = responseCache.get(normalizedSymbol);
    if (hit && hit.freshUntil > Date.now()) {
        return hit.value;
    }

    let pending = inFlight.get(normalizedSymbol);
    if (!pending) {
        pending = fetchTickerNews(normalizedSymbol, apiKey)
            .then(({ value, ttlMs }) => {
                responseCache.delete(normalizedSymbol);
                if (responseCache.size >= MAX_CACHE_ENTRIES) responseCache.delete(responseCache.keys().next().value!);
                responseCache.set(normalizedSymbol, { value, freshUntil: Date.now() + ttlMs });
                return value;
            })
            .finally(() => inFlight.delete(normalizedSymbol));
        inFlight.set(normalizedSymbol, pending);
    }
    return pending;
}
