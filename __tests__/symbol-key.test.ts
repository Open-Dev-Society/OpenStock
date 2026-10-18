import { describe, expect, it, beforeEach } from 'vitest';
import {
    canonicalSymbol,
    legacySymbolKeys,
    loadDrawings,
    saveDrawings,
    loadPatterns,
    savePatterns,
    drawingsKey,
    patternsKey,
} from '@/lib/drawings';

// vitest runs in the node environment, so stand in a minimal localStorage.
// These helpers only read/write/remove, which is all lib/drawings.ts uses.
class MemoryStorage {
    private map = new Map<string, string>();
    get length() { return this.map.size; }
    key(i: number) { return [...this.map.keys()][i] ?? null; }
    getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
    setItem(k: string, v: string) { this.map.set(k, String(v)); }
    removeItem(k: string) { this.map.delete(k); }
    clear() { this.map.clear(); }
}

const drawing = (id: string) => ({
    id,
    tool: 'trend' as const,
    a: { time: 1790848800, price: 10358.0 },
    b: { time: 1791356400, price: 10604.9 },
});

const count = (id: string) => ({
    id,
    pattern: 'ew-count' as const,
    pts: [
        { time: 1790848800, price: 10358.0 },
        { time: 1791356400, price: 10604.9 },
    ],
    labels: ['1', '2'],
});

beforeEach(() => {
    (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
});

describe('canonical symbol', () => {
    it('collapses every spelling of one instrument', () => {
        expect(canonicalSymbol('TASI')).toBe('TASI');
        expect(canonicalSymbol('tasi')).toBe('TASI');
        expect(canonicalSymbol('TADAWUL:TASI')).toBe('TASI');
        expect(canonicalSymbol('^TASI.SR')).toBe('TASI');
        expect(canonicalSymbol('TADAWUL:2222')).toBe('2222');
        expect(canonicalSymbol('2222.SR')).toBe('2222');
        expect(canonicalSymbol('2222')).toBe('2222');
        // Untouched when there is nothing to normalise.
        expect(canonicalSymbol('AAPL')).toBe('AAPL');
    });

    it('lists the legacy spellings a symbol may have been saved under', () => {
        expect(legacySymbolKeys('TADAWUL:TASI')).toContain('TASI');
        expect(legacySymbolKeys('TADAWUL:TASI')).toContain('TADAWUL:TASI');
        expect(legacySymbolKeys('2222.SR')).toContain('2222');
        expect(legacySymbolKeys('2222.SR')).toContain('2222.SR');
        expect(legacySymbolKeys('2222.SR')).toContain('TADAWUL:2222');
    });
});

describe('drawings survive a rename of the route', () => {
    it('saves under the canonical key whichever spelling opened the chart', () => {
        saveDrawings('TADAWUL:TASI', '30m', [drawing('a')]);
        expect(localStorage.getItem(drawingsKey('TASI', '30m'))).toBeTruthy();
        saveDrawings('TASI', '30m', [drawing('a')]);
        expect(localStorage.getItem(drawingsKey('TADAWUL:TASI', '30m'))).toBeNull();
    });

    it('reads a drawing saved under the old spelling', () => {
        // This is the real-world case: saved from /stocks/TADAWUL:TASI...
        localStorage.setItem(drawingsKey('TADAWUL:TASI', '30m'), JSON.stringify([drawing('legacy-1')]));
        // ...then opened from /stocks/TASI.
        const loaded = loadDrawings('TASI', '30m');
        expect(loaded.map((d) => d.id)).toContain('legacy-1');
    });

    it('merges both spellings without dropping either', () => {
        localStorage.setItem(drawingsKey('TADAWUL:TASI', '30m'), JSON.stringify([drawing('from-colon')]));
        localStorage.setItem(drawingsKey('TASI', '30m'), JSON.stringify([drawing('from-bare')]));
        const ids = loadDrawings('TADAWUL:TASI', '30m').map((d) => d.id);
        expect(ids).toContain('from-colon');
        expect(ids).toContain('from-bare');
    });

    it('never duplicates an id that exists under both spellings', () => {
        localStorage.setItem(drawingsKey('TADAWUL:TASI', '30m'), JSON.stringify([drawing('same')]));
        localStorage.setItem(drawingsKey('TASI', '30m'), JSON.stringify([drawing('same')]));
        const ids = loadDrawings('TASI', '30m').map((d) => d.id);
        expect(ids.filter((id) => id === 'same')).toHaveLength(1);
    });

    it('leaves the original keys in place (rollback is a revert)', () => {
        localStorage.setItem(drawingsKey('TADAWUL:TASI', '30m'), JSON.stringify([drawing('keep-me')]));
        loadDrawings('TASI', '30m');
        expect(localStorage.getItem(drawingsKey('TADAWUL:TASI', '30m'))).toBeTruthy();
    });

    it('still drops invalid entries while merging', () => {
        localStorage.setItem(
            drawingsKey('TADAWUL:TASI', '30m'),
            JSON.stringify([drawing('good'), { id: 'bad', tool: 'nope' }]),
        );
        expect(loadDrawings('TASI', '30m').map((d) => d.id)).toEqual(['good']);
    });
});

describe('manual counts survive the rename too', () => {
    it('reads a count saved under the old spelling', () => {
        localStorage.setItem(patternsKey('TADAWUL:TASI', '30m'), JSON.stringify([count('ew-1')]));
        const loaded = loadPatterns('TASI', '30m');
        expect(loaded.map((p) => p.id)).toContain('ew-1');
        expect(loaded[0].labels).toEqual(['1', '2']);
    });

    it('saves under the canonical key', () => {
        savePatterns('TADAWUL:TASI', '30m', [count('ew-2')]);
        expect(localStorage.getItem(patternsKey('TASI', '30m'))).toBeTruthy();
    });
});
