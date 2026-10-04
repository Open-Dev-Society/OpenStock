import { describe, it, expect } from 'vitest';
import { CHART_BASE_HEIGHT, CHART_MIN_HEIGHT, clampHeightDelta, zoomRange } from '@/lib/chart-view';

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
