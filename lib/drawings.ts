// Drawing-tool helpers for the Tadawul chart (trendline, Fibonacci, Gann box).
// Pure functions, covered by tests. Rendering lives in TadawulChart as an SVG overlay.

export type DrawingTool = 'trend' | 'fibo' | 'gann';

export type DrawPoint = { time: string | number; price: number };

export type Drawing = { id: string; tool: DrawingTool; a: DrawPoint; b: DrawPoint; color?: string };

export const DRAWING_DEFAULTS: Record<DrawingTool, string> = {
    trend: '#2962FF',
    fibo: '#EAB308',
    gann: '#7E57C2',
};

// Valid stored color or the tool default (old drawings have no color saved).
export function drawingColor(d: Pick<Drawing, 'tool' | 'color'>): string {
    return typeof d.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(d.color)
        ? d.color
        : DRAWING_DEFAULTS[d.tool];
}

export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 0.886, 1, 1.13, 1.272, 1.386, 1.414, 1.618, 2, 2.618, 3];

// Full retracement + extension set, direction-aware: ratios <= 1 sit between the
// anchors, ratios > 1 project past B in the trend direction.
export function fibLevelPrices(a: DrawPoint, b: DrawPoint): { ratio: number; price: number }[] {
    const top = Math.max(a.price, b.price);
    const bot = Math.min(a.price, b.price);
    const diff = top - bot;
    const uptrend = b.price >= a.price;
    return FIB_LEVELS.map((ratio) => ({
        ratio,
        price: ratio <= 1 ? top - diff * ratio : uptrend ? b.price + diff * (ratio - 1) : b.price - diff * (ratio - 1),
    }));
}

// Gann box corners + guides from two opposite corners.
export function gannGuides(a: DrawPoint, b: DrawPoint): { corners: DrawPoint[]; midPrice: number } {
    return {
        corners: [
            { time: a.time, price: a.price },
            { time: b.time, price: a.price },
            { time: b.time, price: b.price },
            { time: a.time, price: b.price },
        ],
        midPrice: (a.price + b.price) / 2,
    };
}

// Normalize a chart time (BusinessDay object, unix seconds, or date string)
// into a JSON-safe key for storage.
export function normalizeTimeKey(t: unknown): string | number | null {
    if (typeof t === 'string' || typeof t === 'number') return t;
    if (t && typeof t === 'object') {
        const b = t as { year?: number; month?: number; day?: number };
        if (b.year && b.month && b.day) {
            const m = String(b.month).padStart(2, '0');
            const d = String(b.day).padStart(2, '0');
            return `${b.year}-${m}-${d}`;
        }
    }
    return null;
}

export const drawingsKey = (symbol: string, range: string) => `tadawul-drawings:${symbol}:${range}`;

export function loadDrawings(symbol: string, range: string): Drawing[] {
    try {
        const raw = JSON.parse(localStorage.getItem(drawingsKey(symbol, range)) ?? '[]') as Drawing[];
        if (!Array.isArray(raw)) return [];
        return raw.filter(
            (d) =>
                d && (d.tool === 'trend' || d.tool === 'fibo' || d.tool === 'gann') &&
                typeof d.a?.price === 'number' && typeof d.b?.price === 'number' &&
                (typeof d.a?.time === 'string' || typeof d.a?.time === 'number') &&
                (typeof d.b?.time === 'string' || typeof d.b?.time === 'number'),
        );
    } catch {
        return [];
    }
}

export function saveDrawings(symbol: string, range: string, drawings: Drawing[]) {
    try {
        localStorage.setItem(drawingsKey(symbol, range), JSON.stringify(drawings.slice(0, 50)));
    } catch { /* ignore */ }
}

export const newDrawingId = () =>
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// ---- Manual pattern tools (TradingView-style patterns panel) ----

export type PatternTool =
    | 'zig5' | 'cypher' | 'hs' | 'abcd' | 'triangle' | 'drives3'
    | 'ew-impulse' | 'ew-abc' | 'ew-tri' | 'ew-double' | 'ew-triple'
    | 'cycles' | 'sine';

export type PatternKind = 'poly' | 'hs' | 'triangle-lines' | 'vlines' | 'sine';

export type PatternDef = {
    tool: PatternTool;
    group: 'patterns' | 'elliott' | 'cycles';
    label: string;
    ar: string;
    clicks: number;
    pointLabels: string[];
    kind: PatternKind;
};

export const PATTERNS: PatternDef[] = [
    { tool: 'zig5', group: 'patterns', label: 'XABCD', ar: 'نموذج XABCD', clicks: 5, pointLabels: ['X', 'A', 'B', 'C', 'D'], kind: 'poly' },
    { tool: 'cypher', group: 'patterns', label: 'Cypher', ar: 'نموذج Cypher', clicks: 5, pointLabels: ['X', 'A', 'B', 'C', 'D'], kind: 'poly' },
    { tool: 'hs', group: 'patterns', label: 'Head & Shoulders', ar: 'الرأس والكتفين', clicks: 5, pointLabels: ['كتف أيسر', 'عنق', 'رأس', 'عنق', 'كتف أيمن'], kind: 'hs' },
    { tool: 'abcd', group: 'patterns', label: 'ABCD', ar: 'نموذج ABCD', clicks: 4, pointLabels: ['A', 'B', 'C', 'D'], kind: 'poly' },
    { tool: 'triangle', group: 'patterns', label: 'Triangle', ar: 'نموذج المثلث', clicks: 4, pointLabels: ['1', '2', '3', '4'], kind: 'triangle-lines' },
    { tool: 'drives3', group: 'patterns', label: 'Three Drives', ar: 'نموذج ثلاثي الحركات', clicks: 3, pointLabels: ['1', '2', '3'], kind: 'poly' },
    { tool: 'ew-impulse', group: 'elliott', label: 'Impulse (1-5)', ar: 'موجة إليوت الاندفاعية (1·2·3·4·5)', clicks: 6, pointLabels: ['0', '1', '2', '3', '4', '5'], kind: 'poly' },
    { tool: 'ew-abc', group: 'elliott', label: 'Corrective (A-B-C)', ar: 'موجة إليوت تصحيح (A·B·C)', clicks: 4, pointLabels: ['0', 'A', 'B', 'C'], kind: 'poly' },
    { tool: 'ew-tri', group: 'elliott', label: 'Triangle (A-E)', ar: 'موجة إليوت مثلث (A·B·C·D·E)', clicks: 6, pointLabels: ['0', 'A', 'B', 'C', 'D', 'E'], kind: 'poly' },
    { tool: 'ew-double', group: 'elliott', label: 'Double combo (W-X-Y)', ar: 'موجة إليوت المزدوجة المركبة (W·X·Y)', clicks: 4, pointLabels: ['0', 'W', 'X', 'Y'], kind: 'poly' },
    { tool: 'ew-triple', group: 'elliott', label: 'Triple combo (W-X-Y-X-Z)', ar: 'موجة إليوت الثلاثية المركبة (W·X·Y·X·Z)', clicks: 6, pointLabels: ['0', 'W', 'X', 'Y', 'X', 'Z'], kind: 'poly' },
    { tool: 'cycles', group: 'cycles', label: 'Time cycles', ar: 'دورات الزمن', clicks: 2, pointLabels: [], kind: 'vlines' },
    { tool: 'sine', group: 'cycles', label: 'Sine line', ar: 'خط جيبي', clicks: 2, pointLabels: [], kind: 'sine' },
];

export const patternById = (tool: PatternTool): PatternDef => PATTERNS.find((p) => p.tool === tool)!;

export type PatternDrawing = { id: string; pattern: PatternTool; pts: DrawPoint[] };

export const patternsKey = (symbol: string, range: string) => `tadawul-patterns:${symbol}:${range}`;

const validPoint = (p: DrawPoint) =>
    p && typeof p.price === 'number' && (typeof p.time === 'string' || typeof p.time === 'number');

export function loadPatterns(symbol: string, range: string): PatternDrawing[] {
    try {
        const raw = JSON.parse(localStorage.getItem(patternsKey(symbol, range)) ?? '[]') as PatternDrawing[];
        if (!Array.isArray(raw)) return [];
        return raw.filter(
            (d) =>
                d && PATTERNS.some((p) => p.tool === d.pattern) &&
                Array.isArray(d.pts) && d.pts.length >= 2 && d.pts.every(validPoint),
        );
    } catch {
        return [];
    }
}

export function savePatterns(symbol: string, range: string, drawings: PatternDrawing[]) {
    try {
        localStorage.setItem(patternsKey(symbol, range), JSON.stringify(drawings.slice(0, 50)));
    } catch { /* ignore */ }
}

// Bar-index cycle lines: repeat every (b - a) bars, a few back and several forward.
export function cycleIndices(length: number, a: number, b: number, back = 2, fwd = 10): number[] {
    const step = b - a;
    if (!Number.isInteger(a) || !Number.isInteger(b) || step <= 0 || length <= 0) return [];
    const out: number[] = [];
    for (let k = -back; k <= fwd; k++) {
        const idx = a + k * step;
        if (idx >= 0 && idx < length) out.push(idx);
    }
    return out;
}
