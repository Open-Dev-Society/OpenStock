// Automatic classical chart-pattern detection for the Tadawul chart.
// Pure functions, covered by tests. Rendering lives in TadawulChart as an SVG overlay.
//
// Detection runs on the zigzag pivots already used for Elliott numbering, so
// the same sensitivity logic makes patterns work on 1m candles and monthly
// bars alike. Every pattern must pass strict geometry rules; anything that
// does not fit is simply not reported (an honest blank beat a wrong shape).

import { zigzag, autoDevPct, type ZigPivot } from './indicators';

export type PatternKind =
    | 'hs' | 'hs-inv'
    | 'double-top' | 'double-bottom'
    | 'adam-eve' | 'eve-adam'
    | 'triangle' | 'wedge-up' | 'wedge-down' | 'rectangle' | 'ascending-tri' | 'descending-tri'
    | 'flag' | 'pennant'
    | 'gartley' | 'bat' | 'butterfly' | 'crab' | 'cypher' | 'cup-handle';

export type PatternPivot = { index: number; price: number; type: 'high' | 'low'; role: string };

export type PatternLine = { from: PatternPivot; to: PatternPivot; role: 'neckline' | 'upper' | 'lower' | 'side' | 'shape' | 'xabd'; extend?: boolean; dashed?: boolean };

export type DetectedPattern = {
    id: string;
    kind: PatternKind;
    label: string;
    labelAr: string;
    direction: 'bullish' | 'bearish';
    confidence: number;
    startIndex: number;
    endIndex: number;
    pivots: PatternPivot[];
    lines: PatternLine[];
};

export const PATTERN_META: Record<PatternKind, { label: string; labelAr: string; direction: 'bullish' | 'bearish' }> = {
    hs: { label: 'Head & Shoulders', labelAr: 'رأس وكتفان', direction: 'bearish' },
    'hs-inv': { label: 'Inverse H&S', labelAr: 'رأس وكتفان معكوس', direction: 'bullish' },
    'double-top': { label: 'Double Top', labelAr: 'قمم مزدوجة', direction: 'bearish' },
    'double-bottom': { label: 'Double Bottom', labelAr: 'قيعان مزدوجة', direction: 'bullish' },
    'adam-eve': { label: 'Adam & Eve', labelAr: 'آدم وحواء', direction: 'bullish' },
    'eve-adam': { label: 'Eve & Adam', labelAr: 'حواء وآدم', direction: 'bearish' },
    triangle: { label: 'Symmetric Triangle', labelAr: 'مثلث متماثل', direction: 'bullish' },
    'ascending-tri': { label: 'Ascending Triangle', labelAr: 'مثلث صاعد', direction: 'bullish' },
    'descending-tri': { label: 'Descending Triangle', labelAr: 'مثلث هابط', direction: 'bearish' },
    'wedge-up': { label: 'Rising Wedge', labelAr: 'إسفين صاعد', direction: 'bearish' },
    'wedge-down': { label: 'Falling Wedge', labelAr: 'إسفين هابط', direction: 'bullish' },
    rectangle: { label: 'Rectangle', labelAr: 'مستطيل (نطاق)', direction: 'bullish' },
    flag: { label: 'Flag', labelAr: 'رايت', direction: 'bullish' },
    pennant: { label: 'Pennant', labelAr: 'علم', direction: 'bullish' },
    gartley: { label: 'Gartley', labelAr: 'هارمونيك جارتلي', direction: 'bullish' },
    bat: { label: 'Bat', labelAr: 'هارمونيك بات', direction: 'bullish' },
    butterfly: { label: 'Butterfly', labelAr: 'هارمونيك باترفلاي', direction: 'bullish' },
    crab: { label: 'Crab', labelAr: 'هارمونيك كراب', direction: 'bullish' },
    cypher: { label: 'Cypher', labelAr: 'هارمونيك سايبر', direction: 'bullish' },
    'cup-handle': { label: 'Cup & Handle', labelAr: 'كوب ومقبض', direction: 'bullish' },
};

const ratio = (leg: number, full: number): number => (full === 0 ? Infinity : leg / full);

// --- Reversal patterns: defined on 5 alternating pivots (H,L,H,L,H or mirror) ---

// Head & Shoulders: equal shoulders around a higher head, neckline between the troughs.
function matchHeadShoulders(w: ZigPivot[]): DetectedPattern[] {
    if (w.length < 5) return [];
    const [ls, n1, hd, n2, rs] = w;
    const tys = [ls, n1, hd, n2, rs].map((p) => p.type);
    if (!tys.every((t, i) => i === 0 || t !== tys[i - 1])) return [];
    const up = ls.type === 'high';
    if (!up) {
        return matchHeadShoulders(w.map((p) => ({ ...p, price: -p.price, type: p.type === 'high' ? 'low' : 'high' })) as ZigPivot[]).map((p) => {
            const inv = { ...p, kind: 'hs-inv' as PatternKind, pivots: p.pivots.map((q) => ({ ...q, price: -q.price })) };
            return { ...inv, direction: 'bullish' as const };
        });
    }
    const headHeight = hd.price - ls.price;
    if (!(headHeight > 0)) return [];
    if (!(hd.price > rs.price) || !(hd.price > ls.price)) return [];
    if (rs.price >= ls.price + headHeight * 0.45) return [];
    if (n1.price >= rs.price) return [];
    if (n1.price > hd.price) return [];
    if (n2.price > hd.price) return [];
    if (Math.abs(n1.price - n2.price) > headHeight * 0.55) return [];
    // Time balance between the two troughs keeps chop out.
    const bars = Math.max(1, hd.index - n1.index);
    if (Math.abs(n2.index - n1.index) < bars * 0.4 || Math.abs(n2.index - n1.index) > bars * 2.5) return [];
    const conf = Math.min(1, 0.5 + 0.5 * (1 - Math.abs(n1.price - n2.price) / headHeight));
    const pivots: PatternPivot[] = [
        { index: ls.index, price: ls.price, type: 'high', role: 'LS' },
        { index: n1.index, price: n1.price, type: 'low', role: 'N1' },
        { index: hd.index, price: hd.price, type: 'high', role: 'H' },
        { index: n2.index, price: n2.price, type: 'low', role: 'N2' },
        { index: rs.index, price: rs.price, type: 'high', role: 'RS' },
    ];
    const at = (r: string) => pivots.find((p) => p.role === r)!;
    return [{
        id: `hs-${ls.index}`, kind: 'hs', label: 'Head & Shoulders', labelAr: 'رأس وكتفان', direction: 'bearish',
        confidence: conf, startIndex: ls.index, endIndex: rs.index, pivots,
        lines: [
            { from: at('LS'), to: at('H'), role: 'shape' },
            { from: at('H'), to: at('RS'), role: 'shape' },
            { from: at('N1'), to: at('N2'), role: 'neckline', extend: true, dashed: true },
        ],
    }];
}

// Double top/bottom plus the Adam & Eve variants, split by how each turn
// behaved: Adam turns fast (small bar gap), Eve turns slow (large bar gap).
function matchDouble(w: ZigPivot[]): DetectedPattern[] {
    const out: DetectedPattern[] = [];
    if (w.length >= 3) {
        for (const i of [0]) {
            const [p1, m, p2] = w.slice(i, i + 3);
            const up = p1.type === 'high';
            const eq = Math.abs(p1.price - p2.price) / Math.abs(p1.price - m.price);
            if (!(up ? p1.price > p2.price : p1.price < p2.price)) continue;
            if (Math.abs(p1.price - p2.price) > Math.abs(p1.price - m.price) * 0.22) continue;
            const kind = up ? 'double-top' : 'double-bottom';
            const pivots: PatternPivot[] = [
                { index: p1.index, price: p1.price, type: p1.type, role: up ? 'P1' : 'P1' },
                { index: m.index, price: m.price, type: m.type, role: 'M' },
                { index: p2.index, price: p2.price, type: p2.type, role: 'P2' },
            ];
            out.push({
                id: `d-${kind}-${p1.index}`, kind, label: PATTERN_META[kind].label, labelAr: PATTERN_META[kind].labelAr,
                direction: PATTERN_META[kind].direction, confidence: Math.min(1, 0.55 + (1 - eq) * 0.45),
                startIndex: p1.index, endIndex: p2.index, pivots,
                lines: [
                    { from: pivots[0], to: pivots[1], role: 'shape' },
                    { from: pivots[1], to: pivots[2], role: 'shape' },
                    { from: pivots[0], to: pivots[2], role: 'neckline', extend: true, dashed: true },
                ],
            });
        }
    }
    if (w.length >= 4) {
        // Adam & Eve needs the sharp turn first, then the rounded retest.
        const [p1, m, p2, m2] = w;
        const up = p1.type === 'high';
        const first = m.index - p1.index;
        const second = m2.index - p2.index;
        if (first > 0 && second > 0) {
            const depth1 = Math.abs(p1.price - m.price);
            const depth2 = Math.abs(p2.price - m2.price);
            const retestGap = Math.abs(p1.price - p2.price) / depth1;
            const timeRatio = second / first;
            const opposite = up ? m2.price > m.price : m2.price < m.price;
            // Adam = the fast/sharp turn, Eve = the slow/rounded one, and the
            // name lists them in chronological order. Direction comes from the
            // pivots themselves (double bottom -> bullish), so the same two
            // kinds cover both top and bottom cases.
            if (retestGap < 0.3 && opposite && timeRatio >= 1.8 && depth2 < depth1 * 0.9) {
                const firstSharp = first < second;
                const kind: PatternKind = firstSharp ? 'adam-eve' : 'eve-adam';
                const direction = up ? 'bearish' : 'bullish';
                const pivots: PatternPivot[] = [
                    { index: p1.index, price: p1.price, type: p1.type, role: up ? 'P1' : 'P1' },
                    { index: m.index, price: m.price, type: m.type, role: 'Adam' },
                    { index: p2.index, price: p2.price, type: p2.type, role: 'P2' },
                    { index: m2.index, price: m2.price, type: m2.type, role: 'Eve' },
                ];
                out.push({
                    id: `ae-${kind}-${p1.index}`, kind, label: PATTERN_META[kind].label, labelAr: PATTERN_META[kind].labelAr,
                    direction, confidence: Math.min(1, 0.6 + Math.min(0.3, timeRatio / 6)),
                    startIndex: p1.index, endIndex: m2.index, pivots,
                    lines: [
                        { from: pivots[0], to: pivots[1], role: 'shape' },
                        { from: pivots[1], to: pivots[2], role: 'shape' },
                        { from: pivots[2], to: pivots[3], role: 'shape' },
                        { from: pivots[0], to: pivots[2], role: 'neckline', extend: true, dashed: true },
                    ],
                });
            }
        }
    }
    return out;
}

// Triangles, wedges, rectangles, flags and pennants all reduce to "how do the
// two fitted lines behave", so one matcher produces them all. A fast pole leg
// splits the role: with it the matcher looks for flag/pennant (channel of the
// pivots after the pole), without it for triangle/wedge/rectangle (channel of
// every pivot).
function fitLine(pivots: ZigPivot[]): { slope: number; flat: boolean } | null {
    if (pivots.length < 2) return null;
    const a = pivots[0];
    const b = pivots[pivots.length - 1];
    const span = Math.max(1, b.index - a.index);
    const slope = (b.price - a.price) / a.price / span;
    return { slope, flat: Math.abs(slope) < 0.0006 };
}

function matchConsolidations(w: ZigPivot[]): DetectedPattern[] {
    if (w.length < 6) return [];
    const split = (pts: ZigPivot[], from = 0) => {
        const highs: ZigPivot[] = [];
        const lows: ZigPivot[] = [];
        pts.slice(from).forEach((p, i) => ((from + i) % 2 === 0 ? highs : lows).push(p));
        return { highs, lows };
    };
    const all = split(w);
    if (all.highs.length < 2 || all.lows.length < 2) return [];
    const up = w[0].type === 'high';

    // Pole: a fast, tall first leg.
    const poleDrop = Math.abs(w[1].price - w[0].price) / w[0].price;
    const poleBars = Math.max(1, w[1].index - w[0].index);
    const poleFast = poleDrop / poleBars > 0.0012 && poleDrop > 0.03;

    let kind: PatternKind | null = null;
    let upperPts: ZigPivot[] = [];
    let lowerPts: ZigPivot[] = [];

    if (poleFast && w.length >= 6) {
        // Channel is built only from the pivots after the pole.
        const ch = split(w, 2);
        if (ch.highs.length === 2 && ch.lows.length === 2) {
            const u = fitLine(up ? ch.highs : ch.lows);
            const l = fitLine(up ? ch.lows : ch.highs);
            if (u && l) {
                const gap = Math.abs(u.slope - l.slope);
                const converging = gap > Math.abs(u.slope) * 0.2;
                const parallel = gap <= Math.abs(u.slope) * 0.25;
                if (converging) kind = 'pennant';
                else if (parallel) kind = 'flag';
                if (kind) {
                    upperPts = up ? ch.highs : ch.lows;
                    lowerPts = up ? ch.lows : ch.highs;
                }
            }
        }
    }

    if (!kind) {
        const u = fitLine(up ? all.highs : all.lows);
        const l = fitLine(up ? all.lows : all.highs);
        if (u && l) {
            const upperDown = up ? u.slope < 0 : u.slope > 0;
            const lowerUp = up ? l.slope > 0 : l.slope < 0;
            if (u.flat && lowerUp) { kind = up ? 'ascending-tri' : 'descending-tri'; }
            else if (l.flat && upperDown) { kind = up ? 'descending-tri' : 'ascending-tri'; }
            else if (u.flat && l.flat) { kind = 'rectangle'; }
            else if (upperDown && lowerUp) { kind = 'triangle'; }
            else if (upperDown && l.slope < 0 && Math.abs(l.slope) < Math.abs(u.slope)) { kind = up ? 'wedge-up' : 'wedge-down'; }
            else if (lowerUp && u.slope > 0 && u.slope < l.slope) { kind = up ? 'wedge-down' : 'wedge-up'; }
            upperPts = up ? all.highs : all.lows;
            lowerPts = up ? all.lows : all.highs;
        }
    }
    if (!kind) return [];

    // Width sanity: a rectangle/parallel channel may hold, a "converging" one
    // that widens is just noise.
    const wStart = Math.abs(upperPts[0].price - lowerPts[0].price);
    const wEnd = Math.abs(upperPts[upperPts.length - 1].price - lowerPts[lowerPts.length - 1].price);
    if (kind !== 'rectangle' && wEnd > wStart * 1.15) return [];

    const span = w[w.length - 1].index - w[0].index;
    const rolePts = (pts: ZigPivot[]): PatternPivot[] =>
        pts.flatMap((p, i) => {
            const found = w.find((q) => q.index === p.index);
            return found ? [{ index: p.index, price: p.price, type: p.type, role: (up ? 'U' : 'L') + (i + 1) }] : [];
        });
    const pivots: PatternPivot[] = w.map((p, i) => ({ index: p.index, price: p.price, type: p.type, role: `${i + 1}` }));
    const line = (pts: ZigPivot[], role: 'upper' | 'lower'): PatternLine => ({
        from: rolePts([pts[0]])[0],
        to: rolePts([pts[pts.length - 1]])[0],
        role, extend: true,
    });

    const dirBull = kind === 'wedge-up' ? false : kind === 'wedge-down' ? true
        : kind === 'ascending-tri' ? true
            : kind === 'descending-tri' ? false
                : kind === 'pennant' ? !up
                    : true;

    return [{
        id: `c-${kind}-${w[0].index}`, kind, label: PATTERN_META[kind].label, labelAr: PATTERN_META[kind].labelAr,
        direction: dirBull ? 'bullish' : 'bearish', confidence: Math.min(1, (kind === 'flag' ? 0.75 : 0.7) + (span > 40 ? 0.1 : 0)),
        startIndex: w[0].index, endIndex: w[w.length - 1].index, pivots,
        lines: [line(upperPts, 'upper'), line(lowerPts, 'lower')],
    }];
}

// Cup & handle: a rounded base (both rims level) followed by a shallow
// handle that stays well above the cup bottom and below the breakout rim.
function matchCupHandle(w: ZigPivot[]): DetectedPattern[] {
    if (w.length < 5) return [];
    const [rim1, cup, rim2, handle, top] = w;
    const tys = [rim1, cup, rim2, handle, top].map((p) => p.type);
    if (!tys.every((t, i) => i === 0 || t !== tys[i - 1])) return [];
    const bull = rim1.type === 'high';
    const rimsNear = Math.abs(rim1.price - rim2.price) / Math.abs(rim1.price - cup.price) < 0.12;
    if (!rimsNear) return [];
    const cupDepth = Math.abs(Math.min(rim1.price, rim2.price) - cup.price);
    const rimHeight = Math.max(rim1.price, rim2.price);
    if (!(cupDepth > 0)) return [];
    if (cupDepth / rimHeight < 0.06) return [];
    // The bottom should sit roughly in the middle of the cup, not at an edge.
    const span = rim2.index - rim1.index;
    if (span < 12) return [];
    const mid = rim1.index + span / 2;
    if (Math.abs(cup.index - mid) > span * 0.35) return [];
    // Handle: shallow, contained, and never back to the cup low.
    const handleDepth = Math.abs(handle.price - top.price);
    if (!(handleDepth / cupDepth < 0.55)) return [];
    if (bull ? handle.price <= cup.price + cupDepth * 0.25 : handle.price >= cup.price - cupDepth * 0.25) return [];
    if (bull ? top.price >= rimHeight : top.price <= rimHeight) return [];
    const handleSpan = top.index - handle.index;
    if (handleSpan < 3) return [];
    const conf = Math.min(1, 0.62 + 0.38 * (1 - Math.abs(rim1.price - rim2.price) / cupDepth));
    const pivots: PatternPivot[] = [
        { index: rim1.index, price: rim1.price, type: rim1.type, role: 'Rim' },
        { index: cup.index, price: cup.price, type: cup.type, role: 'Cup' },
        { index: rim2.index, price: rim2.price, type: rim2.type, role: 'Rim' },
        { index: handle.index, price: handle.price, type: handle.type, role: 'Handle' },
        { index: top.index, price: top.price, type: top.type, role: 'Top' },
    ];
    return [{
        id: `cup-${rim1.index}`, kind: 'cup-handle',
        label: PATTERN_META['cup-handle'].label, labelAr: PATTERN_META['cup-handle'].labelAr,
        direction: 'bullish' as const, confidence: conf, startIndex: rim1.index, endIndex: top.index, pivots,
        lines: [
            { from: pivots[0], to: pivots[1], role: 'shape' },
            { from: pivots[1], to: pivots[2], role: 'shape' },
            { from: pivots[2], to: pivots[3], role: 'shape' },
            { from: pivots[3], to: pivots[4], role: 'shape' },
            { from: pivots[2], to: pivots[4], role: 'side', extend: true, dashed: true },
        ],
    }];
}

// --- Harmonic XABCD patterns on Fibonacci ratios ---

type HarmonicRule = {
    xa: [number, number]; ab: [number, number]; bc: [number, number]; cd: [number, number]; ad: [number, number];
};

const HARMONIC: Partial<Record<PatternKind, HarmonicRule>> = {
    gartley: { xa: [0.6, 0.64], ab: [0.382, 0.886], bc: [0.382, 0.886], cd: [1.27, 1.62], ad: [0.78, 0.8] },
    bat: { xa: [0.382, 0.5], ab: [0.382, 0.886], bc: [0.382, 0.886], cd: [1.618, 2.618], ad: [0.88, 0.92] },
    butterfly: { xa: [0.78, 0.86], ab: [0.382, 0.886], bc: [0.382, 0.886], cd: [1.618, 2.24], ad: [1.27, 1.32] },
    crab: { xa: [0.382, 0.62], ab: [0.382, 0.886], bc: [0.382, 0.886], cd: [2.618, 3.618], ad: [1.61, 1.65] },
    cypher: { xa: [0.382, 0.786], ab: [0.382, 0.886], bc: [1.13, 1.414], cd: [0.618, 0.786], ad: [0.786, 0.786] },
};

const inBand = (v: number, [lo, hi]: [number, number]) => v >= lo - 0.02 && v <= hi + 0.02;

function matchHarmonics(w: ZigPivot[]): DetectedPattern[] {
    if (w.length < 5) return [];
    const [x, a, b, c, d] = w;
    const tys = [x, a, b, c, d].map((p) => p.type);
    if (!tys.every((t, i) => i === 0 || t !== tys[i - 1])) return [];
    const out: DetectedPattern[] = [];
    for (const [kind, rule] of Object.entries(HARMONIC) as [PatternKind, HarmonicRule][]) {
        const xaLen = Math.abs(a.price - x.price);
        const abLen = Math.abs(b.price - a.price);
        const bcLen = Math.abs(c.price - b.price);
        const cdLen = Math.abs(d.price - c.price);
        const adLen = Math.abs(d.price - x.price);
        if (xaLen === 0 || abLen === 0 || bcLen === 0) continue;
        const rAB = ratio(abLen, xaLen);
        const rBC = ratio(bcLen, abLen);
        const rCD = ratio(cdLen, bcLen);
        const rAD = ratio(adLen, xaLen);
        // D must retrace X in the classic way (past B, inside/near X for most)
        const dBeyondB = d.type === b.type ? Math.sign(d.price - x.price) !== Math.sign(b.price - x.price) : true;
        if (!dBeyondB) continue;
        if (!inBand(rAB, rule.ab)) continue;
        if (!inBand(rBC, rule.bc)) continue;
        if (!inBand(rCD, rule.cd)) continue;
        if (!inBand(rAD, rule.ad)) continue;
        const mid = (v: number, [lo, hi]: [number, number]) => Math.abs(v - (lo + hi) / 2) / ((hi - lo) / 2);
        const conf = Math.min(1, 0.55 + 0.45 * (1 - (mid(rAB, rule.ab) + mid(rBC, rule.bc) + mid(rCD, rule.cd) + mid(rAD, rule.ad)) / 4));
        const pivots: PatternPivot[] = [x, a, b, c, d].map((p, i) => ({ index: p.index, price: p.price, type: p.type, role: ['X', 'A', 'B', 'C', 'D'][i] }));
        out.push({
            id: `h-${kind}-${x.index}`, kind, label: PATTERN_META[kind].label, labelAr: PATTERN_META[kind].labelAr,
            direction: x.type === 'low' ? 'bullish' : 'bearish', confidence: conf,
            startIndex: x.index, endIndex: d.index, pivots,
            lines: [
                { from: pivots[0], to: pivots[1], role: 'xabd' },
                { from: pivots[1], to: pivots[2], role: 'xabd' },
                { from: pivots[2], to: pivots[3], role: 'xabd' },
                { from: pivots[3], to: pivots[4], role: 'xabd', dashed: true },
            ],
        });
        return out;
    }
    return [];
}

// Collect every match at every offset, then greedily accept by confidence.
// Ordering matters: a consolidation can span the whole series and would
// otherwise shadow a clean reversal that sits inside it, so the strongest
// shape wins the region and weaker overlapping shapes are dropped.
export function detectPatterns(
    highs: number[],
    lows: number[],
    closes: number[],
    devPct?: number,
    maxPatterns = 6,
): DetectedPattern[] {
    const dev = devPct ?? autoDevPct(highs, lows, closes);
    const pivots = zigzag(highs, lows, closes, dev);
    if (pivots.length < 3) return [];
    const candidates: DetectedPattern[] = [];
    for (let i = 0; i + 3 <= pivots.length; i++) {
        const w = pivots.slice(i, i + Math.min(7, pivots.length - i));
        candidates.push(
            ...matchHarmonics(w.slice(0, 5)),
            ...matchHeadShoulders(w.slice(0, 5)),
            ...matchDouble(w.slice(0, 5)),
            ...matchCupHandle(w.slice(0, 5)),
            ...matchConsolidations(w.slice(0, 6)),
        );
    }
    // Same shape rediscovered one pivot later is the same pattern: keep one.
    const deduped: DetectedPattern[] = [];
    for (const c of candidates) {
        if (deduped.some((d) => d.kind === c.kind && Math.abs(d.startIndex - c.startIndex) <= 1)) continue;
        deduped.push(c);
    }
    // Strongest shape wins a region. Confidence first, then a small bonus per
    // pivot the shape structurally explains: an Adam & Eve (4 pivots + timing
    // evidence) describing the same tops as a Double Top (3 pivots) is the
    // more complete reading, so it takes precedence instead of a coin flip.
    const key = (p: DetectedPattern) => p.confidence + 0.02 * (p.pivots.length - 3);
    deduped.sort((a, b) => key(b) - key(a) || a.startIndex - b.startIndex);
    const out: DetectedPattern[] = [];
    for (const c of deduped) {
        if (out.length >= maxPatterns) break;
        if (out.some((p) => c.startIndex <= p.endIndex && c.endIndex >= p.startIndex)) continue;
        out.push(c);
    }
    return out.sort((a, b) => a.startIndex - b.startIndex);
}

// Safe bar-time lookup for overlay rendering. Detected patterns are computed
// from one data snapshot, but React renders the previous snapshot's shapes
// against the next snapshot's (possibly shorter) candles before the new
// detection runs. An out-of-range index must render nothing — never an empty
// string, which lightweight-charts rejects with a thrown Invalid-date error
// that unmounts the whole chart.
export function patternBarTime(times: Array<string | number>, index: number): string | number | null {
    return Number.isInteger(index) && index >= 0 && index < times.length ? times[index] : null;
}

// Project a line from (x1,y1) through (x2,y2) out to edgeX, but clamp it to
// [lo,hi]: an unclamped extension of a steep neckline shoots thousands of
// points off-scale and draws a meaningless diagonal across the whole chart.
// Returns the endpoint to actually draw.
export function projectToEdge(
    x1: number, y1: number, x2: number, y2: number,
    edgeX: number, lo: number, hi: number,
): { x: number; y: number } {
    const dx = x2 - x1;
    if (!(Math.abs(dx) > 1e-9) || edgeX <= x2) return { x: x2, y: y2 };
    const slope = (y2 - y1) / dx;
    let y = y1 + slope * (edgeX - x1);
    let x = edgeX;
    if (y > hi && slope > 0) { y = hi; x = x1 + (hi - y1) / slope; }
    else if (y < lo && slope < 0) { y = lo; x = x1 + (lo - y1) / slope; }
    else if (y > hi || y < lo) { return { x: x2, y: y2 }; }
    return { x, y };
}
