import { describe, it, expect } from 'vitest';
import { adx, autoDevPct, bollinger, cci, donchian, elliottMarkers, elliottWaveLabels, elliottWaves, elliottWavesFull, ema, macd, rsi, sma, stochastic, studyPoints, zigzag } from '@/lib/indicators';

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

    it('emits pivots in chronological order (no inverted opening anchor)', () => {
        const drift = [100, 99.5, 100.5, 99, 98, 97, 98.5, 100, 102, 101, 103, 102, 104, 106, 105, 107];
        const pivots = zigzag(drift.map((v) => v + 0.3), drift.map((v) => v - 0.3), drift, 3);
        for (let i = 1; i < pivots.length; i++) {
            expect(pivots[i].index).toBeGreaterThan(pivots[i - 1].index);
            expect(pivots[i].type).not.toBe(pivots[i - 1].type);
        }
    });

    it('merges same-side staircase ratchets keeping the extreme', () => {
        // Relentless steps with no qualifying reversal between them.
        const stairs = [100, 99, 98, 97, 96, 95, 96.5, 95.5, 94, 93, 92, 93.5, 92.5, 91, 90];
        const pivots = zigzag(stairs.map((v) => v + 0.2), stairs.map((v) => v - 0.2), stairs, 1);
        for (let i = 1; i < pivots.length; i++) {
            expect(pivots[i].type).not.toBe(pivots[i - 1].type);
        }
        const lows = pivots.filter((p) => p.type === 'low');
        for (const lp of lows) {
            expect(lp.price).toBeLessThanOrEqual(96);
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

    it('rejects a repeated pivot side (zigzag ratchet)', () => {
        // Two consecutive highs must never count as an impulse
        const bad = [
            { index: 0, price: 100, type: 'low' },
            { index: 1, price: 110, type: 'high' },
            { index: 2, price: 112, type: 'high' },
            { index: 3, price: 120, type: 'high' },
            { index: 4, price: 113, type: 'low' },
            { index: 5, price: 125, type: 'high' },
        ] as const;
        expect(elliottWaves([...bad])).toEqual([]);
    });

    it('rejects wave 3 that never exceeds wave 1', () => {
        const bad = [
            { index: 0, price: 100, type: 'low' },
            { index: 1, price: 110, type: 'high' },
            { index: 2, price: 105, type: 'low' },
            { index: 3, price: 108, type: 'high' },
            { index: 4, price: 106, type: 'low' },
            { index: 5, price: 112, type: 'high' },
        ] as const;
        expect(elliottWaves([...bad])).toEqual([]);
    });
    it('returns [] when no clean impulse exists', () => {
        expect(elliottWaves([])).toEqual([]);
        expect(elliottWaves([{ index: 0, price: 10, type: 'low' } as const])).toEqual([]);
    });
});

describe('elliott numbering (auto + full chart)', () => {
    const leg = (from: number, to: number, steps: number) =>
        Array.from({ length: steps + 1 }, (_, i) => from + ((to - from) * i) / steps);
    const closes = [
        ...leg(100, 110, 5).slice(0, -1),
        ...leg(110, 104, 3).slice(0, -1),
        ...leg(104, 120, 6).slice(0, -1),
        ...leg(120, 113, 3).slice(0, -1),
        ...leg(113, 125, 5).slice(0, -1),
        ...leg(125, 118, 3).slice(0, -1),
        ...leg(118, 130, 5).slice(0, -1),
        ...leg(130, 124, 3).slice(0, -1),
        ...leg(124, 138, 5),
    ];
    const h = closes.map((v) => v + 0.5);
    const l = closes.map((v) => v - 0.5);

    it('autoDevPct scales to the bar range', () => {
        const daily = autoDevPct(h, l, closes);
        expect(daily).toBeGreaterThan(0.2);
        expect(daily).toBeLessThanOrEqual(6);
    });

    it('autoDevPct is far smaller on a tight intraday series', () => {
        // A percentage is scale-invariant by design, so compressing the price
        // level alone proves nothing. Tight bar ranges around a flat level are
        // what an intraday frame actually looks like.
        const n = 60;
        const ih: number[] = [];
        const il: number[] = [];
        const ic: number[] = [];
        for (let i = 0; i < n; i++) {
            const c = 20 + Math.sin(i / 3) * 0.2;
            ic.push(c);
            ih.push(c + 0.003);
            il.push(c - 0.003);
        }
        const intraday = autoDevPct(ih, il, ic);
        expect(intraday).toBeLessThan(0.5);
        expect(intraday).toBeLessThan(autoDevPct(h, l, closes));
    });

    it('numbers two impulses separated by their A-B-C correction', () => {
        // Two textbook impulses with a correction between them
        const pivots = [
            { index: 0, price: 100, type: 'low' },
            { index: 1, price: 110, type: 'high' },
            { index: 2, price: 105, type: 'low' },
            { index: 3, price: 120, type: 'high' },
            { index: 4, price: 113, type: 'low' },
            { index: 5, price: 125, type: 'high' },
            { index: 6, price: 118, type: 'low' },
            { index: 7, price: 122, type: 'high' },
            { index: 8, price: 116, type: 'low' },
            { index: 9, price: 124, type: 'high' },
            { index: 10, price: 117, type: 'low' },
            { index: 11, price: 136, type: 'high' },
            { index: 12, price: 128, type: 'low' },
            { index: 13, price: 145, type: 'high' },
        ] as const;
        const labels = elliottWavesFull([...pivots]);
        const names = labels.map((x) => x.label);
        expect(names.filter((n) => n === '1')).toHaveLength(2);
        expect(names).toContain('A');
        expect(names).toContain('C');
        // 13 primary + 6 alternates (each 1-5 doubles as A-B-C on its first 4)
        expect(labels.length).toBe(19);
        const alts = labels.filter((x) => x.alternate);
        expect(alts).toHaveLength(6);
        expect(alts.map((x) => x.label)).toEqual(['A', 'B', 'C', 'A', 'B', 'C']);
        // Every alternate shares its bars with a primary count
        const primaryBars = new Set(labels.filter((x) => !x.alternate).map((x) => x.index));
        for (const a of alts) expect(primaryBars.has(a.index)).toBe(true);
        // Corrections must not appear before an impulse has been numbered
        expect(names.indexOf('A')).toBeGreaterThan(names.indexOf('5'));
    });

    it('carries the pivot price for exact marker placement', () => {
        const labels = elliottWavesFull(zigzag(h, l, closes, 5));
        expect(labels.length).toBeGreaterThan(0);
        for (const lab of labels) {
            expect(typeof lab.price).toBe('number');
            expect(Number.isFinite(lab.price)).toBe(true);
        }
    });

    it('elliottWaveLabels runs the full pipeline with no explicit threshold', () => {
        expect(elliottWaveLabels(h, l, closes).length).toBeGreaterThan(0);
        expect(elliottWaveLabels(h, l, closes, 5).length).toBeGreaterThan(0);
    });

    it('handles short series (young listings on high timeframes) without throwing', () => {
        const few = closes.slice(0, 15);
        const fh = h.slice(0, 15);
        const fl = l.slice(0, 15);
        expect(() => elliottWaveLabels(fh, fl, few)).not.toThrow();
        expect(Array.isArray(elliottWaveLabels(fh, fl, few))).toBe(true);
    });

    it('never double-books a pivot except for flagged alternates', () => {
        const labels = elliottWavesFull(zigzag(h, l, closes, 5));
        const primary = labels.filter((x) => !x.alternate).map((x) => x.index);
        expect(new Set(primary).size).toBe(primary.length);
        const upper = new Set(primary);
        for (const a of labels.filter((x) => x.alternate)) {
            expect(upper.has(a.index)).toBe(true);
        }
    });

    it('labels an overlapping leading diagonal 1-5', () => {
        // Wave 4 dips into wave 1 territory but holds above wave 2 with a
        // narrowing wedge (wave-3 advance 4 < wave-4 hold 6): a motive wave
        // strict impulses reject.
        const pivots = [
            { index: 0, price: 100, type: 'low' },
            { index: 1, price: 110, type: 'high' },
            { index: 2, price: 102, type: 'low' },
            { index: 3, price: 114, type: 'high' },
            { index: 4, price: 108, type: 'low' },
            { index: 5, price: 120, type: 'high' },
        ] as const;
        const labels = elliottWavesFull([...pivots]);
        expect(labels.filter((x) => !x.alternate).map((x) => x.label)).toEqual(['1', '2', '3', '4', '5']);
        // The same swings also read as A-B-C: reported once, flagged alternate
        expect(labels.filter((x) => x.alternate).map((x) => x.label)).toEqual(['A', 'B', 'C']);
    });

    it('labels a standalone A-B-C correction', () => {
        const pivots = [
            { index: 0, price: 125, type: 'high' },
            { index: 1, price: 118, type: 'low' },
            { index: 2, price: 122, type: 'high' },
            { index: 3, price: 116, type: 'low' },
        ] as const;
        const labels = elliottWavesFull([...pivots]);
        // No motive validates here, so no alternate is reported either
        expect(labels.map((x) => x.label)).toEqual(['A', 'B', 'C']);
        expect(labels.some((x) => x.alternate)).toBe(false);
    });

    it('labels a running correction whose C truncates', () => {
        // C takes out neither A nor much ground, but retraces B well past
        // 10%: the truncated-C shape strong trends print. (In production the
        // zigzag deviation floor keeps such pivots meaningful.)
        const pivots = [
            { index: 0, price: 125, type: 'high' },
            { index: 1, price: 124.5, type: 'low' },
            { index: 2, price: 124.8, type: 'high' },
            { index: 3, price: 124.6, type: 'low' },
        ] as const;
        const labels = elliottWavesFull([...pivots]).map((x) => x.label);
        expect(labels).toEqual(['A', 'B', 'C']);
    });

    it('rejects drift whose C leg never develops', () => {
        // Same setup, but C goes nowhere (retraces 3% of B): no correction.
        const pivots = [
            { index: 0, price: 125, type: 'high' },
            { index: 1, price: 124.5, type: 'low' },
            { index: 2, price: 124.8, type: 'high' },
            { index: 3, price: 124.79, type: 'low' },
        ] as const;
        expect(elliottWavesFull([...pivots])).toEqual([]);
    });

    it('numbers two degrees on a full-size trend chart', () => {
        // ~640 bars like a real 1mo 15m frame: decline, rally, range.
        const legs: [number, number][] = [
            [11000, 10920], [10920, 10960], [10960, 10840], [10840, 10890],
            [10890, 10760], [10760, 10810], [10810, 10690], [10690, 10750],
            [10750, 10610], [10610, 10670], [10670, 10540], [10540, 10590],
            [10590, 10460], [10460, 10530], [10530, 10410], [10410, 10470],
            [10470, 10360], [10360, 10420], [10420, 10330], [10330, 10380],
            [10380, 10460], [10460, 10420], [10420, 10520], [10520, 10480],
            [10480, 10580], [10580, 10540], [10540, 10640], [10640, 10600],
            [10600, 10700], [10700, 10660], [10660, 10760], [10760, 10680],
            [10680, 10580], [10580, 10620], [10620, 10520], [10520, 10570],
            [10570, 10470], [10470, 10510], [10510, 10430], [10430, 10480],
        ];
        const cs: number[] = [];
        for (const [a, b] of legs) {
            for (let i = (cs.length ? 1 : 0); i <= 16; i++) cs.push(a + ((b - a) * i) / 16);
        }
        const ws = cs.map((c, i) => c + Math.sin(i * 1.7) * 2.5);
        const hh = ws.map((v, i) => Math.max(v, ws[Math.min(i + 1, ws.length - 1)]) + 2);
        const ll = ws.map((v, i) => Math.min(v, ws[Math.min(i + 1, ws.length - 1)]) - 2);
        const labels = elliottWaveLabels(hh, ll, ws);
        const minor = labels.filter((x) => x.degree === 'minor');
        const major = labels.filter((x) => x.degree === 'major');
        expect(minor.length).toBeGreaterThan(10);
        expect(major.map((x) => x.label)).toContain('III');
        expect(major.map((x) => x.label)).toContain('V');
        // Same-degree primaries are never double-labelled; alternates reuse
        // primary bars by design
        for (const deg of ['minor', 'major'] as const) {
            const idx = labels.filter((x) => x.degree === deg && !x.alternate).map((x) => x.index);
            expect(new Set(idx).size).toBe(idx.length);
        }
        // Labels reach deep into the chart, not just its head
        expect(Math.max(...labels.map((x) => x.index))).toBeGreaterThan(ws.length * 0.8);
    });

    it('maps labels to markers, dropping duplicate times',() => {
        const pivots = [
            { index: 0, price: 100, type: 'low' },
            { index: 1, price: 110, type: 'high' },
            { index: 2, price: 105, type: 'low' },
            { index: 3, price: 120, type: 'high' },
            { index: 4, price: 113, type: 'low' },
            { index: 5, price: 125, type: 'high' },
        ] as const;
        const labels = elliottWavesFull([...pivots]);
        const times = [10, 20, 30, 40, 50, 60];
        const m = elliottMarkers(labels, times, '#2962FF', '#FF6D00');
        expect(m).toHaveLength(5);
        // minor glyphs pin to the exact swing price; alternates merge into the
        // primary marker's text ("1 or A"), mirroring "(ii) or (B)" annotations
        expect(m[0]).toMatchObject({ time: 20, price: 110, position: 'atPriceTop', size: 2, text: '1 or A' });
        expect(m[2]).toMatchObject({ time: 40, price: 120, position: 'atPriceTop', text: '3 or C' });
        // two structures may share a pivot (same bar): only one marker drawn
        const shared = elliottMarkers(
            [...labels, { ...labels[0], label: 'A', position: 'aboveBar' as const, degree: 'minor' as const }],
            times, '#2962FF', '#FF6D00',
        );
        expect(shared).toHaveLength(5);
    });

    it('renders major degree glyphs above/below the bar', () => {
        const pivots = [
            { index: 0, price: 100, type: 'low' },
            { index: 1, price: 110, type: 'high' },
            { index: 2, price: 105, type: 'low' },
            { index: 3, price: 120, type: 'high' },
            { index: 4, price: 113, type: 'low' },
            { index: 5, price: 125, type: 'high' },
        ] as const;
        const m = elliottMarkers(elliottWavesFull([...pivots]).map((l) => ({ ...l, degree: 'major' as const })), [10, 20, 30, 40, 50, 60], '#2962FF', '#FF6D00');
        expect(m[0]).toMatchObject({ position: 'aboveBar', size: 3 });
        expect(m[0].price).toBeUndefined();
    });

    it('colours corrections orange and motive waves as configured', () => {
        const pivots = [
            { index: 0, price: 125, type: 'high' },
            { index: 1, price: 118, type: 'low' },
            { index: 2, price: 122, type: 'high' },
            { index: 3, price: 116, type: 'low' },
        ] as const;
        const m = elliottMarkers(elliottWavesFull([...pivots]), [10, 20, 30, 40], '#2962FF', '#FF6D00');
        expect(m.map((x) => x.text)).toEqual(['A', 'B', 'C']);
        expect(m.every((x) => x.color === '#FF6D00')).toBe(true);
    });
});

describe('elliott sub-waves (inner count)', () => {
    // Parent impulse whose legs each carry a 3-swing wiggle: the parent
    // validates 1-5 at dev 5 while the wiggle is invisible to it.
    const anchors = [100, 110, 104, 120, 113, 125, 121];
    const closes: number[] = [];
    for (let L = 0; L < anchors.length - 1; L++) {
        const a = anchors[L];
        const b = anchors[L + 1];
        for (let k = (closes.length ? 1 : 0); k <= 50; k++) {
            const t = k / 50;
            closes.push(a + (b - a) * t + Math.sin(t * Math.PI * 3) * 2.0 * Math.sin(Math.PI * t));
        }
    }
    const h = closes.map((v, i) => Math.max(v, closes[Math.min(i + 1, closes.length - 1)]) + 0.15);
    const l = closes.map((v, i) => Math.min(v, closes[Math.min(i + 1, closes.length - 1)]) - 0.15);
    const labels = elliottWaveLabels(h, l, closes, 5);
    const sub = labels.filter((x) => x.degree === 'sub');

    it('numbers complete inner groups inside labelled legs', () => {
        expect(sub.length).toBeGreaterThan(0);
        // Groups arrive whole: every emitted inner match keeps all its glyphs
        expect(sub.map((x) => x.label).sort()).toEqual(['a', 'a', 'b', 'b', 'c', 'c']);
    });

    it('uses minute glyphs strictly inside the parent range', () => {
        for (const x of sub) {
            expect(x.label).toMatch(/^(i|ii|iii|iv|v|a|b|c)$/);
            expect(x.index).toBeGreaterThanOrEqual(57);
            expect(x.index).toBeLessThanOrEqual(258);
        }
    });

    it('never shares a bar with minor/major labels except leg endpoints', () => {
        const parentBars = new Set([57, 99, 149, 199, 258]);
        const upper = new Set(labels.filter((x) => x.degree !== 'sub').map((x) => x.index));
        for (const x of sub) {
            if (parentBars.has(x.index)) continue;
            expect(upper.has(x.index)).toBe(false);
        }
    });

    it('is deterministic across runs', () => {
        const again = elliottWaveLabels(h, l, closes, 5);
        expect(again).toEqual(labels);
    });

    it('keeps the deepest degree honest wherever it appears', () => {
        // Four degrees exist in the notation; the deepest shows up only when an
        // inner leg is genuinely calmer than its parent. Whatever it finds must
        // obey the same invariants — verified instead of assumed.
        const labs = elliottWaveLabels(h, l, closes, 5);
        const deep = labs.filter((x) => x.degree === 'deep');
        const upper = new Set(labs.filter((x) => x.degree !== 'deep').map((x) => x.index));
        for (const x of deep) {
            expect(x.label).toMatch(/^\(\d\)$|^\([abc]\)$/);
            expect(upper.has(x.index)).toBe(false);
            expect(x.index).toBeGreaterThanOrEqual(0);
            expect(x.index).toBeLessThan(closes.length);
        }
        for (const deg of ['minor', 'major', 'sub', 'deep'] as const) {
            const idx = labs.filter((x) => x.degree === deg && !x.alternate).map((x) => x.index);
            expect(new Set(idx).size).toBe(idx.length);
        }
    });

    it('emits no sub-waves for legs shorter than 10 bars', () => {
        const tiny: number[] = [];
        for (const [a, b] of [[100, 110], [110, 104], [104, 120], [120, 113], [113, 125]] as [number, number][]) {
            for (let k = (tiny.length ? 1 : 0); k <= 5; k++) tiny.push(a + ((b - a) * k) / 5);
        }
        const th = tiny.map((v, i) => Math.max(v, tiny[Math.min(i + 1, tiny.length - 1)]) + 0.15);
        const tl = tiny.map((v, i) => Math.min(v, tiny[Math.min(i + 1, tiny.length - 1)]) - 0.15);
        const labs = elliottWaveLabels(th, tl, tiny, 5);
        expect(labs.filter((x) => x.degree === 'minor').length).toBeGreaterThan(0);
        expect(labs.filter((x) => x.degree === 'sub')).toEqual([]);
    });

    it('draws sub markers at readable size with matching colors', () => {
        const times = closes.map((_, i) => i);
        const m = elliottMarkers(sub, times, '#2962FF', '#FF6D00');
        expect(m.length).toBe(sub.length);
        for (const mk of m) {
            // Same readable size as minor; case (a vs A) tells them apart
            expect(mk.size).toBe(2);
            expect(mk.price).toBeDefined();
        }
        expect(m.filter((mk) => mk.text === 'a').every((mk) => mk.color === '#FF6D00')).toBe(true);
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

describe('donchian', () => {
    it('tracks the rolling highest high and lowest low', () => {
        const highs = [10, 12, 11, 13, 12];
        const lows = [9, 10, 10, 11, 11];
        const { upper, lower } = donchian(highs, lows, 3);
        expect(upper.slice(0, 2)).toEqual([null, null]);
        expect(upper[2]).toBe(12);
        expect(upper[4]).toBe(13);
        expect(lower[2]).toBe(9);
        expect(lower[4]).toBe(10);
    });
});
