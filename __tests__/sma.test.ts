import { describe, expect, it } from 'vitest';
import { closesFromChart, hasCrossed, isSmaPeriod, sideOf, sma, yahooChartSymbol } from '@/lib/sma';

describe('sma', () => {
    it('averages the last N closes', () => {
        expect(sma([1, 2, 3, 4, 5], 5)).toBe(3);
        expect(sma([100, 1, 2, 3, 4, 5], 5)).toBe(3); // older closes don't count
        expect(sma([10, 20], 1)).toBe(20);
    });

    it('is null until there are N closes, or for a bad period', () => {
        expect(sma([1, 2, 3], 4)).toBeNull();
        expect(sma([1, 2, 3], 0)).toBeNull();
        expect(sma([1, 2, 3], 2.5)).toBeNull();
    });

    it('matches a direct mean over a 200-day window', () => {
        const closes = Array.from({ length: 250 }, (_, i) => 100 + Math.sin(i) * 10);
        const expected = closes.slice(-200).reduce((a, b) => a + b, 0) / 200;
        expect(sma(closes, 200)).toBeCloseTo(expected, 10);
    });

    it('only offers the listed periods', () => {
        for (const period of [20, 50, 100, 200]) expect(isSmaPeriod(period)).toBe(true);
        for (const period of [0, 10, 21, '50', null]) expect(isSmaPeriod(period)).toBe(false);
    });
});

describe('crossing check', () => {
    it('knows which side of the average the price is on', () => {
        expect(sideOf(101, 100)).toBe('ABOVE');
        expect(sideOf(99, 100)).toBe('BELOW');
        expect(sideOf(100, 100)).toBeNull();
    });

    it('fires "above" only when the price comes up from below', () => {
        expect(hasCrossed('ABOVE', 'BELOW', 101, 100)).toBe(true);
        expect(hasCrossed('ABOVE', 'ABOVE', 101, 100)).toBe(false); // already above: wait for a cross
        expect(hasCrossed('ABOVE', 'BELOW', 99, 100)).toBe(false); // still below
        expect(hasCrossed('ABOVE', 'BELOW', 100, 100)).toBe(false); // touching is not crossing
    });

    it('fires "below" only when the price comes down from above', () => {
        expect(hasCrossed('BELOW', 'ABOVE', 99, 100)).toBe(true);
        expect(hasCrossed('BELOW', 'BELOW', 99, 100)).toBe(false);
        expect(hasCrossed('BELOW', 'ABOVE', 101, 100)).toBe(false);
    });

    it('needs a previous side before it can call anything a cross', () => {
        expect(hasCrossed('ABOVE', undefined, 150, 100)).toBe(false);
        expect(hasCrossed('BELOW', null, 50, 100)).toBe(false);
    });
});

describe('daily closes from Yahoo', () => {
    it('maps alert symbols to Yahoo chart symbols', () => {
        expect(yahooChartSymbol('AAPL')).toBe('AAPL');
        expect(yahooChartSymbol('brk.b')).toBe('BRK-B');
        expect(yahooChartSymbol('BINANCE:BTCUSDT')).toBe('BTC-USD');
        expect(yahooChartSymbol('BINANCE:ETHBTC')).toBeNull();
        expect(yahooChartSymbol('2222.SR')).toBeNull();
        expect(yahooChartSymbol('')).toBeNull();
    });

    it('reads closes oldest first, skipping gaps, with Yahoo’s latest price', () => {
        const json = { chart: { result: [{ meta: { regularMarketPrice: 12 }, indicators: { quote: [{ close: [10, null, 11, 0, 12.5] }] } }] } };
        expect(closesFromChart(json)).toEqual({ closes: [10, 11, 12.5], price: 12 });
    });

    it('falls back to the last close for the price, and to null for an empty chart', () => {
        expect(closesFromChart({ chart: { result: [{ indicators: { quote: [{ close: [5, 6] }] } }] } })).toEqual({ closes: [5, 6], price: 6 });
        expect(closesFromChart({ chart: { result: [] } })).toBeNull();
        expect(closesFromChart(null)).toBeNull();
    });
});
