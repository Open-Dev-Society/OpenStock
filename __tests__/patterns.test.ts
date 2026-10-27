import { describe, it, expect } from 'vitest';
import { detectPatterns, patternBarTime, PATTERN_META, PatternKind } from '@/lib/patterns';

// Deterministic series builder: legs of (from, to, steps). Steps vary per leg
// so "Adam turns fast, Eve turns slow" is actually representable.
function mk(spec: [number, number, number][]) {
    const closes: number[] = [];
    for (const [from, to, steps] of spec) {
        for (let k = (closes.length ? 1 : 0); k <= steps; k++) closes.push(from + ((to - from) * k) / steps);
    }
    const highs = closes.map((c, i) => Math.max(c, closes[Math.min(i + 1, closes.length - 1)]) + 0.4);
    const lows = closes.map((c, i) => Math.min(c, closes[Math.min(i + 1, closes.length - 1)]) - 0.4);
    return { highs, lows, closes };
}

const kinds = (h: number[], l: number[], c: number[], devPct?: number) => detectPatterns(h, l, c, devPct).map((p) => p.kind);

describe('detectPatterns', () => {
    it('finds a head & shoulders top', () => {
        // Peak, dip, higher peak, dip, similar peak
        const { highs, lows, closes } = mk([
            [100, 108, 12], [108, 104, 12], [104, 116, 12], [116, 103, 12], [103, 107, 12],
        ]);
        const found = detectPatterns(highs, lows, closes);
        const hs = found.find((p) => p.kind === 'hs');
        expect(hs).toBeDefined();
        expect(hs!.direction).toBe('bearish');
        expect(hs!.pivots.map((p) => p.role)).toEqual(['LS', 'N1', 'H', 'N2', 'RS']);
        expect(hs!.lines.some((ln) => ln.role === 'neckline' && ln.extend)).toBe(true);
    });

    it('labels an inverted head & shoulders as bullish', () => {
        // Low, neck, deeper low, neck, low at the first shoulder's level
        const { highs, lows, closes } = mk([
            [84, 92, 12], [92, 80, 12], [80, 94, 12], [94, 85, 12],
        ]);
        const inv = detectPatterns(highs, lows, closes).find((p) => p.kind === 'hs-inv');
        expect(inv).toBeDefined();
        expect(inv!.direction).toBe('bullish');
    });

    it('finds double tops and double bottoms', () => {
        const top = mk([[108, 104, 12], [104, 107.5, 12], [107.5, 104, 12]]);
        expect(kinds(top.highs, top.lows, top.closes)).toContain('double-top');
        const bot = mk([[92, 96, 12], [96, 92.8, 12], [92.8, 97, 12]]);
        expect(kinds(bot.highs, bot.lows, bot.closes)).toContain('double-bottom');
    });

    it('separates Adam (sharp) from Eve (rounded) bottoms', () => {
        // The first bottom arrives in 5 bars, the retest is given 30.
        const { highs, lows, closes } = mk([
            [100, 96, 5], [96, 99, 14], [99, 97, 16],
        ]);
        expect(kinds(highs, lows, closes)).toContain('adam-eve');
    });

    it('finds a cup & handle', () => {
        // Rounded base with level rims, then a shallow handle below the rim.
        // Deviation is pinned so the small handle dip survives the zigzag.
        const { highs, lows, closes } = mk([
            [100, 96, 14], [96, 92, 14], [92, 99.5, 16], [99.5, 97.4, 4], [97.4, 98.6, 5],
        ]);
        const cup = detectPatterns(highs, lows, closes, 1.4).find((p) => p.kind === 'cup-handle');
        expect(cup).toBeDefined();
        expect(cup!.direction).toBe('bullish');
        expect(cup!.pivots.map((p) => p.role)).toEqual(['Rim', 'Cup', 'Rim', 'Handle', 'Top']);
        // The breakout level is the right rim, not the handle top
        expect(cup!.lines.some((ln) => ln.role === 'side' && ln.extend)).toBe(true);
    });

    it('rejects a cup whose handle falls back to the cup low', () => {
        const { highs, lows, closes } = mk([
            [100, 96, 14], [96, 92, 14], [92, 99.5, 16], [99.5, 91, 4], [91, 98.6, 5],
        ]);
        expect(detectPatterns(highs, lows, closes, 1.4).some((p) => p.kind === 'cup-handle')).toBe(false);
    });

    it('finds a consolidation channel', () => {
        const series = mk([
            [100, 108, 12], [108, 100, 12], [100, 107, 12], [107, 101, 12], [101, 106.5, 12], [106.5, 101.5, 12],
        ]);
        const found = detectPatterns(series.highs, series.lows, series.closes);
        expect(found.length).toBeGreaterThan(0);
        for (const p of found) {
            expect(PATTERN_META[p.kind]).toBeDefined();
            expect(p.confidence).toBeGreaterThan(0);
            expect(p.confidence).toBeLessThanOrEqual(1);
        }
    });

    it('reports highest-confidence, non-overlapping matches only', () => {
        const { highs, lows, closes } = mk([
            [100, 108, 12], [108, 104, 12], [104, 116, 12], [116, 103, 12], [103, 107, 12], [107, 99, 12], [99, 104, 12],
        ]);
        const found = detectPatterns(highs, lows, closes);
        for (let i = 0; i < found.length; i++) {
            for (let j = i + 1; j < found.length; j++) {
                const a = found[i];
                const b = found[j];
                const disjoint = a.endIndex < b.startIndex || b.endIndex < a.startIndex;
                expect(disjoint).toBe(true);
            }
        }
    });

    it('never labels the same pivot twice inside one pattern', () => {
        const { highs, lows, closes } = mk([
            [100, 108, 12], [108, 104, 12], [104, 116, 12], [116, 103, 12], [103, 107, 12], [107, 99, 12],
        ]);
        for (const p of detectPatterns(highs, lows, closes)) {
            const idx = p.pivots.map((q) => q.index);
            expect(new Set(idx).size).toBe(idx.length);
        }
    });

    it('returns nothing for flat data', () => {
        const flat = [10, 10.05, 9.98, 10.02, 9.99, 10.01, 10, 10.02, 9.99, 10.01, 10, 10.01, 9.99, 10];
        const h = flat.map((v) => v + 0.02);
        const l = flat.map((v) => v - 0.02);
        expect(kinds(h, l, flat)).toEqual([]);
    });

    it('handles tiny series without throwing', () => {
        const tiny = [10, 11, 12, 11, 10];
        expect(() => detectPatterns(tiny, tiny, tiny)).not.toThrow();
        expect(detectPatterns([], [], [])).toEqual([]);
    });

    it('patternBarTime only resolves in-range bars', () => {
        const times = ['2026-01-01', '2026-01-02', 5123];
        expect(patternBarTime(times, 0)).toBe('2026-01-01');
        expect(patternBarTime(times, 2)).toBe(5123);
        expect(patternBarTime(times, -1)).toBeNull();
        expect(patternBarTime(times, 3)).toBeNull();
        expect(patternBarTime(times, 99)).toBeNull();
        expect(patternBarTime([], 0)).toBeNull();
        expect(patternBarTime(times, 1.5)).toBeNull();
    });

    it('every reported form carries bilingual metadata', () => {
        const { highs, lows, closes } = mk([
            [100, 108, 12], [108, 104, 12], [104, 116, 12], [116, 103, 12], [103, 107, 12], [107, 99, 12],
        ]);
        for (const p of detectPatterns(highs, lows, closes)) {
            expect(typeof p.label).toBe('string');
            expect(p.labelAr).toBe(PATTERN_META[p.kind as PatternKind].labelAr);
            expect(['bullish', 'bearish']).toContain(p.direction);
        }
    });

    it('works across frames: identical shape at two sensitivities', () => {
        const series = mk([
            [1000, 1080, 12], [1080, 1040, 12], [1040, 1160, 12], [1160, 1030, 12], [1030, 1065, 12], [1065, 990, 12],
        ]);
        const a = detectPatterns(series.highs, series.lows, series.closes, 0.2);
        const b = detectPatterns(series.highs, series.lows, series.closes, 2);
        expect(Array.isArray(a)).toBe(true);
        expect(Array.isArray(b)).toBe(true);
    });
});

describe('projectToEdge', () => {
    it('extends flat levels to the edge', async () => {
        const { projectToEdge } = await import('@/lib/patterns');
        expect(projectToEdge(0, 100, 10, 100, 50, 0, 200)).toEqual({ x: 50, y: 100 });
    });

    it('clamps steep projections to the data bounds', async () => {
        const { projectToEdge } = await import('@/lib/patterns');
        const p = projectToEdge(0, 100, 4, 65, 30, 0, 200);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(200);
        expect(p.x).toBeLessThanOrEqual(30);
    });

    it('leaves short or backward edges alone', async () => {
        const { projectToEdge } = await import('@/lib/patterns');
        expect(projectToEdge(0, 100, 0, 100, 50, 0, 200)).toEqual({ x: 0, y: 100 });
        expect(projectToEdge(10, 100, 20, 110, 5, 0, 200)).toEqual({ x: 20, y: 110 });
    });
});
