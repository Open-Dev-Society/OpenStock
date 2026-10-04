'use server';

import {
    TWELVE_EXCHANGE,
    TWELVE_RANGE_MAP,
    isPlanLocked,
    parseTwelveQuote,
    parseTwelveSeries,
    twelveSymbol,
} from '@/lib/twelvedata';
import type { CandleRangeId } from '@/lib/yahoo';

const BASE = 'https://api.twelvedata.com';
const key = () => process.env.TWELVEDATA_API_KEY || '';

// Symbols the key can't price (free plan vs Pro-only Tadawul) stay locked for an hour.
const lockedUntil = new Map<string, number>();
const LOCK_TTL_MS = 60 * 60 * 1000;

async function fetchTwelve(path: string, revalidateSeconds: number) {
    const k = key();
    if (!k) return null;
    try {
        const res = await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}apikey=${k}`, {
            next: { revalidate: revalidateSeconds },
        });
        const json = await res.json().catch(() => null);
        return json;
    } catch (e) {
        console.error('Twelve Data error', path.split('?')[0], e);
        return null;
    }
}

const isLocked = (symbol: string) => (lockedUntil.get(symbol) ?? 0) > Date.now();
const lock = (symbol: string) => lockedUntil.set(symbol, Date.now() + LOCK_TTL_MS);

// Live quote for one Tadawul symbol, or null (no key / plan-locked / error).
// Shared 15s cache; everyone looking at the symbol shares one quota spend.
export async function getTwelveQuote(symbol: string) {
    const twelve = twelveSymbol(symbol);
    if (!twelve || isLocked(twelve)) return null;
    const json = await fetchTwelve(
        `/quote?symbol=${twelve}&exchange=${TWELVE_EXCHANGE}&interval=1min`,
        15,
    );
    if (!json) return null;
    if (isPlanLocked(json)) {
        lock(twelve);
        return null;
    }
    const quote = parseTwelveQuote(json);
    return quote ? { ...quote, live: true as const } : null;
}

// Live candles for intraday timeframes, or null. Falls back to Yahoo upstream.
export async function getTwelveIntraday(symbol: string, rangeId: CandleRangeId = '1m') {
    const twelve = twelveSymbol(symbol);
    const mapping = TWELVE_RANGE_MAP[rangeId];
    if (!twelve || !mapping || isLocked(twelve)) return null;
    const json = await fetchTwelve(
        `/time_series?symbol=${twelve}&exchange=${TWELVE_EXCHANGE}&interval=${mapping.interval}&outputsize=${mapping.outputsize}&timezone=Asia/Riyadh`,
        15,
    );
    if (!json) return null;
    if (isPlanLocked(json)) {
        lock(twelve);
        return null;
    }
    const parsed = parseTwelveSeries(json);
    return parsed ? { ...parsed, live: true as const } : null;
}
