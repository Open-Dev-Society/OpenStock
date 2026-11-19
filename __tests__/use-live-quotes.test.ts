import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Exercise the polling hook without mounting React: capture its effect and state updates.
const hook = vi.hoisted(() => ({
    quotes: {} as Record<string, { c: number } | null>,
    effect: null as null | (() => void | (() => void)),
}));

vi.mock('react', () => ({
    useState: () => [hook.quotes, (update: typeof hook.quotes | ((previous: typeof hook.quotes) => typeof hook.quotes)) => {
        hook.quotes = typeof update === 'function' ? update(hook.quotes) : update;
    }],
    useEffect: (effect: () => void | (() => void)) => { hook.effect = effect; },
}));
vi.mock('@/lib/market-data', () => ({ isRealtime: true }));
vi.mock('@/lib/better-auth/auth', () => ({ getSession: async () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/lib/rate-limit', () => ({ isRateLimited: async () => false }));
vi.mock('@/lib/actions/finnhub.actions', () => ({
    getLiveQuotes: async (list: string[]) => Object.fromEntries(list.map((symbol) => [symbol, { c: Number(symbol.slice(1)) + 1 }])),
}));

import { useLiveQuotes } from '@/hooks/useLiveQuotes';
import { GET } from '@/app/api/quotes/route';

type QuoteResponse = { ok: boolean; json: () => Promise<Record<string, { c: number }>> };

const symbols = (count: number) => Array.from({ length: count }, (_, i) => `S${String(i).padStart(3, '0')}`);
const parseBatch = (url: string) => new URL(url, 'http://localhost').searchParams.get('symbols')!.split(',');
const response = (batch: string[], offset = 1): QuoteResponse => ({
    ok: true,
    json: async () => Object.fromEntries(batch.map((symbol) => [symbol, { c: Number(symbol.slice(1)) + offset }])),
});
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const deferred = <T,>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((done) => { resolve = done; });
    return { promise, resolve };
};

let requests: string[][];
let failNext: boolean;

beforeEach(() => {
    vi.useFakeTimers();
    hook.quotes = {};
    hook.effect = null;
    requests = [];
    failNext = false;
    vi.stubGlobal('document', { visibilityState: 'visible', addEventListener: vi.fn(), removeEventListener: vi.fn() });
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        const batch = parseBatch(url);
        requests.push(batch);
        return failNext ? { ok: false } : response(batch);
    }));
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('/api/quotes', () => {
    it('returns every symbol of a full 50-stock watchlist in one request', async () => {
        const res = await GET(new NextRequest(`http://localhost/api/quotes?symbols=${symbols(50).join(',')}`));
        expect(Object.keys(await res.json())).toHaveLength(50);
    });

    it('still caps a request at the watchlist maximum', async () => {
        const res = await GET(new NextRequest(`http://localhost/api/quotes?symbols=${symbols(60).join(',')}`));
        expect(Object.keys(await res.json())).toHaveLength(50);
    });
});

describe('live quote polling', () => {
    it.each([1, 25, 26, 50])('updates all %i symbols with one request per poll', async (count) => {
        useLiveQuotes(symbols(count));
        const cleanup = hook.effect!();
        await vi.advanceTimersByTimeAsync(15_000);

        expect(requests.map((batch) => batch.length)).toEqual([count]);
        expect(Object.keys(hook.quotes)).toHaveLength(count);
        cleanup?.();
    });

    it('keeps the previous prices when a poll fails', async () => {
        useLiveQuotes(symbols(50));
        const cleanup = hook.effect!();
        await vi.advanceTimersByTimeAsync(15_000);
        expect(Object.keys(hook.quotes)).toHaveLength(50);

        failNext = true;
        await vi.advanceTimersByTimeAsync(15_000);
        expect(requests).toHaveLength(2);
        expect(hook.quotes.S025?.c).toBe(26);
        expect(Object.keys(hook.quotes)).toHaveLength(50);
        cleanup?.();
    });

    it('discards responses after unmount', async () => {
        const pending = deferred<QuoteResponse>();
        vi.stubGlobal('fetch', vi.fn(() => pending.promise));
        useLiveQuotes(symbols(25));
        const cleanup = hook.effect!();
        await vi.advanceTimersByTimeAsync(15_000);
        cleanup?.();
        pending.resolve(response(symbols(25)));
        await flush();
        expect(hook.quotes).toEqual({});
    });

    it('does not poll when the tab is hidden', async () => {
        vi.stubGlobal('document', { visibilityState: 'hidden', addEventListener: vi.fn(), removeEventListener: vi.fn() });
        useLiveQuotes(symbols(50));
        const cleanup = hook.effect!();
        await vi.advanceTimersByTimeAsync(15_000);
        expect(requests).toHaveLength(0);
        cleanup?.();
    });
});
