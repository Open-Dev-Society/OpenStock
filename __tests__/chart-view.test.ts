import { describe, it, expect } from 'vitest';
import { CHART_BASE_HEIGHT, CHART_MIN_HEIGHT, clampHeightDelta, resolveTimeframe, zoomRange } from '@/lib/chart-view';

describe('zoomRange', () => {
    it('zooms around the center', () => {
        expect(zoomRange({ from: 0, to: 100 }, 0.5)).toEqual({ from: 25, to: 75 });
        expect(zoomRange({ from: 0, to: 100 }, 2)).toEqual({ from: -50, to: 150 });
    });

    it('rejects bad input', () => {
        expect(zoomRange(null, 0.5)).toBeNull();
        expect(zoomRange({ from: 0, to: 100 }, 0)).toBeNull();
        expect(zoomRange({ from: 0, to: 100 }, -1)).toBeNull();
    });
});

describe('clampHeightDelta', () => {
    it('keeps the chart within bounds', () => {
        expect(CHART_BASE_HEIGHT + clampHeightDelta(10000)).toBe(CHART_BASE_HEIGHT + 480);
        expect(CHART_BASE_HEIGHT + clampHeightDelta(-10000)).toBe(CHART_MIN_HEIGHT);
        expect(clampHeightDelta(120)).toBe(120);
    });
});

describe('resolveTimeframe', () => {
    it('keeps the current frame when switching symbols (never snaps on its own)', () => {
        // User on 15m opens another company whose link carries no ?tf=.
        expect(resolveTimeframe({ urlTf: null, globalTf: null, current: '15m' })).toBeNull();
    });

    it('applies the global last-picked frame', () => {
        expect(resolveTimeframe({ urlTf: null, globalTf: '15m', current: '1m' })).toBe('15m');
    });

    it('prefers an explicit ?tf= over the global frame', () => {
        expect(resolveTimeframe({ urlTf: '1H', globalTf: '15m', current: '15m' })).toBe('1H');
    });

    it('returns null when the winner already matches (no-op switch)', () => {
        expect(resolveTimeframe({ urlTf: null, globalTf: '15m', current: '15m' })).toBeNull();
        expect(resolveTimeframe({ urlTf: 'D', globalTf: '15m', current: 'D' })).toBeNull();
    });

    it('ignores invalid stored values', () => {
        expect(resolveTimeframe({ urlTf: 'nope', globalTf: '15m', current: '1m' })).toBe('15m');
        expect(resolveTimeframe({ urlTf: null, globalTf: 'junk', current: '1m' })).toBeNull();
    });
});
