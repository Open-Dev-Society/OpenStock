// Pure chart-view helpers (zoom + height + timeframe memory), covered by tests.

import { isCandleRangeId, type CandleRangeId } from '@/lib/yahoo';

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

// Sticky global timeframe: the last frame the user explicitly picked follows
// them across symbols (watchlist links carry no ?tf=). Per-symbol memory was
// removed on purpose: switching charts must never snap the frame by itself.
export const GLOBAL_TF_KEY = 'tadawul-tf:global';

// Precedence: explicit ?tf= in the URL (share/bookmark intent) > global
// last-picked frame > keep current. Never invents a change on its own.
export function resolveTimeframe(opts: {
    urlTf: string | null;
    globalTf: string | null;
    current: CandleRangeId;
}): CandleRangeId | null {
    const { urlTf, globalTf, current } = opts;
    // A URL timeframe is authoritative for this view only.
    if (isCandleRangeId(urlTf)) return urlTf === current ? null : urlTf;
    if (isCandleRangeId(globalTf)) return globalTf === current ? null : globalTf;
    return null;
}
