// Pure chart-view helpers (zoom + height), covered by tests.

export type LogicalRange = { from: number; to: number };

// Zoom a logical range around its center. factor < 1 zooms in, > 1 zooms out.
export function zoomRange(range: LogicalRange | null, factor: number): LogicalRange | null {
    if (!range || !(factor > 0) || !Number.isFinite(range.from) || !Number.isFinite(range.to)) return null;
    const center = (range.from + range.to) / 2;
    const half = Math.max(1, ((range.to - range.from) * factor) / 2);
    return { from: center - half, to: center + half };
}

export const CHART_MIN_HEIGHT = 320;
export const CHART_BASE_HEIGHT = 480;
export const CHART_MAX_DELTA = 480;

export const clampHeightDelta = (delta: number) => Math.min(CHART_MAX_DELTA, Math.max(-(CHART_BASE_HEIGHT - CHART_MIN_HEIGHT), delta));
