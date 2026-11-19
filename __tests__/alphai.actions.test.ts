import { afterEach, describe, expect, it, vi } from 'vitest';

import { getAlphaiTickerNews } from '@/lib/actions/alphai.actions';
import { alphaiStockUrl, isAlphaiSymbol, normalizeAlphaiNews } from '@/lib/actions/alphai.helpers';

afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.ALPHAI_API_KEY;
});

type Analysis = { ticker: string; sentiment?: string; summary?: string };

function article(uid: string, overrides: {
    title?: string;
    url?: string;
    relevance?: unknown;
    analyses?: Analysis[];
    sourcesCount?: number | null;
} = {}) {
    return {
        original: {
            uid,
            title: overrides.title ?? `Headline ${uid}`,
            url: overrides.url ?? `https://publisher.example/${uid}`,
            source: 'publisher.example',
            source_domain: 'publisher.example',
            time_published: '2026-11-19T05:05:14Z',
        },
        enrichment: {
            relevance_score: overrides.relevance ?? 6,
            category: 'technology',
            ai_trading_insights: {
                ticker_analysis: (overrides.analyses ?? []).map(({ ticker, sentiment, summary }) => ({
                    ticker,
                    impact_analysis: { sentiment, summary },
                })),
            },
        },
        sources_count: overrides.sourcesCount ?? null,
    };
}

const page = (...results: unknown[]) => ({ results, next_cursor: null });

describe('isAlphaiSymbol', () => {
    it('accepts the ticker forms AlphAI uses and skips exchange-prefixed symbols', () => {
        for (const symbol of ['AAPL', 'BRK.B', 'VOD.L', 'BTC-USD', '0700.HK']) expect(isAlphaiSymbol(symbol)).toBe(true);
        for (const symbol of ['', 'BINANCE:BTCUSDT', 'aapl', 'A B', '.L']) expect(isAlphaiSymbol(symbol)).toBe(false);
    });
});

describe('alphaiStockUrl', () => {
    it('links to the symbol page with the partner tags', () => {
        expect(alphaiStockUrl('brk.b')).toBe('https://alphai.io/stock/BRK.B?utm_source=openstock&utm_medium=partner');
    });
});

describe('normalizeAlphaiNews', () => {
    it('maps an article and takes the analysis written for the page symbol', () => {
        const news = normalizeAlphaiNews('aapl', page(article('a1', {
            relevance: 8,
            sourcesCount: 3,
            analyses: [
                { ticker: 'MSFT', sentiment: 'positive', summary: 'Good for Microsoft.' },
                { ticker: 'AAPL', sentiment: 'negative', summary: 'Margin pressure for Apple.' },
            ],
        })));

        expect(news).toEqual({
            symbol: 'AAPL',
            items: [{
                id: 'a1',
                title: 'Headline a1',
                url: 'https://publisher.example/a1',
                source: 'publisher.example',
                publishedAt: '2026-11-19T05:05:14Z',
                relevance: 8,
                sentiment: 'negative',
                impact: 'Margin pressure for Apple.',
                outlets: 3,
            }],
        });
    });

    it("never shows another ticker's analysis on this symbol's page", () => {
        const news = normalizeAlphaiNews('AAPL', page(article('a2', {
            analyses: [{ ticker: 'MSFT', sentiment: 'positive', summary: 'Good for Microsoft.' }],
        })));

        expect(news?.items[0]).toMatchObject({ sentiment: null, impact: null, outlets: 1 });
    });

    it('drops rows without a usable title, link or score', () => {
        const news = normalizeAlphaiNews('AAPL', page(
            article('bad-score', { relevance: 11 }),
            article('low-score', { relevance: 4 }),
            article('string-score', { relevance: '7' }),
            article('no-title', { title: '  ' }),
            article('script-link', { url: 'javascript:alert(1)' }),
            article('relative-link', { url: '/news/1' }),
            { original: null, enrichment: {} },
            'garbage',
            article('kept'),
        ));

        expect(news?.items.map((item) => item.id)).toEqual(['kept']);
    });

    it('drops duplicates and keeps at most five items', () => {
        const rows = ['a', 'a', 'b', 'c', 'd', 'e', 'f'].map((uid) => article(uid));
        expect(normalizeAlphaiNews('AAPL', page(...rows))?.items.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('returns null for an empty page or an unexpected payload', () => {
        expect(normalizeAlphaiNews('AAPL', page())).toBeNull();
        expect(normalizeAlphaiNews('AAPL', { detail: 'Not found' })).toBeNull();
        expect(normalizeAlphaiNews('AAPL', null)).toBeNull();
    });
});

describe('getAlphaiTickerNews', () => {
    it('makes no request without a key', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch');
        await expect(getAlphaiTickerNews('NOKEY')).resolves.toBeNull();
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('makes no request for a symbol AlphAI cannot have', async () => {
        process.env.ALPHAI_API_KEY = 'test-key';
        const fetchSpy = vi.spyOn(global, 'fetch');
        await expect(getAlphaiTickerNews('BINANCE:BTCUSDT')).resolves.toBeNull();
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('asks with the key in a header and caches the answer in the shared data cache for an hour', async () => {
        process.env.ALPHAI_API_KEY = 'test-key';
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
            new Response(JSON.stringify(page(article('n1', { analyses: [{ ticker: 'NVDA', sentiment: 'positive', summary: 'Demand holds.' }] }))), { status: 200 }),
        );

        const news = await getAlphaiTickerNews('nvda');

        expect(news?.items[0]).toMatchObject({ id: 'n1', sentiment: 'positive', impact: 'Demand holds.' });
        expect(fetchSpy).toHaveBeenCalledTimes(1);

        const [input, init] = fetchSpy.mock.calls[0];
        const url = new URL(String(input));
        expect(url.origin + url.pathname).toBe('https://api.alphai.io/api/news/');
        expect(Object.fromEntries(url.searchParams)).toEqual({ symbol: 'NVDA', page_size: '5', min_relevance: '5', collapse: 'story' });
        expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
        expect((init as RequestInit & { next?: { revalidate?: number } }).next).toEqual({ revalidate: 3600 });
        expect(init?.signal).toBeInstanceOf(AbortSignal);
    });

    it('waits ten minutes after a failure before asking about that symbol again', async () => {
        process.env.ALPHAI_API_KEY = 'test-key';
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 503 }));
        const now = Date.now();
        const clock = vi.spyOn(Date, 'now').mockReturnValue(now);

        await expect(getAlphaiTickerNews('META')).resolves.toBeNull();
        await expect(getAlphaiTickerNews('META')).resolves.toBeNull();
        expect(fetchSpy).toHaveBeenCalledTimes(1);

        clock.mockReturnValue(now + 10 * 60_000 + 1);
        await getAlphaiTickerNews('META');
        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('returns null when the key is rate limited', async () => {
        process.env.ALPHAI_API_KEY = 'test-key';
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ detail: 'Rate limit exceeded' }), { status: 429 }));
        await expect(getAlphaiTickerNews('TSLA')).resolves.toBeNull();
    });

    it('returns null when the body is not JSON', async () => {
        process.env.ALPHAI_API_KEY = 'test-key';
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(global, 'fetch').mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 200 }));
        await expect(getAlphaiTickerNews('AMD')).resolves.toBeNull();
    });

    it('returns null when the request fails', async () => {
        process.env.ALPHAI_API_KEY = 'test-key';
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(global, 'fetch').mockRejectedValue(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
        await expect(getAlphaiTickerNews('INTC')).resolves.toBeNull();
    });
});
