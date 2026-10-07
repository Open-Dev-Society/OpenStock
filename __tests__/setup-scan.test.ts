import { describe, it, expect } from 'vitest';
import { parseBand, rsiBurst, rsiMomentum, scoreSetup } from '@/lib/setup-scan';

describe('parseBand', () => {
    it('accepts valid bands', () => {
        expect(parseBand('25', '70')).toEqual([25, 70]);
        expect(parseBand(0, 100)).toEqual([0, 100]);
    });

    it('rejects missing, non-numeric or inverted bands', () => {
        expect(parseBand(undefined, '70')).toBeNull();
        expect(parseBand('', '70')).toBeNull();
        expect(parseBand('abc', '70')).toBeNull();
        expect(parseBand('70', '25')).toBeNull();
        expect(parseBand('-5', '70')).toBeNull();
        expect(parseBand('25', '101')).toBeNull();
    });
});

const flat = (n: number, v = 10) => new Array(n).fill(v);

describe('scoreSetup', () => {
    it('returns null when history is too short', () => {
        expect(scoreSetup([1, 2, 3], [1, 2, 3], [1, 2, 3], [1, 2, 3])).toBeNull();
    });

    it('flags washed-out selloffs as oversold', () => {
        const closes = [...Array.from({ length: 70 }, (_, i) => 30 - i * 0.1), ...flat(10, 22)];
        const n = closes.length;
        const s = scoreSetup(closes, closes.map((v) => v + 0.3), closes.map((v) => v - 0.3), flat(n, 1000));
        expect(s?.signals).toContain('oversold');
        expect(s?.rsi).toBeLessThan(30);
    });

    it('flags aligned uptrends', () => {
        const closes = Array.from({ length: 80 }, (_, i) => 10 + i * 0.3);
        const s = scoreSetup(closes, closes.map((v) => v + 0.2), closes.map((v) => v - 0.2), flat(80, 1000));
        expect(s?.signals).toContain('uptrend');
        expect(s?.score).toBeGreaterThan(0);
    });

    it('flags fresh MACD flips', () => {
        // Flat then a single jump on the last bar: histogram flips positive
        const closes = [...new Array(72).fill(20), 24];
        const s = scoreSetup(closes, closes.map((v) => v + 0.2), closes.map((v) => v - 0.2), new Array(73).fill(1000));
        expect(s?.signals).toContain('macd-cross');
    });

    it('scores calm sideways markets at zero', () => {
        const closes = Array.from({ length: 90 }, (_, i) => 20 + Math.sin(i / 4));
        const s = scoreSetup(closes, closes.map((v) => v + 0.3), closes.map((v) => v - 0.3), new Array(90).fill(1000));
        expect(s?.score).toBe(0);
    });
});

describe('rsiMomentum', () => {
    it('returns null when history is too short', () => {
        expect(rsiMomentum([10, 11, 12])).toBeNull();
    });

    it('detects a rising RSI after a rally', () => {
        // Flat, dip, then rally into the last bar: RSI mid-range and climbing
        const closes = [...new Array(30).fill(20), ...Array.from({ length: 10 }, (_, i) => 20 - i * 0.2), ...Array.from({ length: 10 }, (_, i) => 18 + i * 0.6)];
        const m = rsiMomentum(closes);
        expect(m).not.toBeNull();
        expect(m!.change).toBeGreaterThan(0);
        expect(m!.rsi).toBeGreaterThan(m!.prev);
    });

    it('detects a falling RSI after a selloff', () => {
        const closes = [...new Array(30).fill(20), ...Array.from({ length: 10 }, (_, i) => 20 + i * 0.4), ...Array.from({ length: 10 }, (_, i) => 24 - i * 0.6)];
        const m = rsiMomentum(closes);
        expect(m).not.toBeNull();
        expect(m!.change).toBeLessThan(0);
    });
});

describe('rsiBurst', () => {
    it('fires on a one-day jump >= 6 while RSI stays <= 50', () => {
        // Long bleed then a sharp last-day rally: big RSI jump from a low base
        const closes = [...Array.from({ length: 50 }, (_, i) => 30 - i * 0.2), 19.5, 21.5];
        const m = rsiBurst(closes, 6, 50);
        expect(m).not.toBeNull();
        expect(m!.change).toBeGreaterThanOrEqual(6);
        expect(m!.rsi).toBeLessThanOrEqual(50);
    });

    it('rejects small jumps', () => {
        const closes = [...new Array(40).fill(20), ...Array.from({ length: 10 }, (_, i) => 20 + i * 0.1)];
        expect(rsiBurst(closes, 6, 50)).toBeNull();
    });

    it('rejects jumps that land overbought', () => {
        // Oscillating base (RSI ~50) then a sharp last-day rally:
        // one-day jump is big but lands above 50
        const closes = [...Array.from({ length: 40 }, (_, i) => 20 + Math.sin(i) * 0.3), 21.8];
        const m = rsiMomentum(closes);
        expect(m!.change).toBeGreaterThanOrEqual(6);
        expect(m!.rsi).toBeGreaterThan(50);
        expect(rsiBurst(closes, 6, 50)).toBeNull();
    });
});
