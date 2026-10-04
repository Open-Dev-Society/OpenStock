import { describe, it, expect } from 'vitest';
import { adx, bollinger, cci, elliottWaves, ema, macd, rsi, sma, stochastic, studyPoints, zigzag } from '@/lib/indicators';

describe('sma', () => {
    it('averages the trailing window', () => {
        expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
    });
});

describe('ema', () => {
    it('seeds with SMA then smooths', () => {
        expect(ema([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
    });

    it('returns all nulls when history is shorter than the period', () => {
        expect(ema([1, 2], 5)).toEqual([null, null]);
    });
});

describe('bollinger', () => {
    it('collapses on flat series', () => {
        const bb = bollinger([10, 10, 10, 10, 10], 3);
        expect(bb[2]).toMatchObject({ basis: 10, upper: 10, lower: 10 });
        expect(bb[0].upper).toBeNull();
    });

    it('widens with volatility', () => {
        const bb = bollinger([10, 12, 8, 12, 8], 5)[4];
        expect(bb.upper!).toBeGreaterThan(bb.basis!);
        expect(bb.lower!).toBeLessThan(bb.basis!);
    });
});

describe('rsi', () => {
    it('reads 100 on straight gains and 0 on straight losses', () => {
        expect(rsi([1, 2, 3, 4, 5, 6], 3)[5]).toBe(100);
        expect(rsi([6, 5, 4, 3, 2, 1], 3)[5]).toBe(0);
    });

    it('stays within 0-100 on mixed moves', () => {
        for (const v of rsi([10, 12, 11, 13, 12, 14, 13, 15], 3)) {
            if (v != null) {
                expect(v).toBeGreaterThanOrEqual(0);
                expect(v).toBeLessThanOrEqual(100);
            }
        }
    });
});

describe('macd', () => {
    it('is zero on flat series', () => {
        const m = macd([5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5], 3, 5, 2);
        const last = m[m.length - 1];
        expect(last.line).toBeCloseTo(0);
        expect(last.signal).toBeCloseTo(0);
        expect(last.hist).toBeCloseTo(0);
    });

    it('converges on sustained linear rallies', () => {
        const rising = Array.from({ length: 60 }, (_, i) => 10 + i);
        const last = macd(rising)[59];
        // Linear slope 1: MACD line -> fast lag - slow lag = 7, histogram -> 0
        expect(last.line!).toBeGreaterThan(0);
        expect(last.line!).toBeCloseTo(7, 0);
        expect(last.hist!).toBeCloseTo(0, 1);
    });
});

describe('studyPoints', () => {
    it('zips times and drops warmup nulls', () => {
        expect(studyPoints(['a', 'b', 'c'], [null, 2, 3])).toEqual([
            { time: 'b', value: 2 },
            { time: 'c', value: 3 },
        ]);
    });
});

describe('zigzag', () => {
    // Clean 5-wave impulse: 100 -> 110 -> 104 -> 120 -> 113 -> 125, then A-B-C
    const leg = (from: number, to: number, steps: number) =>
        Array.from({ length: steps + 1 }, (_, i) => from + ((to - from) * i) / steps);
    const closes = [...leg(100, 110, 5).slice(0, -1), ...leg(110, 104, 3).slice(0, -1), ...leg(104, 120, 6).slice(0, -1), ...leg(120, 113, 3).slice(0, -1), ...leg(113, 125, 5)];

    it('finds alternating swing pivots', () => {
        const pivots = zigzag(closes.map((v) => v + 0.5), closes.map((v) => v - 0.5), closes, 5);
        expect(pivots.length).toBeGreaterThanOrEqual(5);
        for (let i = 1; i < pivots.length; i++) {
            expect(pivots[i].type).not.toBe(pivots[i - 1].type);
        }
    });

    it('labels a textbook impulse 1-5', () => {
        const pivots = zigzag(closes.map((v) => v + 0.5), closes.map((v) => v - 0.5), closes, 5);
        const labels = elliottWaves(pivots).map((l) => l.label);
        expect(labels.slice(0, 5)).toEqual(['1', '2', '3', '4', '5']);
    });

    it('rejects overlapping wave 4', () => {
        // Wave 4 dips into wave 1 territory (p4.price <= p1.price)
        const bad = [
            { index: 0, price: 100, type: 'low' },
            { index: 1, price: 110, type: 'high' },
            { index: 2, price: 105, type: 'low' },
            { index: 3, price: 115, type: 'high' },
            { index: 4, price: 108, type: 'low' },
            { index: 5, price: 112, type: 'high' },
        ] as const;
        expect(elliottWaves([...bad])).toEqual([]);
    });

    it('returns [] when no clean impulse exists', () => {
        expect(elliottWaves([])).toEqual([]);
        expect(elliottWaves([{ index: 0, price: 10, type: 'low' } as const])).toEqual([]);
    });
});

describe('cci', () => {
    it('reads 0 on flat series', () => {
        const flat = [10, 10, 10, 10, 10, 10];
        expect(cci(flat, flat, flat, 3)[5]).toBe(0);
    });

    it('pins at extremes on straight moves', () => {
        const up = [10, 11, 12, 13, 14, 15];
        // Rising: TP above its mean -> CCI >= +100 once established
        expect(cci(up, up, up, 3)[5]).toBeGreaterThanOrEqual(100);
        const down = [15, 14, 13, 12, 11, 10];
        expect(cci(down, down, down, 3)[5]).toBeLessThanOrEqual(-100);
    });
});

describe('stochastic', () => {
    it('pins %K at 100 on straight rallies and 0 on straight falls', () => {
        const up = [10, 11, 12, 13, 14, 15, 16, 17];
        const sUp = stochastic(up, up, up, 3, 2);
        expect(sUp.k[7]).toBe(100);
        expect(sUp.d[7]).toBe(100);
        const down = [17, 16, 15, 14, 13, 12, 11, 10];
        expect(stochastic(down, down, down, 3, 2).k[7]).toBe(0);
    });

    it('stays within 0-100', () => {
        const h = [10, 12, 11, 13, 12, 14, 13, 15, 14, 16];
        const l = [9, 10, 10, 11, 11, 12, 12, 13, 13, 14];
        const c = [9.5, 11, 10.5, 12.5, 11.5, 13.5, 12.5, 14.5, 13.5, 15];
        for (const v of [...stochastic(h, l, c, 3, 2).k, ...stochastic(h, l, c, 3, 2).d]) {
            if (v != null) {
                expect(v).toBeGreaterThanOrEqual(0);
                expect(v).toBeLessThanOrEqual(100);
            }
        }
    });
});

describe('adx', () => {
    it('reads high on strong trends and low on flat markets', () => {
        const rising = Array.from({ length: 60 }, (_, i) => 10 + i * 0.5);
        const hi = rising.map((v) => v + 0.2);
        const lo = rising.map((v) => v - 0.2);
        const trend = adx(hi, lo, rising, 14);
        expect(trend.adx[59]!).toBeGreaterThan(20);
        expect(trend.plusDI[59]!).toBeGreaterThan(trend.minusDI[59]!);
        const flat = new Array(60).fill(10);
        expect(adx(flat, flat, flat, 14).adx[59]).toBe(0);
    });

    it('returns nulls when history is too short', () => {
        const a = adx([1, 2], [1, 2], [1, 2], 14);
        expect(a.adx.every((v) => v == null)).toBe(true);
    });
});
