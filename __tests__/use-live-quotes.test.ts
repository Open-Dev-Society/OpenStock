import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Exercise the polling hook without mounting React: capture its effect and state updates.
const hook = vi.hoisted(() => ({
    quotes: {} as Record<string, { c: number } | null>,
    effect: null as null | (() => void | (() => void)),
}));

vi.mock('react', () => ({
    useState: () => [hook.quotes, (update: (previous: typeof hook.quotes) => typeof hook.quotes) => {
        hook.quotes = typeof update === 'function' ? update(hook.quotes) : update;
    }],
    useEffect: (effect: () => void | (() => void)) => { hook.effect = effect; },
}));
vi.mock('@/lib/market-data', () => ({
    isRealtime: true,
    MAX_QUOTE_SYMBOLS_PER_REQUEST: 25,
}));

import { useLiveQuotes } from '@/hooks/useLiveQuotes';

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
let failSecondBatch: boolean;

beforeEach(() => {
    vi.useFakeTimers();
    hook.quotes = {};
    hook.effect = null;
    requests = [];
    failSecondBatch = false;
    vi.stubGlobal('document', { visibilityState: 'visible', addEventListener: vi.fn(), removeEventListener: vi.fn() });
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        const batch = parseBatch(url);
        requests.push(batch);
        return failSecondBatch && batch[0] === 'S025' ? { ok: false } : response(batch);
    }));
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('live quote polling', () => {
    it.each([1, 25, 26, 50])('updates all %i symbols without exceeding the per-request cap', async (count) => {
        useLiveQuotes(symbols(count));
        const cleanup = hook.effect!();
        await flush();

        expect(requests.map((batch) => batch.length)).toEqual(count <= 25 ? [count] : [25, count - 25]);
        expect(Object.keys(hook.quotes)).toHaveLength(count);
        cleanup?.();
    });

    it('keeps the previous prices when one batch fails', async () => {
        useLiveQuotes(symbols(50));
        const cleanup = hook.effect!();
        await flush();
        expect(Object.keys(hook.quotes)).toHaveLength(50);

        failSecondBatch = true;
        await vi.advanceTimersByTimeAsync(15_000);
        expect(requests.map((batch) => batch.length)).toEqual([25, 25, 25, 25]);
        expect(hook.quotes.S025?.c).toBe(26);
        expect(Object.keys(hook.quotes)).toHaveLength(50);
        cleanup?.();
    });


    it('updates successful batches while another batch is still pending', async () => {
        const stalled = deferred<QuoteResponse>();
        vi.stubGlobal('fetch', vi.fn((url: string) => {
            const batch = parseBatch(url);
            requests.push(batch);
            return batch[0] === 'S025' ? stalled.promise : Promise.resolve(response(batch, 100));
        }));

        useLiveQuotes(symbols(50));
        const cleanup = hook.effect!();
        await flush();
        expect(requests).toHaveLength(2);
        expect(hook.quotes.S000?.c).toBe(100);
        expect(hook.quotes.S025).toBeUndefined();

        stalled.resolve(response(symbols(50).slice(25), 100));
        await flush();
        expect(hook.quotes.S025?.c).toBe(125);
        cleanup?.();
    });

    it('does not let an older poll overwrite a newer price', async () => {
        const oldPoll = deferred<QuoteResponse>();
        const newPoll = deferred<QuoteResponse>();
        let calls = 0;
        vi.stubGlobal('fetch', vi.fn((url: string) => {
            requests.push(parseBatch(url));
            return ++calls === 1 ? oldPoll.promise : newPoll.promise;
        }));

        useLiveQuotes(symbols(25));
        const cleanup = hook.effect!();
        await flush();
        await vi.advanceTimersByTimeAsync(15_000);
        expect(requests).toHaveLength(2);

        newPoll.resolve(response(symbols(25), 200));
        await flush();
        expect(hook.quotes.S000?.c).toBe(200);

        oldPoll.resolve(response(symbols(25), 100));
        await flush();
        expect(hook.quotes.S000?.c).toBe(200);
        cleanup?.();
    });

    it('orders overlapping responses separately for each batch', async () => {
        const pending = Array.from({ length: 4 }, () => deferred<QuoteResponse>());
        let call = 0;
        vi.stubGlobal('fetch', vi.fn((url: string) => {
            requests.push(parseBatch(url));
            return pending[call++].promise;
        }));

        useLiveQuotes(symbols(50));
        const cleanup = hook.effect!();
        await vi.advanceTimersByTimeAsync(15_000);
        expect(requests.map((batch) => batch.length)).toEqual([25, 25, 25, 25]);

        pending[2].resolve(response(symbols(25), 200)); // Newer first batch.
        await flush();
        pending[1].resolve(response(symbols(50).slice(25), 100)); // Older second batch.
        await flush();
        expect(hook.quotes.S000?.c).toBe(200);
        expect(hook.quotes.S025?.c).toBe(125);

        pending[0].resolve(response(symbols(25), 100)); // Stale first batch: ignore.
        pending[3].resolve(response(symbols(50).slice(25), 200)); // New second batch.
        await flush();
        expect(hook.quotes.S000?.c).toBe(200);
        expect(hook.quotes.S025?.c).toBe(225);
        cleanup?.();
    });

    it('preserves a successful older response when a newer poll fails', async () => {
        const oldPoll = deferred<QuoteResponse>();
        let calls = 0;
        vi.stubGlobal('fetch', vi.fn((url: string) => {
            const batch = parseBatch(url);
            requests.push(batch);
            return ++calls === 1 ? oldPoll.promise : Promise.resolve({ ok: false });
        }));

        useLiveQuotes(symbols(25));
        const cleanup = hook.effect!();
        await vi.advanceTimersByTimeAsync(15_000);
        oldPoll.resolve(response(symbols(25), 50));
        await flush();
        expect(hook.quotes.S000?.c).toBe(50);
        cleanup?.();
    });

    it('discards responses after unmount', async () => {
        const pending = deferred<QuoteResponse>();
        vi.stubGlobal('fetch', vi.fn(() => pending.promise));
        useLiveQuotes(symbols(25));
        const cleanup = hook.effect!();
        cleanup?.();
        pending.resolve(response(symbols(25)));
        await flush();
        expect(hook.quotes).toEqual({});
    });

    it('does not poll when the tab is hidden', async () => {
        vi.stubGlobal('document', { visibilityState: 'hidden', addEventListener: vi.fn(), removeEventListener: vi.fn() });
        useLiveQuotes(symbols(50));
        const cleanup = hook.effect!();
        await flush();
        expect(requests).toHaveLength(0);
        cleanup?.();
    });
});
