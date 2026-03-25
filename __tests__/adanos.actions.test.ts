import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    getStockSentimentInsights,
} from '@/lib/actions/adanos.actions';
import {
    buildStockSentimentInsights,
    getSourceAlignment,
    normalizeSourceInsight,
} from '@/lib/actions/adanos.helpers';

afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.ADANOS_API_KEY;
    delete process.env.ADANOS_API_BASE_URL;
});

describe('normalizeSourceInsight', () => {
    it('maps source-specific metrics for mentions and trades', () => {
        const reddit = normalizeSourceInsight('reddit', {
            ticker: 'TSLA',
            buzz_score: 81.2,
            bullish_pct: 46,
            trend: 'rising',
            mentions: 647,
        });

        const polymarket = normalizeSourceInsight('polymarket', {
            ticker: 'TSLA',
            buzz_score: 55.7,
            bullish_pct: 72,
            trend: 'stable',
            trade_count: 3731,
        });

        expect(reddit).toMatchObject({
            label: 'Reddit',
            companyName: null,
            metricLabel: 'Mentions',
            metricValue: 647,
            buzzScore: 81.2,
            bullishPct: 46,
        });
        expect(polymarket).toMatchObject({
            label: 'Polymarket',
            companyName: null,
            metricLabel: 'Trades',
            metricValue: 3731,
            buzzScore: 55.7,
            bullishPct: 72,
        });
    });

    it('returns null when required values are missing', () => {
        expect(
            normalizeSourceInsight('x', {
                ticker: 'NVDA',
                bullish_pct: 54,
                mentions: 1200,
            }),
        ).toBeNull();

        expect(
            normalizeSourceInsight('news', {
                ticker: 'NVDA',
                buzz_score: 60,
                bullish_pct: 54,
            }),
        ).toBeNull();
    });
});

describe('getSourceAlignment', () => {
    it('classifies wide divergence when sources materially disagree', () => {
        expect(getSourceAlignment([31, 56, 48, 30])).toBe('Wide divergence');
    });

    it('classifies bullish alignment when sources are tightly aligned and positive', () => {
        expect(getSourceAlignment([61, 64, 67])).toBe('Bullish alignment');
    });
});

describe('buildStockSentimentInsights', () => {
    it('builds a compact aggregate summary from available sources', () => {
        const insight = buildStockSentimentInsights('TSLA', [
            {
                source: 'reddit',
                label: 'Reddit',
                companyName: 'Tesla, Inc.',
                buzzScore: 74.1,
                bullishPct: 31,
                trend: 'rising',
                metricLabel: 'Mentions',
                metricValue: 647,
            },
            {
                source: 'x',
                label: 'X.com',
                companyName: 'Tesla, Inc.',
                buzzScore: 86.1,
                bullishPct: 56,
                trend: 'falling',
                metricLabel: 'Mentions',
                metricValue: 2650,
            },
            {
                source: 'polymarket',
                label: 'Polymarket',
                companyName: 'Tesla, Inc.',
                buzzScore: 83.3,
                bullishPct: 30,
                trend: 'falling',
                metricLabel: 'Trades',
                metricValue: 3731,
            },
            null,
        ]);

        expect(insight).toMatchObject({
            symbol: 'TSLA',
            companyName: 'Tesla, Inc.',
            averageBuzz: 81.2,
            bullishAverage: 39,
            sourceAlignment: 'Wide divergence',
            availableSources: 3,
        });
        expect(insight?.sources).toHaveLength(3);
    });

    it('returns null when no sources have usable data', () => {
        expect(buildStockSentimentInsights('MSFT', [null, null])).toBeNull();
    });
});

describe('getStockSentimentInsights', () => {
    it('returns a parsed result when compare data matches the requested ticker', async () => {
        process.env.ADANOS_API_KEY = 'test-key';
        vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
            const url = String(input);

            if (url.includes('/reddit/')) {
                return new Response(
                    JSON.stringify({
                        stocks: [{ ticker: 'TSLA', company_name: 'Tesla, Inc.', buzz_score: 80, bullish_pct: 40, trend: 'rising', mentions: 10 }],
                    }),
                    { status: 200 },
                );
            }

            if (url.includes('/x/')) {
                return new Response(
                    JSON.stringify({
                        stocks: [{ ticker: 'TSLA', company_name: 'Tesla, Inc.', buzz_score: 90, bullish_pct: 60, trend: 'falling', mentions: 20 }],
                    }),
                    { status: 200 },
                );
            }

            return new Response(JSON.stringify({ stocks: [] }), { status: 404 });
        });

        const insight = await getStockSentimentInsights('TSLA');

        expect(insight).toMatchObject({
            symbol: 'TSLA',
            companyName: 'Tesla, Inc.',
            averageBuzz: 85,
            bullishAverage: 50,
            availableSources: 2,
        });
        expect(insight?.sources).toHaveLength(2);
    });

    it('returns null when the remote source returns 404 for all sources', async () => {
        process.env.ADANOS_API_KEY = 'test-key';
        vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));

        await expect(getStockSentimentInsights('TSLA')).resolves.toBeNull();
    });

    it('returns null when the remote payload contains a different ticker only', async () => {
        process.env.ADANOS_API_KEY = 'test-key';
        vi.spyOn(global, 'fetch').mockResolvedValue(
            new Response(
                JSON.stringify({
                    stocks: [{ ticker: 'MSFT', company_name: 'Microsoft Corporation', buzz_score: 70, bullish_pct: 55, trend: 'stable', mentions: 30 }],
                }),
                { status: 200 },
            ),
        );

        await expect(getStockSentimentInsights('TSLA')).resolves.toBeNull();
    });

    it('returns null when the response body is invalid json', async () => {
        process.env.ADANOS_API_KEY = 'test-key';
        vi.spyOn(global, 'fetch').mockResolvedValue({
            status: 200,
            ok: true,
            json: vi.fn().mockRejectedValue(new Error('invalid json')),
        } as unknown as Response);

        await expect(getStockSentimentInsights('TSLA')).resolves.toBeNull();
    });

    it('returns null when fetch fails', async () => {
        process.env.ADANOS_API_KEY = 'test-key';
        vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network failed'));

        await expect(getStockSentimentInsights('TSLA')).resolves.toBeNull();
    });
});
