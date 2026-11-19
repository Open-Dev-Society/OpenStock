'use server';

import {
    ALPHAI_MAX_ITEMS,
    ALPHAI_MIN_RELEVANCE,
    isAlphaiSymbol,
    normalizeAlphaiNews,
    type AlphaiTickerNews,
} from './alphai.helpers';

const ALPHAI_NEWS_URL = 'https://api.alphai.io/api/news/';
const FETCH_TIMEOUT_MS = 5000;
// The free AlphAI key allows 100 requests a day. Successful answers go to the Next data cache, which Vercel
// shares across instances, so each symbol is asked about once an hour in total.
const NEWS_TTL_SECONDS = 3600;
// The data cache keeps only 200s, so a failed or rate-limited symbol waits ten minutes here before the next try.
const FAILURE_TTL_MS = 10 * 60_000;
const MAX_FAILURE_ENTRIES = 500;

const failedUntil = new Map<string, number>();

function getAlphaiApiKey(): string {
    return process.env.ALPHAI_API_KEY?.trim() ?? '';
}

function markFailed(symbol: string) {
    failedUntil.delete(symbol);
    if (failedUntil.size >= MAX_FAILURE_ENTRIES) failedUntil.delete(failedUntil.keys().next().value!);
    failedUntil.set(symbol, Date.now() + FAILURE_TTL_MS);
}

export async function getAlphaiTickerNews(symbol: string): Promise<AlphaiTickerNews | null> {
    const apiKey = getAlphaiApiKey();
    const normalizedSymbol = symbol?.trim().toUpperCase() ?? '';
    if (!apiKey || !isAlphaiSymbol(normalizedSymbol)) {
        return null;
    }
    if ((failedUntil.get(normalizedSymbol) ?? 0) > Date.now()) {
        return null;
    }

    const url = new URL(ALPHAI_NEWS_URL);
    url.searchParams.set('symbol', normalizedSymbol);
    url.searchParams.set('page_size', String(ALPHAI_MAX_ITEMS));
    url.searchParams.set('min_relevance', String(ALPHAI_MIN_RELEVANCE));
    // One row per story, so five reprints of the same event don't fill the card
    url.searchParams.set('collapse', 'story');

    try {
        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: 'application/json',
            },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            next: { revalidate: NEWS_TTL_SECONDS },
        });

        if (!response.ok) {
            console.error(`AlphAI news request failed for ${normalizedSymbol}: ${response.status}`);
            markFailed(normalizedSymbol);
            return null;
        }

        return normalizeAlphaiNews(normalizedSymbol, await response.json());
    } catch (error) {
        console.error(`AlphAI news request failed for ${normalizedSymbol}`, error);
        markFailed(normalizedSymbol);
        return null;
    }
}
