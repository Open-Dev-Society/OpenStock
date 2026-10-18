import { describe, expect, it, beforeEach } from 'vitest';
import {
    COUNT_CLICKS,
    COUNT_GLYPHS,
    loadPatterns,
    patternById,
    patternsKey,
    savePatterns,
    type PatternDrawing,
} from '@/lib/drawings';

// The manual-count tools must resolve to a real PatternDef, otherwise
// patternElements() dereferences `def.group` on undefined and the chart
// silently stops rendering every manual count.
describe('manual count tools', () => {
    it('both count tools resolve to a definition', () => {
        expect(patternById('ew-count').group).toBe('count');
        expect(patternById('ew-count-abc').group).toBe('count');
        expect(patternById('ew-count').kind).toBe('poly');
        expect(patternById('ew-count-abc').kind).toBe('poly');
    });

    it('count tools are not offered in the patterns dropdown', () => {
        // The dropdown renders only patterns/elliott/cycles groups, so a count
        // tool leaking into those groups would duplicate the manual button.
        const groups = patternById('ew-count').group;
        expect(['patterns', 'elliott', 'cycles']).not.toContain(groups);
    });
});

describe('count degree glyph sets', () => {
    it('impulse sets are five pivots, corrections three', () => {
        for (const deg of ['major', 'minor', 'minute'] as const) {
            expect(COUNT_GLYPHS[deg].impulse).toHaveLength(COUNT_CLICKS.impulse);
            expect(COUNT_GLYPHS[deg].correction).toHaveLength(COUNT_CLICKS.correction);
        }
    });

    it('degrees mirror the engine degrees and stay unique', () => {
        expect(COUNT_GLYPHS.major.impulse).toEqual(['I', 'II', 'III', 'IV', 'V']);
        expect(COUNT_GLYPHS.minor.impulse).toEqual(['1', '2', '3', '4', '5']);
        expect(COUNT_GLYPHS.minute.impulse).toEqual(['i', 'ii', 'iii', 'iv', 'v']);
        expect(COUNT_GLYPHS.major.correction).toEqual(['(A)', '(B)', '(C)']);
        expect(COUNT_GLYPHS.minor.correction).toEqual(['A', 'B', 'C']);
        expect(COUNT_GLYPHS.minute.correction).toEqual(['a', 'b', 'c']);
        // A repeated glyph would render two "3"s on one count.
        for (const deg of ['major', 'minor', 'minute'] as const) {
            const all = [...COUNT_GLYPHS[deg].impulse, ...COUNT_GLYPHS[deg].correction];
            expect(new Set(all).size).toBe(all.length);
        }
    });
});

describe('count persistence', () => {
    const key = patternsKey('^TASI.SR', '30m');
    const pt = (price: number, i: number) => ({ time: 1000000 + i * 60, price });
    // loadPatterns/savePatterns are localStorage-backed and the suite runs in
    // the node environment, so park a tiny store on globalThis. No new deps.
    const store = new Map<string, string>();
    const shim = {
        getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
        clear: () => store.clear(),
        key: () => null,
        length: 0,
    } as unknown as Storage;
    (globalThis as unknown as { localStorage: Storage }).localStorage = shim;

    // savePatterns now writes under the canonical key while loadPatterns reads
    // every spelling, so each test needs a clean store or counts pile up.
    beforeEach(() => store.clear());

    it('round-trips a manual count with its label override', () => {
        const count: PatternDrawing = {
            id: 'c1',
            pattern: 'ew-count',
            pts: [pt(1, 1), pt(2, 2), pt(3, 3), pt(4, 4), pt(5, 5)],
            labels: COUNT_GLYPHS.major.impulse,
        };
        savePatterns('^TASI.SR', '30m', [count]);
        const loaded = loadPatterns('^TASI.SR', '30m');
        expect(loaded).toHaveLength(1);
        // Labels survive the reload so the degree the user picked is not lost.
        expect(loaded[0].labels).toEqual(['I', 'II', 'III', 'IV', 'V']);
    });

    it('keeps loading older counts stored without labels', () => {
        const legacy: PatternDrawing = { id: 'c2', pattern: 'ew-count', pts: [pt(1, 1), pt(2, 2), pt(3, 3), pt(4, 4), pt(5, 5)] };
        localStorage.setItem(key, JSON.stringify([legacy]));
        const loaded = loadPatterns('^TASI.SR', '30m');
        expect(loaded).toHaveLength(1);
        // Undefined labels mean the renderer falls back to the tool defaults.
        expect(loaded[0].labels).toBeUndefined();
        expect(patternById(loaded[0].pattern).pointLabels[0]).toBe('1');
    });

    it('still gates unknown tools and short point lists', () => {
        // loadPatterns drops anything whose tool is not registered, so a count
        // tool must stay in PATTERNS or hand counts silently vanish on reload.
        localStorage.setItem(key, JSON.stringify([
            { id: 'x', pattern: 'not-a-tool', pts: [pt(1, 1), pt(2, 2)] },
            { id: 'y', pattern: 'ew-count', pts: [pt(1, 1)] },
        ]));
        expect(loadPatterns('^TASI.SR', '30m')).toEqual([]);
        localStorage.setItem(key, 'not-json');
        expect(loadPatterns('^TASI.SR', '30m')).toEqual([]);
    });
});
