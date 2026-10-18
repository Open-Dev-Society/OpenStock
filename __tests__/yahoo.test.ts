import { describe, it, expect } from 'vitest';
import { buildYahooUrl, dailyQuoteFromCandles, isCandleRangeId, isTadawulSymbol, mergeProxyHistory, normalizeYahooSymbol, parseYahooChart, resampleDaily, resampleMonthly, resampleWeekly, riyadhDay, sessionMove, validCandles } from '@/lib/yahoo';
import { TADAWUL_COMPANIES, TADAWUL_COUNT, TADAWUL_MAIN_COMPANIES, TADAWUL_MAIN_COUNT, isNomuSymbol } from '@/lib/tadawul-companies';
import { matchTadawulCompanies, tadawulDisplayName } from '@/lib/tadawul-search';

describe('tadawul directory', () => {
    it('holds the full main-market list', () => {
        expect(TADAWUL_COUNT).toBe(TADAWUL_COMPANIES.length);
        expect(TADAWUL_COUNT).toBeGreaterThan(300);
        expect(TADAWUL_COMPANIES.find((c) => c.symbol === '2222.SR')?.name).toMatch(/Aramco|Arabian Oil/i);
    });

    it('excludes Nomu (9xxx) from the main-market list', () => {
        expect(isNomuSymbol('9517.SR')).toBe(true);
        expect(isNomuSymbol('2222.SR')).toBe(false);
        expect(TADAWUL_MAIN_COUNT).toBe(TADAWUL_MAIN_COMPANIES.length);
        expect(TADAWUL_MAIN_COUNT).toBeLessThan(TADAWUL_COUNT);
        expect(TADAWUL_MAIN_COMPANIES.some((c) => isNomuSymbol(c.symbol))).toBe(false);
    });
});

describe('matchTadawulCompanies', () => {
    it('matches digits against the symbol', () => {
        const hits = matchTadawulCompanies('2222');
        expect(hits[0]).toMatchObject({ symbol: '2222.SR' });
    });

    it('matches text against the company name', () => {
        const hits = matchTadawulCompanies('rajhi');
        expect(hits.some((c) => c.symbol === '1120.SR')).toBe(true);
    });

    it('matches Arabic queries against the Arabic name', () => {
        const hits = matchTadawulCompanies('الراجحي');
        expect(hits.some((c) => c.symbol === '1120.SR')).toBe(true);
        expect(TADAWUL_COMPANIES.find((c) => c.symbol === '2222.SR')?.ar).toBe('أرامكو السعودية');
    });

    it('builds bilingual display names', () => {
        expect(tadawulDisplayName({ symbol: '2222.SR', name: 'Saudi Arabian Oil Co.', ar: 'أرامكو السعودية' })).toBe(
            'Saudi Arabian Oil Co. · أرامكو السعودية',
        );
    });

    it('returns empty for blank queries and caps results', () => {
        expect(matchTadawulCompanies('')).toEqual([]);
        expect(matchTadawulCompanies('2').length).toBeLessThanOrEqual(15);
    });

    it('excludes Nomu symbols from search', () => {
        expect(matchTadawulCompanies('9517').some((c) => c.symbol === '9517.SR')).toBe(false);
    });
});

describe('normalizeYahooSymbol', () => {
    it('accepts .SR symbols', () => {
        expect(normalizeYahooSymbol('2222.SR')).toBe('2222.SR');
        expect(normalizeYahooSymbol('1120.sr')).toBe('1120.SR');
    });

    it('converts TADAWUL: prefix to .SR', () => {
        expect(normalizeYahooSymbol('TADAWUL:2222')).toBe('2222.SR');
    });

    it('maps the TASI index to ^TASI.SR', () => {
        expect(normalizeYahooSymbol('TADAWUL:TASI')).toBe('^TASI.SR');
        expect(normalizeYahooSymbol('TASI')).toBe('^TASI.SR');
    });

    it('accepts bare 4-digit Tadawul codes (watchlist links)', () => {
        expect(normalizeYahooSymbol('2222')).toBe('2222.SR');
        expect(normalizeYahooSymbol(' 1120 ')).toBe('1120.SR');
        expect(normalizeYahooSymbol('9544')).toBe('9544.SR');
    });

    it('rejects non-Saudi symbols', () => {
        expect(normalizeYahooSymbol('AAPL')).toBeNull();
        expect(normalizeYahooSymbol('')).toBeNull();
        expect(normalizeYahooSymbol('222')).toBeNull();
        expect(normalizeYahooSymbol('22222')).toBeNull();
    });

    it('isTadawulSymbol matches', () => {
        expect(isTadawulSymbol('2222.SR')).toBe(true);
        expect(isTadawulSymbol('2222')).toBe(true);
        expect(isTadawulSymbol('AAPL')).toBe(false);
    });
});

describe('buildYahooUrl', () => {
    it('builds intraday and monthly urls', () => {
        expect(buildYahooUrl('2222.SR', '1m')).toContain('interval=1m&range=7d');
        expect(buildYahooUrl('2222.SR', '5m')).toContain('interval=5m&range=1mo');
        expect(buildYahooUrl('2222.SR', '30m')).toContain('interval=30m&range=1mo');
        expect(buildYahooUrl('2222.SR', '1H')).toContain('interval=1h&range=2y');
        expect(buildYahooUrl('2222.SR', 'D')).toContain('interval=1d&range=1y');
        expect(buildYahooUrl('2222.SR', 'W')).toContain('interval=1wk&range=5y');
        expect(buildYahooUrl('2222.SR', 'M')).toContain('interval=1mo&range=max');
    });

    it('builds plain urls for the index (resampling happens upstream)', () => {
        expect(buildYahooUrl('^TASI.SR', 'D')).toContain('interval=1d&range=1y');
        expect(buildYahooUrl('^TASI.SR', 'W')).toContain('interval=1wk&range=5y');
        expect(buildYahooUrl('^TASI.SR', '1m')).toContain('interval=1m&range=7d');
    });
});

describe('parseYahooChart', () => {
    const fixture = {
        chart: {
            result: [
                {
                    timestamp: [1700000000, 1700086400, 1700172800],
                    meta: { currency: 'SAR', shortName: 'Saudi Arabian Oil Co.' },
                    indicators: {
                        quote: [
                            {
                                open: [25.1, 25.3, null],
                                high: [25.4, 25.5, 25.6],
                                low: [25.0, 25.2, 25.1],
                                close: [25.3, 25.4, 25.5],
                                volume: [1000, 2000, 3000],
                            },
                        ],
                    },
                },
            ],
        },
    };

    it('parses candles and skips rows with missing values', () => {
        const parsed = parseYahooChart(fixture);
        expect(parsed?.candles).toHaveLength(2);
        expect(parsed?.candles[0]).toMatchObject({ open: 25.1, high: 25.4, low: 25.0, close: 25.3, volume: 1000 });
        expect(parsed?.currency).toBe('SAR');
    });

    it('returns null for empty or malformed payloads', () => {
        expect(parseYahooChart({})).toBeNull();
        expect(parseYahooChart({ chart: { result: [] } })).toBeNull();
    });

    it('keeps unix timestamps for intraday', () => {
        const parsed = parseYahooChart(fixture, true);
        expect(parsed?.candles).toHaveLength(2);
        expect(typeof parsed?.candles[0].time).toBe('number');
    });
});

describe('dailyQuoteFromCandles', () => {    const candles = [
        { time: '2026-09-28', open: 25.0, high: 25.4, low: 24.9, close: 25.3, volume: 1000 },
        { time: '2026-09-29', open: 25.3, high: 25.6, low: 25.2, close: 25.5, volume: 2000 },
    ];

    it('derives price and day change from the last two closes', () => {
        const q = dailyQuoteFromCandles(candles, 'SAR', 'Aramco');
        expect(q?.price).toBe(25.5);
        expect(q?.change).toBeCloseTo(0.2);
        expect(q?.changePercent).toBeCloseTo(0.79, 1);
        expect(q?.currency).toBe('SAR');
        expect(q?.volume).toBe(2000);
    });

    it('returns null without closes', () => {
        expect(dailyQuoteFromCandles([], 'SAR')).toBeNull();
    });
});

describe('sessionMove', () => {    it('compares last to first valid close', () => {
        expect(sessionMove([25.0, 25.5, 25.25])).toMatchObject({ price: 25.25 });
        expect(sessionMove([25.0, 25.5, 25.25])?.changePercent).toBeCloseTo(1, 2);
    });

    it('returns null when empty', () => {
        expect(sessionMove([])).toBeNull();
        expect(sessionMove([NaN, NaN])).toBeNull();
    });
});

describe('riyadhDay', () => {
    it('maps unix time to the Riyadh calendar date', () => {
        // 2026-10-01 12:00 UTC = 15:00 Riyadh, same date
        expect(riyadhDay(1790856000)).toBe('2026-10-01');
        // 2026-10-01 22:00 UTC = 01:00 next day Riyadh
        expect(riyadhDay(1790892000)).toBe('2026-10-02');
    });
});

describe('resample', () => {
    // Two Riyadh sessions of hourly bars: Oct 1 (10:00-11:00) and Oct 2
    const H = 3600;
    const day1 = Date.UTC(2026, 9, 1, 7, 0, 0) / 1000; // 10:00 Riyadh Oct 1
    const day2 = Date.UTC(2026, 9, 4, 7, 0, 0) / 1000; // 10:00 Riyadh Oct 4 (Sunday)
    const bars = [
        { time: day1, open: 100, high: 102, low: 99, close: 101, volume: 10 },
        { time: day1 + H, open: 101, high: 105, low: 100, close: 104, volume: 20 },
        { time: day2, open: 104, high: 106, low: 103, close: 105, volume: 30 },
        { time: day2 + H, open: 105, high: 107, low: 104, close: 106, volume: 40 },
    ];

    it('resamples days with OHLCV rollups', () => {
        const daily = resampleDaily(bars);
        expect(daily).toHaveLength(2);
        expect(daily[0]).toMatchObject({ time: '2026-10-01', open: 100, high: 105, low: 99, close: 104, volume: 30 });
        expect(daily[1].time).toBe('2026-10-04');
    });

    it('groups weeks from Sunday', () => {
        // Oct 1 2026 is Thursday, Oct 4 Sunday -> two different Saudi weeks
        const weekly = resampleWeekly(bars);
        expect(weekly).toHaveLength(2);
        expect(weekly[1].time).toBe('2026-10-04');
    });

    it('groups months (first of month)', () => {
        expect(resampleMonthly(bars)).toHaveLength(1);
        expect(resampleMonthly(bars)[0].time).toBe('2026-10-01');
    });

    it('ignores non-intraday rows', () => {
        expect(resampleDaily([{ time: '2026-10-01', open: 1, high: 1, low: 1, close: 1, volume: 1 }])).toEqual([]);
    });
});

describe('validCandles', () => {
    it('drops monthly-style and invalid times', () => {
        const rows = [
            { time: '2026-10', open: 1, high: 1, low: 1, close: 1, volume: 1 },
            { time: '2026-10-01', open: 1, high: 1, low: 1, close: 1, volume: 1 },
            { time: 1790838000, open: 1, high: 1, low: 1, close: 1, volume: 1 },
            { time: NaN, open: 1, high: 1, low: 1, close: 1, volume: 1 },
        ];
        expect(validCandles(rows)).toHaveLength(2);
    });
});

describe('isCandleRangeId', () => {
    it('accepts known ids only', () => {
        expect(isCandleRangeId('M')).toBe(true);
        expect(isCandleRangeId('1m')).toBe(true);
        expect(isCandleRangeId('XX')).toBe(false);
        expect(isCandleRangeId(undefined)).toBe(false);
    });
});

describe('mergeProxyHistory', () => {
    const day = (d: string, o: number, h: number, l: number, c: number) => ({ time: d, open: o, high: h, low: l, close: c, volume: 100 });
    // 30 overlapping days at ratio exactly 100, then 10 older proxy-only days
    const real = Array.from({ length: 30 }, (_, i) => day(`2025-01-${String(i + 1).padStart(2, '0')}`, 1000 + i, 1010 + i, 990 + i, 1005 + i));
    const proxyOld = Array.from({ length: 10 }, (_, i) => day(`2024-12-${String(i + 1).padStart(2, '0')}`, 9 + i * 0.1, 9.2 + i * 0.1, 8.8 + i * 0.1, 9.05 + i * 0.1));
    const proxyOverlap = real.map((c) => day(c.time as string, c.open / 100, c.high / 100, c.low / 100, c.close / 100));

    it('prepends scaled older bars and flags the seam', async () => {
        const merged = mergeProxyHistory(real, [...proxyOld, ...proxyOverlap]);
        expect(merged.length).toBe(40);
        expect(merged[0].time).toBe('2024-12-01');
        expect((merged[0] as { estimated?: true }).estimated).toBe(true);
        expect((merged[10] as { estimated?: true }).estimated).toBeUndefined();
        expect(merged[10].close).toBe(real[0].close);
        expect(merged.estimatedFrom).toBe('2024-12-01');
        // scaled by the overlap ratio (~100)
        expect(merged[0].close).toBeCloseTo(905, 0);
    });

    it('returns real untouched when overlap is too thin to calibrate', async () => {
        const thin = mergeProxyHistory(real.slice(0, 5), [...proxyOld, ...proxyOverlap.slice(0, 5)]);
        expect(thin.length).toBe(5);
        expect((thin as { estimatedFrom?: string }).estimatedFrom).toBeUndefined();
    });

    it('returns real untouched when the proxy adds nothing older', async () => {
        const same = mergeProxyHistory(real, proxyOverlap);
        expect(same.length).toBe(real.length);
        expect((same as { estimatedFrom?: string }).estimatedFrom).toBeUndefined();
    });
});
