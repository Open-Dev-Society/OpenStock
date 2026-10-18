import { describe, it, expect } from 'vitest';
import { PATTERNS, cycleIndices, drawingColor, fibLevelPrices, gannGuides, normalizeTimeKey, patternById } from '@/lib/drawings';

describe('fibLevelPrices', () => {
    it('spans 0% at the extreme to 100% at the other side', () => {
        const levels = fibLevelPrices({ time: 'a', price: 20 }, { time: 'b', price: 30 });
        expect(levels[0]).toMatchObject({ ratio: 0, price: 30 });
        expect(levels.find((l) => l.ratio === 1)).toMatchObject({ ratio: 1, price: 20 });
        expect(levels.find((l) => l.ratio === 0.618)?.price).toBeCloseTo(23.82, 2);
        expect(levels).toHaveLength(16);
    });

    it('keeps retracements direction-agnostic and mirrors extensions past B', () => {
        const up = fibLevelPrices({ time: 'a', price: 20 }, { time: 'b', price: 30 });
        const down = fibLevelPrices({ time: 'a', price: 30 }, { time: 'b', price: 20 });
        expect(up.filter((l) => l.ratio <= 1)).toEqual(down.filter((l) => l.ratio <= 1));
        expect(up.find((l) => l.ratio === 1.618)?.price).toBeCloseTo(36.18, 2);
        expect(down.find((l) => l.ratio === 1.618)?.price).toBeCloseTo(13.82, 2);
        expect(up.find((l) => l.ratio === 2.618)?.price).toBeCloseTo(46.18, 2);
        expect(up.find((l) => l.ratio === 0.886)?.price).toBeCloseTo(21.14, 2);
        expect(up.find((l) => l.ratio === 1.13)?.price).toBeCloseTo(31.3, 2);
        expect(up.find((l) => l.ratio === 1.386)?.price).toBeCloseTo(33.86, 2);
        expect(up.find((l) => l.ratio === 1.414)?.price).toBeCloseTo(34.14, 2);
        expect(up.find((l) => l.ratio === 3)?.price).toBeCloseTo(50, 2);
    });
});

describe('gannGuides', () => {
    it('returns four corners and the mid price', () => {
        const g = gannGuides({ time: 'a', price: 10 }, { time: 'b', price: 20 });
        expect(g.corners).toHaveLength(4);
        expect(g.midPrice).toBe(15);
    });
});

describe('normalizeTimeKey', () => {    it('passes strings and numbers through', () => {
        expect(normalizeTimeKey('2026-10-01')).toBe('2026-10-01');
        expect(normalizeTimeKey(1790838000)).toBe(1790838000);
    });

    it('converts BusinessDay objects to date strings', () => {
        expect(normalizeTimeKey({ year: 2026, month: 1, day: 5 })).toBe('2026-01-05');
    });

    it('rejects garbage', () => {
        expect(normalizeTimeKey(null)).toBeNull();
        expect(normalizeTimeKey({})).toBeNull();
    });
});

describe('PATTERNS', () => {
    it('every tool has matching clicks and labels', () => {
        expect(PATTERNS.length).toBeGreaterThan(10);
        for (const p of PATTERNS) {
            if (p.kind === 'poly' || p.kind === 'hs' || p.kind === 'triangle-lines') {
                expect(p.pointLabels, p.tool).toHaveLength(p.clicks);
            }
            expect(patternById(p.tool)).toBe(p);
        }
    });

    it('covers patterns, Elliott waves, cycles and manual counts', () => {
        const groups = new Set(PATTERNS.map((p) => p.group));
        expect(groups).toEqual(new Set(['patterns', 'elliott', 'cycles', 'count']));
        // The patterns dropdown renders only these three groups, so the count
        // tools must stay out of it or the manual button gets duplicated.
        const dropdownGroups = new Set(['patterns', 'elliott', 'cycles']);
        const counts = PATTERNS.filter((p) => p.group === 'count');
        expect(counts).toHaveLength(2);
        for (const c of counts) expect(dropdownGroups.has(c.group)).toBe(false);
    });
});

describe('cycleIndices', () => {
    it('repeats every step bars within bounds', () => {
        expect(cycleIndices(100, 10, 20)).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
    });

    it('rejects bad input', () => {
        expect(cycleIndices(100, 20, 10)).toEqual([]);
        expect(cycleIndices(100, 10, 10)).toEqual([]);
        expect(cycleIndices(0, 0, 5)).toEqual([]);
    });
});

describe('drawingColor', () => {
    it('returns the stored color when valid', () => {
        expect(drawingColor({ tool: 'trend', color: '#FF6D00' })).toBe('#FF6D00');
    });

    it('falls back to the tool default otherwise', () => {
        expect(drawingColor({ tool: 'trend' })).toBe('#2962FF');
        expect(drawingColor({ tool: 'fibo' })).toBe('#EAB308');
        expect(drawingColor({ tool: 'gann' })).toBe('#7E57C2');
        expect(drawingColor({ tool: 'trend', color: 'red' })).toBe('#2962FF');
    });
});
