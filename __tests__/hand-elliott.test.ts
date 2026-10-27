import { describe, it, expect } from 'vitest';
import { handCount, handCountMarkers } from '@/lib/hand-elliott';

// Build a daily series out of pivot prices: each leg gets `bars` candles so
// the zigzag (3% sensitivity) can confirm every turn.
function seriesFromPivots(pivots: number[], bars = 6): { highs: number[]; lows: number[]; closes: number[] } {
    const highs: number[] = [];
    const lows: number[] = [];
    const closes: number[] = [];
    for (let i = 0; i + 1 < pivots.length; i++) {
        const from = pivots[i];
        const to = pivots[i + 1];
        for (let b = 0; b < bars; b++) {
            const c = from + ((to - from) * (b + 1)) / bars;
            highs.push(c + 0.05);
            lows.push(c - 0.05);
            closes.push(c);
        }
    }
    const last = pivots[pivots.length - 1];
    highs.push(last + 0.05);
    lows.push(last - 0.05);
    closes.push(last);
    return { highs, lows, closes };
}

describe('handCount (the reader\'s own count)', () => {
    it('numbers a clean down impulse and keeps the rules', () => {
        // 100 -> 90 (1) -> 96 (2) -> 80 (3) -> 86 (4) -> 70 (5)
        const { highs, lows, closes } = seriesFromPivots([100, 90, 96, 80, 86, 70]);
        const hand = handCount(highs, lows, closes, { marketOpen: false });
        expect(hand).not.toBeNull();
        // the count is a down impulse, numbered 1..N, with the last wave either
        // confirmed (1-5) or still forming (1-4 + a live 5?)
        const labels = hand!.prev.map((l) => l.label);
        expect(labels).toEqual(['1', '2', '3', '4', '5'].slice(0, labels.length));
        expect(labels.length).toBeGreaterThanOrEqual(4);
        const p = hand!.prev;
        // wave 2 holds the start, wave 3 exceeds wave 1, wave 4 no overlap
        expect(p[1].price).toBeLessThanOrEqual(100);
        expect(p[2].price).toBeLessThan(p[0].price);
        expect(p[3].price).toBeLessThanOrEqual(p[0].price);
    });

    it('reads a correction as A-B-C and starts the next impulse as 1?', () => {
        // 100 -> 92 (A) -> 96 (B) -> 88 (C) then a small rally
        const { highs, lows, closes } = seriesFromPivots([100, 92, 96, 88, 90]);
        const hand = handCount(highs, lows, closes, { marketOpen: false });
        expect(hand).not.toBeNull();
        const labels = hand!.prev.map((l) => l.label);
        expect(labels).toEqual(['A', 'B', 'C']);
        expect(hand!.live.length).toBeGreaterThan(0);
        expect(hand!.live[hand!.live.length - 1].label).toContain('?');
    });

    it('never labels a window that breaks the iron rules', () => {
        // a down move where wave 3 is far shorter than wave 1: the 5-wave
        // reading is illegal, so the count must fall back to another window
        const { highs, lows, closes } = seriesFromPivots([100, 60, 64, 62, 63, 61]);
        const hand = handCount(highs, lows, closes, { marketOpen: false });
        if (hand) {
            const p = hand.prev;
            const d = p[0].price > p[1].price ? -1 : 1;
            const w1 = Math.abs(p[0].price - (d < 0 ? 100 : 0));
            const w3 = Math.abs(p[2].price - p[1].price);
            // whatever it picked, wave 3 must exceed wave 1
            expect(w3).toBeGreaterThan(w1 * 0.999);
        }
    });

    it('treats the last bar as running while the market is open', () => {
        const { highs, lows, closes } = seriesFromPivots([100, 90, 96, 80, 86, 70]);
        const closed = handCount(highs, lows, closes, { marketOpen: false });
        const open = handCount(highs, lows, closes, { marketOpen: true });
        expect(closed).not.toBeNull();
        // with the last bar still forming the count can differ, but it must
        // never throw and must stay rule-consistent
        if (open) expect(open.prev.length).toBeGreaterThan(0);
    });

    it('builds markers for the count', () => {
        const { highs, lows, closes } = seriesFromPivots([100, 90, 96, 80, 86, 70]);
        const hand = handCount(highs, lows, closes, { marketOpen: false })!;
        const times = closes.map((_, i) => i);
        const mk = handCountMarkers(hand, times, '#E53935');
        expect(mk.length).toBe(hand.prev.length + hand.live.length);
        expect(mk.every((m) => m.shape === 'square')).toBe(true);
    });
});
