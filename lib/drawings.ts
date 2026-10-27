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

// The UI reaches the same instrument by two spellings: the sidebar links
// "TADAWUL:TASI" (markets.ts) while search and the screener link "TASI".
// Both render the same chart, but the storage key is built from the raw
// string, so a drawing saved from one route is invisible from the other.
// Collapse every spelling to one canonical key so a chart keeps its
// annotations no matter which link the user arrived from.
export function canonicalSymbol(symbol: string): string {
    const upper = decodeURIComponent(symbol).trim().toUpperCase();
    if (upper === 'TASI' || upper === '^TASI.SR' || upper === 'TADAWUL:TASI') return 'TASI';
    // "2222.SR" and "TADAWUL:2222" are the same instrument as "2222".
    if (upper.startsWith('TADAWUL:')) return upper.slice('TADAWUL:'.length);
    if (/^\d{4}\.SR$/.test(upper)) return upper.slice(0, 4);
    return upper;
}

// Keys written before canonicalSymbol existed, oldest spelling last so a real
// "TADAWUL:2222" save still wins over a bare "2222" one.
export function legacySymbolKeys(symbol: string): string[] {
    const canon = canonicalSymbol(symbol);
    const out = new Set<string>([canon]);
    if (/^\d{4}$/.test(canon)) {
        out.add(`${canon}.SR`);
        out.add(`TADAWUL:${canon}`);
    }
    if (canon === 'TASI') {
        out.add('TADAWUL:TASI');
        out.add('^TASI.SR');
    }
    return [...out];
}

// Merge every spelling's saved drawings into one list. Non-destructive: the
// original keys stay in place, so a rollback is just a code revert. The
// canonical key is read first so its entries keep their saved order.
export function mergeLegacyDrawings(symbol: string, range: string): Drawing[] {
    if (typeof localStorage === 'undefined') return [];
    const merged: Drawing[] = [];
    const seen = new Set<string>();
    for (const alt of legacySymbolKeys(symbol)) {
        let list: Drawing[] = [];
        try {
            const raw = localStorage.getItem(drawingsKey(alt, range));
            if (!raw) continue;
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) list = parsed as Drawing[];
        } catch { continue; }
        for (const d of list) {
            if (!d || typeof d.id !== 'string' || seen.has(d.id)) continue;
            seen.add(d.id);
            merged.push(d);
        }
    }
    return merged.slice(0, 50);
}

export function loadDrawings(symbol: string, range: string): Drawing[] {
    // Always merge: even when the canonical key already has entries, a chart
    // saved earlier from the other spelling must still show up. Returning early
    // on a hit would hide those drawings behind an empty-looking key.
    return mergeLegacyDrawings(symbol, range).filter(validDrawing);
}

const validDrawing = (d: Drawing) =>
    !!d &&
    (d.tool === 'trend' || d.tool === 'fibo' || d.tool === 'gann') &&
    typeof d.a?.price === 'number' && typeof d.b?.price === 'number' &&
    (typeof d.a?.time === 'string' || typeof d.a?.time === 'number') &&
    (typeof d.b?.time === 'string' || typeof d.b?.time === 'number');

export function saveDrawings(symbol: string, range: string, drawings: Drawing[]) {
    try {
        localStorage.setItem(drawingsKey(canonicalSymbol(symbol), range), JSON.stringify(drawings.slice(0, 50)));
    } catch { /* ignore */ }
}

// ---- Free-text notes pinned to the chart ----
// One click + typed text (unlike patterns, no fixed glyph set). Stored per
// symbol + timeframe like everything else, capped at 50.
export type TextNote = { id: string; time: string | number; price: number; text: string };

export const TEXT_MAX = 140;

export const textsKey = (symbol: string, range: string) => `tadawul-texts:${symbol}:${range}`;

// Validated constructor: null when there is nothing worth storing, so the
// chart never renders empty or runaway labels.
export function makeTextNote(time: unknown, price: unknown, text: unknown): TextNote | null {
    if ((typeof time !== 'string' && typeof time !== 'number') || typeof price !== 'number' || !Number.isFinite(price)) return null;
    if (typeof text !== 'string') return null;
    const clean = text.trim().replace(/\s+/g, ' ');
    if (clean.length === 0 || clean.length > TEXT_MAX) return null;
    return { id: newDrawingId(), time, price, text: clean };
}

const cleanNote = (d: unknown): TextNote | null => {
    if (!d || typeof d !== 'object') return null;
    const x = d as TextNote;
    if (typeof x.id !== 'string' || !x.id) return null;
    if (typeof x.text !== 'string' || x.text.length === 0 || x.text.length > TEXT_MAX) return null;
    if (!validPoint({ time: x.time, price: x.price })) return null;
    return { id: x.id, time: x.time, price: x.price, text: x.text };
};

export function loadTexts(symbol: string, range: string): TextNote[] {
    try {
        const raw = JSON.parse(localStorage.getItem(textsKey(symbol, range)) ?? '[]') as TextNote[];
        if (!Array.isArray(raw)) return [];
        return raw.filter((d): d is TextNote => cleanNote(d) != null);
    } catch {
        return [];
    }
}

export function saveTexts(symbol: string, range: string, notes: TextNote[]) {
    try {
        localStorage.setItem(textsKey(symbol, range), JSON.stringify(notes.slice(0, 50)));
    } catch { /* ignore */ }
}

// Move one note to a new anchor (drag on the chart). Unknown ids and bad
// prices leave the list untouched, so a stray drag never corrupts saved notes.
export function moveTextNote(notes: TextNote[], id: string, time: string | number, price: number): TextNote[] {
    if ((typeof time !== 'string' && typeof time !== 'number') || typeof price !== 'number' || !Number.isFinite(price)) return notes;
    if (!notes.some((n) => n.id === id)) return notes; // same reference: no change, no re-render
    return notes.map((n) => (n.id === id ? { ...n, time, price } : n));
}

// Replace a note's text with the SAME gate makeTextNote applies (trimmed,
// whitespace collapsed, 1..TEXT_MAX). Invalid text leaves the list unchanged.
export function updateTextNoteText(notes: TextNote[], id: string, text: unknown): TextNote[] {
    if (typeof text !== 'string') return notes;
    const clean = text.trim().replace(/\s+/g, ' ');
    if (clean.length === 0 || clean.length > TEXT_MAX) return notes;
    if (!notes.some((n) => n.id === id)) return notes; // same reference: no change, no re-render
    return notes.map((n) => (n.id === id ? { ...n, text: clean } : n));
}

export const newDrawingId = () =>
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// ---- Manual pattern tools (TradingView-style patterns panel) ----

export type PatternTool =
    | 'zig5' | 'cypher' | 'hs' | 'abcd' | 'triangle' | 'drives3'
    | 'ew-impulse' | 'ew-abc' | 'ew-tri' | 'ew-double' | 'ew-triple'
    | 'ew-count' | 'ew-count-abc'
    | 'cycles' | 'sine';

export type PatternKind = 'poly' | 'hs' | 'triangle-lines' | 'vlines' | 'sine';

export type PatternDef = {
    tool: PatternTool;
    group: 'patterns' | 'elliott' | 'cycles' | 'count';
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
    // Manual-count tools behind the "مانوال كاونت" button. Not listed in the
    // patterns dropdown (group 'count' is not rendered there) — they exist so
    // hand counts persist, reload and clear exactly like palette patterns.
    { tool: 'ew-count', group: 'count', label: 'Impulse count (1-5)', ar: 'ترقيم دافع (1-5)', clicks: 5, pointLabels: ['1', '2', '3', '4', '5'], kind: 'poly' },
    { tool: 'ew-count-abc', group: 'count', label: 'Correction count (A-B-C)', ar: 'ترقيم تصحيح (A-B-C)', clicks: 3, pointLabels: ['A', 'B', 'C'], kind: 'poly' },
];

export const patternById = (tool: PatternTool): PatternDef => PATTERNS.find((p) => p.tool === tool)!;

// `labels` overrides the tool's default pointLabels so one manual count can use
// any degree glyph set (minor 1-5, major I-V, minute i-v) without a tool per
// degree. Kept optional so older stored drawings load unchanged.
export type PatternDrawing = { id: string; pattern: PatternTool; pts: DrawPoint[]; labels?: string[] };

// ---- Manual Elliott count (زر "مانوال كاونت") ----
// Three degrees mirror the engine's own degrees so a hand count and the auto
// count read the same way on the chart: major I-V/(A)-(C), minor 1-5/A-C,
// minute i-v/a-c.
export type CountDegree = 'major' | 'minor' | 'minute';
export type CountKind = 'impulse' | 'correction';

export const COUNT_GLYPHS: Record<CountDegree, Record<CountKind, string[]>> = {
    major: { impulse: ['I', 'II', 'III', 'IV', 'V'], correction: ['(A)', '(B)', '(C)'] },
    minor: { impulse: ['1', '2', '3', '4', '5'], correction: ['A', 'B', 'C'] },
    minute: { impulse: ['i', 'ii', 'iii', 'iv', 'v'], correction: ['a', 'b', 'c'] },
};

export const COUNT_CLICKS: Record<CountKind, number> = { impulse: 5, correction: 3 };

export const patternsKey = (symbol: string, range: string) => `tadawul-patterns:${symbol}:${range}`;

const validPoint = (p: DrawPoint) =>
    p && typeof p.price === 'number' && (typeof p.time === 'string' || typeof p.time === 'number');

const validPattern = (d: PatternDrawing) =>
    !!d &&
    PATTERNS.some((p) => p.tool === d.pattern) &&
    Array.isArray(d.pts) && d.pts.length >= 2 && d.pts.every(validPoint);

export function loadPatterns(symbol: string, range: string): PatternDrawing[] {
    // Same reasoning as loadDrawings: merge unconditionally so counts saved
    // under the other spelling are never hidden.
    return mergeLegacyPatterns(symbol, range).filter(validPattern);
}

// Same non-destructive merge as drawings, so a manual Elliott count entered on
// "TADAWUL:TASI" is still there after opening "TASI".
export function mergeLegacyPatterns(symbol: string, range: string): PatternDrawing[] {
    if (typeof localStorage === 'undefined') return [];
    const merged: PatternDrawing[] = [];
    const seen = new Set<string>();
    for (const alt of legacySymbolKeys(symbol)) {
        let list: PatternDrawing[] = [];
        try {
            const raw = localStorage.getItem(patternsKey(alt, range));
            if (!raw) continue;
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) list = parsed as PatternDrawing[];
        } catch { continue; }
        for (const d of list) {
            if (!d || typeof d.id !== 'string' || seen.has(d.id)) continue;
            seen.add(d.id);
            merged.push(d);
        }
    }
    return merged.slice(0, 50);
}

export function savePatterns(symbol: string, range: string, drawings: PatternDrawing[]) {
    try {
        localStorage.setItem(patternsKey(canonicalSymbol(symbol), range), JSON.stringify(drawings.slice(0, 50)));
    } catch { /* ignore */ }
}

// ---- Chart transfer payload (زرّا نسخ/استيراد الإعدادات) ----
// One JSON object carries a chart's indicators + drawings + patterns
// (including manual counts) from one browser to another. The payload is
// validated with the SAME gates the loaders use, so a foreign payload can
// never crash the renderer — bad entries are dropped, never trusted.
export const TRANSFER_VERSION = 1;

export type TransferPayload = {
    v: number;
    app: 'openstock';
    kind: 'chart-transfer';
    symbol: string;
    range: string;
    indicators?: {
        enabled?: Record<string, boolean>;
        params?: Record<string, Record<string, number>>;
        colors?: Record<string, string>;
    };
    drawings?: Drawing[];
    patterns?: PatternDrawing[];
};

const isPoint = (p: unknown): p is DrawPoint =>
    !!p && typeof (p as DrawPoint).price === 'number' &&
    (typeof (p as DrawPoint).time === 'string' || typeof (p as DrawPoint).time === 'number');

const cleanDrawing = (d: unknown): Drawing | null => {
    if (!d || typeof d !== 'object') return null;
    const x = d as Drawing;
    if (x.tool !== 'trend' && x.tool !== 'fibo' && x.tool !== 'gann') return null;
    if (!isPoint(x.a) || !isPoint(x.b)) return null;
    const color = typeof x.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(x.color) ? x.color : undefined;
    return { id: typeof x.id === 'string' && x.id ? x.id : newDrawingId(), tool: x.tool, a: x.a, b: x.b, ...(color ? { color } : {}) };
};

const cleanPattern = (d: unknown): PatternDrawing | null => {
    // Same gate as loadPatterns: unknown tools are dropped, not rendered.
    if (!d || typeof d !== 'object') return null;
    const x = d as PatternDrawing;
    if (!PATTERNS.some((p) => p.tool === x.pattern)) return null;
    if (!Array.isArray(x.pts) || x.pts.length < 2 || !x.pts.every(isPoint)) return null;
    const labels = Array.isArray(x.labels) && x.labels.every((l) => typeof l === 'string') ? x.labels : undefined;
    return { id: typeof x.id === 'string' && x.id ? x.id : newDrawingId(), pattern: x.pattern, pts: x.pts, ...(labels ? { labels } : {}) };
};

export function buildTransferPayload(input: {
    symbol: string;
    range: string;
    indicators?: TransferPayload['indicators'];
    drawings?: Drawing[];
    patterns?: PatternDrawing[];
}): TransferPayload {
    return {
        v: TRANSFER_VERSION,
        app: 'openstock',
        kind: 'chart-transfer',
        symbol: input.symbol,
        range: input.range,
        ...(input.indicators ? { indicators: input.indicators } : {}),
        ...(input.drawings?.length ? { drawings: input.drawings.slice(0, 50) } : {}),
        ...(input.patterns?.length ? { patterns: input.patterns.slice(0, 50) } : {}),
    };
}

export function parseTransferPayload(raw: unknown):
    | { ok: true; payload: TransferPayload; drawings: Drawing[]; patterns: PatternDrawing[] }
    | { ok: false; error: string } {
    if (!raw || typeof raw !== 'object') return { ok: false, error: 'not-object' };
    const p = raw as Record<string, unknown>;
    // A paste that lost its opening keys is the common failure: the JSON still
    // parses (a tail fragment is valid JSON on its own once re-quoted), but the
    // identifying fields are gone. Say so instead of a bare 'not-transfer'.
    // `indicators` counts as a payload key because it only ever appears inside
    // a transfer payload, so its presence without app/kind means a botched copy.
    const hasPayloadKeys = p.v !== undefined
        || p.symbol !== undefined
        || p.range !== undefined
        || p.indicators !== undefined
        || p.drawings !== undefined
        || p.patterns !== undefined;
    // A payload that names our app but has a bad `kind`/`v` is a version skew,
    // not a botched copy. Only flag truncation when the identifying keys are
    // missing, and never for a foreign `app`.
    const looksLikeOurs = p.app === 'openstock' || p.kind === 'chart-transfer';
    if (p.app !== 'openstock' || p.kind !== 'chart-transfer') {
        return { ok: false, error: !looksLikeOurs && hasPayloadKeys ? 'truncated' : 'not-transfer' };
    }
    if (p.v !== TRANSFER_VERSION) return { ok: false, error: 'version' };
    if (typeof p.symbol !== 'string' || typeof p.range !== 'string') return { ok: false, error: 'no-source' };
    const drawings = Array.isArray(p.drawings) ? p.drawings.map(cleanDrawing).filter((d): d is Drawing => !!d) : [];
    const patterns = Array.isArray(p.patterns) ? p.patterns.map(cleanPattern).filter((d): d is PatternDrawing => !!d) : [];
    const payload = p as unknown as TransferPayload;
    return { ok: true, payload, drawings, patterns };
}
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
