import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Exercise the polling hook without mounting React: capture its effect and state updates.
const hook = vi.hoisted(() => ({
    quotes: {} as Record<string, { c: number } | null>,
    effect: null as null | (() => void | (() => void)),
}));

vi.mock('react', () => ({
    useState: () => [hook.quotes, (update: any) => {
        hook.quotes = typeof update === 'function' ? update(hook.quotes) : update;
    }],
    useEffect: (effect: () => void | (() => void)) => { hook.effect = effect; },
}));
vi.mock('@/lib/market-data', async (importOriginal) => ({
    ...await importOriginal<typeof import('@/lib/market-data')>(),
    isRealtime: true,
}));

import { useLiveQuotes } from '@/hooks/useLiveQuotes';

const symbols = (count: number) => Array.from({ length: count }, (_, i) => `S${String(i).padStart(3, '0')}`);
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };

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
        const batch = new URL(url, 'http://localhost').searchParams.get('symbols')!.split(',');
        requests.push(batch);
        if (failSecondBatch && batch[0] === 'S025') return { ok: false };
        return { ok: true, json: async () => Object.fromEntries(batch.map((s) => [s, { c: Number(s.slice(1)) + 1 }])) };
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

        expect(requests.map((batch) => batch.length)).toEqual(
            count <= 25 ? [count] : [25, count - 25],
        );
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

    it('does not poll when the tab is hidden', async () => {
        vi.stubGlobal('document', { visibilityState: 'hidden', addEventListener: vi.fn(), removeEventListener: vi.fn() });
        useLiveQuotes(symbols(50));
        const cleanup = hook.effect!();
        await flush();
        expect(requests).toHaveLength(0);
        cleanup?.();
    });
});
