// Technical-indicator math for the Tadawul chart. Pure functions, covered by tests.
// All functions take closes arrays and return values aligned with the input
// (null = not enough history yet), so callers can zip with candle times.

export function sma(values: number[], period: number): (number | null)[] {
    return values.map((_, i) => {
        if (i < period - 1) return null;
        let sum = 0;
        for (let j = i - period + 1; j <= i; j++) sum += values[j];
        return sum / period;
    });
}

export function ema(values: number[], period: number): (number | null)[] {
    const out: (number | null)[] = new Array(values.length).fill(null);
    if (values.length < period || period < 1) return out;
    const k = 2 / (period + 1);
    let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    out[period - 1] = prev;
    for (let i = period; i < values.length; i++) {
        prev = values[i] * k + prev * (1 - k);
        out[i] = prev;
    }
    return out;
}

export type Bollinger = { basis: number | null; upper: number | null; lower: number | null };

// Donchian support/resistance: rolling highest high / lowest low (null warmup).
export function donchian(highs: number[], lows: number[], period = 100): { upper: (number | null)[]; lower: (number | null)[] } {
    const upper: (number | null)[] = new Array(highs.length).fill(null);
    const lower: (number | null)[] = new Array(highs.length).fill(null);
    if (period < 1) return { upper, lower };
    for (let i = period - 1; i < highs.length; i++) {
        let hi = -Infinity;
        let lo = Infinity;
        for (let j = i - period + 1; j <= i; j++) {
            if (highs[j] > hi) hi = highs[j];
            if (lows[j] < lo) lo = lows[j];
        }
        upper[i] = hi;
        lower[i] = lo;
    }
    return { upper, lower };
}
export function bollinger(values: number[], period = 20, mult = 2): Bollinger[] {
    const basis = sma(values, period);
    return values.map((_, i) => {
        const b = basis[i];
        if (b == null) return { basis: null, upper: null, lower: null };
        let variance = 0;
        for (let j = i - period + 1; j <= i; j++) variance += (values[j] - b) ** 2;
        const sd = Math.sqrt(variance / period);
        return { basis: b, upper: b + mult * sd, lower: b - mult * sd };
    });
}

// Wilder's RSI.
export function rsi(values: number[], period = 14): (number | null)[] {
    const out: (number | null)[] = new Array(values.length).fill(null);
    if (values.length <= period || period < 1) return out;
    let gain = 0;
    let loss = 0;
    for (let i = 1; i <= period; i++) {
        const ch = values[i] - values[i - 1];
        gain += Math.max(ch, 0);
        loss += Math.max(-ch, 0);
    }
    gain /= period;
    loss /= period;
    out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
    for (let i = period + 1; i < values.length; i++) {
        const ch = values[i] - values[i - 1];
        gain = (gain * (period - 1) + Math.max(ch, 0)) / period;
        loss = (loss * (period - 1) + Math.max(-ch, 0)) / period;
        out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
    }
    return out;
}

export type Macd = { line: number | null; signal: number | null; hist: number | null };

export function macd(values: number[], fast = 12, slow = 26, signalPeriod = 9): Macd[] {
    const out: Macd[] = values.map(() => ({ line: null, signal: null, hist: null }));
    const fastEma = ema(values, fast);
    const slowEma = ema(values, slow);
    const line = values.map((_, i) =>
        fastEma[i] != null && slowEma[i] != null ? (fastEma[i] as number) - (slowEma[i] as number) : null,
    );
    const first = line.findIndex((v) => v != null);
    if (first < 0) return out;
    const k = 2 / (signalPeriod + 1);
    const seedEnd = Math.min(first + signalPeriod, line.length);
    let sum = 0;
    let seeded = 0;
    for (let i = first; i < seedEnd; i++) {
        sum += line[i] as number;
        seeded++;
    }
    let prevSignal = sum / seeded;
    for (let i = first; i < line.length; i++) {
        if (i < first + signalPeriod - 1) continue;
        if (i === first + signalPeriod - 1) {
            // prevSignal already the seed average
        } else {
            prevSignal = (line[i] as number) * k + prevSignal * (1 - k);
        }
        out[i] = { line: line[i], signal: prevSignal, hist: (line[i] as number) - prevSignal };
    }
    return out;
}

// Zip study values with candle times, dropping warmup nulls (for setData).
export function studyPoints<T extends string | number>(
    times: T[],
    values: (number | null)[],
): { time: T; value: number }[] {
    const points: { time: T; value: number }[] = [];
    for (let i = 0; i < times.length; i++) {
        const v = values[i];
        if (v != null && Number.isFinite(v)) points.push({ time: times[i], value: v });
    }
    return points;
}

export type ZigPivot = { index: number; price: number; type: 'high' | 'low' };

// ZigZag swings: a new pivot confirms once price reverses `devPct` from the
// running extreme. The developing (unconfirmed) extreme is included last so
// live charts label the wave in progress.
export function zigzag(highs: number[], lows: number[], closes: number[], devPct = 5): ZigPivot[] {
    const n = closes.length;
    const pivots: ZigPivot[] = [];
    if (n === 0 || devPct <= 0) return pivots;
    let trend = 0; // +1 seeking higher high, -1 seeking lower low
    let extHighIdx = 0;
    let extLowIdx = 0;
    let extHigh = highs[0];
    let extLow = lows[0];
    const downPct = (i: number) => ((extHigh - lows[i]) / extHigh) * 100;
    const upPct = (i: number) => ((highs[i] - extLow) / extLow) * 100;
    for (let i = 1; i < n; i++) {
        if (trend >= 0) {
            if (highs[i] > extHigh) {
                extHigh = highs[i];
                extHighIdx = i;
            }
            if (downPct(i) >= devPct) {
                // Opening drift anchors at its own extreme first
                if (trend === 0) pivots.push({ index: extLowIdx, price: extLow, type: 'low' });
                pivots.push({ index: extHighIdx, price: extHigh, type: 'high' });
                trend = -1;
                extLow = lows[i];
                extLowIdx = i;
                continue;
            }
        }
        if (trend <= 0) {
            if (lows[i] < extLow) {
                extLow = lows[i];
                extLowIdx = i;
            }
            if (upPct(i) >= devPct) {
                // Opening low only: the high leg is still developing
                pivots.push({ index: extLowIdx, price: extLow, type: 'low' });
                trend = 1;
                extHigh = highs[i];
                extHighIdx = i;
            }
        }
    }
    // Developing extreme of the open leg
    if (trend > 0) pivots.push({ index: extHighIdx, price: extHigh, type: 'high' });
    else if (trend < 0) pivots.push({ index: extLowIdx, price: extLow, type: 'low' });
    else if (n > 0) pivots.push({ index: n - 1, price: closes[n - 1], type: 'low' });
    const out = pivots.filter((p, i) => i === 0 || p.index !== pivots[i - 1].index);
    // The opening-drift anchor can print out of order (its extreme tracked past
    // the anchored high, e.g. [low@6, high@0]): it is unconfirmed drift noise
    // that also shifts every downstream scan window by one, so drop it. The
    // remainder stays chronological and alternating.
    if (out.length >= 2 && out[0].index > out[1].index) out.shift();
    // Merge same-side runs. In a staircase trend each step prints a new
    // extreme without a qualifying reversal between them (low,low,low...),
    // and no alternating window can ever cover such a run — the scan goes
    // blind exactly where the trend lives. Keep the most extreme of the run
    // (the swing's true turning point) so the series strictly alternates.
    const merged: ZigPivot[] = [];
    for (const q of out) {
        const last = merged[merged.length - 1];
        if (last && last.type === q.type) {
            const better = q.type === 'high' ? q.price > last.price : q.price < last.price;
            if (better) merged[merged.length - 1] = q;
        } else {
            merged.push(q);
        }
    }
    return merged;
}

export type WaveLabel = { index: number; label: string; position: 'aboveBar' | 'belowBar'; price: number; degree: 'major' | 'minor' | 'sub' | 'deep'; alternate?: boolean };

// Major-degree glyphs use classic Elliott degree notation so the two counts
// never read as duplicates on the chart.
const MAJOR_GLYPH: Record<string, string> = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', A: '(A)', B: '(B)', C: '(C)' };

// Sub-wave (minute) glyphs for the inner count inside a labelled wave.
const SUB_GLYPH: Record<string, string> = { '1': 'i', '2': 'ii', '3': 'iii', '4': 'iv', '5': 'v', A: 'a', B: 'b', C: 'c' };

// Deepest (minuette) glyphs — one more nesting level, matching the four counts
// professional charting packages show.
const DEEP_GLYPH: Record<string, string> = { '1': '(1)', '2': '(2)', '3': '(3)', '4': '(4)', '5': '(5)', A: '(a)', B: '(b)', C: '(c)' };

const atPivot = (p: ZigPivot, label: string, degree: 'major' | 'minor' = 'minor'): WaveLabel => ({
    index: p.index,
    label: degree === 'major' ? (MAJOR_GLYPH[label] ?? label) : label,
    position: p.type === 'high' ? 'aboveBar' : 'belowBar',
    price: p.price,
    degree,
});
// Leg times must simply be distinct bars: a pivot confirmed twice on the same
// bar is a zigzag artefact and no alternating window may cover it.
//
// A hard RATIO gate on leg times was measured here and removed: on real
// Tadawul data (TASI 30m and 2y 1H) it rejected textbook-valid impulses —
// a wave 2 printing in 1 bar against a 64-bar wave 1 (64:1) is ordinary
// market behaviour, not noise. Elliott validity is a PRICE property (wave 2
// holds the start, wave 3 is never the shortest, wave 4 never overlaps
// wave 1), so time is a guideline, never a validity gate.
function balancedLegs(pts: ZigPivot[]): boolean {
    for (let i = 1; i < pts.length; i++) {
        if (!(pts[i].index - pts[i - 1].index > 0)) return false;
    }
    return true;
}

// Validate one 6-pivot impulse and label it 1-5 (or null when a rule breaks).
function labelImpulse(pts: ZigPivot[], degree: 'minor' | 'major' = 'minor'): WaveLabel[] | null {
    if (pts.length < 6) return null;
    const [p0, p1, p2, p3, p4, p5] = pts;
    // Pivots must strictly alternate — zigzag ratchets can repeat a side
    const tys = [p0, p1, p2, p3, p4, p5].map((p) => p.type);
    if (!tys.every((t, i) => i === 0 || t !== tys[i - 1])) return null;
    // Legs must be distinct bars — see balancedLegs for why there is no
    // further ratio gate on leg times.
    if (!balancedLegs(pts)) return null;
    const up = p1.price > p0.price;
    if (up && p0.type !== 'low') return null;
    if (!up && p0.type !== 'high') return null;
    const len = (a: ZigPivot, b: ZigPivot) => Math.abs(b.price - a.price);
    const l1 = len(p0, p1);
    const l3 = len(p2, p3);
    const l5 = len(p4, p5);
    if (up) {
        if (p2.price <= p0.price) return null; // wave 2 past wave 1 start
        if (p4.price <= p1.price) return null; // wave 4 overlaps wave 1
        if (p3.price <= p1.price) return null; // wave 3 must exceed wave 1
    } else {
        if (p2.price >= p0.price) return null;
        if (p4.price >= p1.price) return null;
        if (p3.price >= p1.price) return null;
    }
    if (!(l3 >= Math.min(l1, l5))) return null; // wave 3 never the shortest
    return [atPivot(p1, '1', degree), atPivot(p2, '2', degree), atPivot(p3, '3', degree), atPivot(p4, '4', degree), atPivot(p5, '5', degree)];
}

// Label the most recent Elliott impulse (1-5) plus its A-B-C correction.
// Tries the window ending at the live pivot, then one pivot earlier.
// No clean fit -> [] (honest: no count shown instead of a wrong one).
export function elliottWaves(pivots: ZigPivot[]): WaveLabel[] {
    for (const end of [pivots.length, pivots.length - 1]) {
        const win = pivots.slice(Math.max(0, end - 9), end);
        if (win.length < 6) continue;
        const labelled = labelImpulse(win.slice(0, 6));
        if (!labelled) continue;
        const letters = ['A', 'B', 'C'];
        win.slice(6, 9).forEach((p, i) => {
            if (!labelled.some((l) => l.index === p.index)) labelled.push(atPivot(p, letters[i]));
        });
        return labelled;
    }
    return [];
}

// Automatic zigzag sensitivity. A fixed 5% never fires on 1m/5m frames (bars
// move tenths of a percent) yet is coarse on daily, so scale the threshold to
// the chart's own bar range (ATR as % of the last close). Waves number on
// intraday and daily alike with no manual tuning.
export function autoDevPct(highs: number[], lows: number[], closes: number[]): number {
    const n = closes.length;
    const last = closes[n - 1];
    if (n < 2 || !(last > 0)) return 5;
    let sum = 0;
    let cnt = 0;
    for (let i = Math.max(0, n - 200); i < n; i++) {
        const r = highs[i] - lows[i];
        if (!Number.isFinite(r) || r <= 0) continue;
        sum += r;
        cnt++;
    }
    if (cnt === 0) return 5;
    const atrPct = (sum / cnt / last) * 100;
    return Math.min(6, Math.max(0.2, atrPct * 2.5));
}

// Validate one 6-pivot leading/ending diagonal and label it 1-5 (or null).
// Diagonals are the motive structure trends actually print most often: wave 4
// overlaps wave 1, so strict impulses reject them. The wedge must narrow
// (the 3-4 price range is smaller than the 1-2 range) and wave 4 must still
// hold beyond wave 2's extreme, which separates a real diagonal from chop.
function labelDiagonal(pts: ZigPivot[], degree: 'minor' | 'major' = 'minor'): WaveLabel[] | null {
    if (pts.length < 6) return null;
    const [p0, p1, p2, p3, p4, p5] = pts;
    const tys = [p0, p1, p2, p3, p4, p5].map((p) => p.type);
    if (!tys.every((t, i) => i === 0 || t !== tys[i - 1])) return null;
    if (!balancedLegs(pts)) return null;
    const up = p1.price > p0.price;
    if (up && p0.type !== 'low') return null;
    if (!up && p0.type !== 'high') return null;
    const len = (a: ZigPivot, b: ZigPivot) => Math.abs(b.price - a.price);
    const l1 = len(p0, p1);
    const l3 = len(p2, p3);
    const l5 = len(p4, p5);
    if (up) {
        if (!(p2.price > p0.price)) return null; // wave 2 holds the start
        if (!(p3.price > p1.price)) return null; // wave 3 exceeds wave 1
        if (!(p4.price < p1.price)) return null; // overlap: the diagonal trait
        if (!(p4.price > p2.price)) return null; // ...yet still a higher low
        if (!(p5.price > p3.price)) return null; // wave 5 extends
        if (!((p3.price - p4.price) < (p1.price - p2.price))) return null; // wedge narrows
    } else {
        if (!(p2.price < p0.price)) return null;
        if (!(p3.price < p1.price)) return null;
        if (!(p4.price > p1.price)) return null;
        if (!(p4.price < p2.price)) return null;
        if (!(p5.price < p3.price)) return null;
        if (!((p4.price - p3.price) < (p2.price - p1.price))) return null;
    }
    if (!(l3 >= Math.min(l1, l5))) return null; // wave 3 never the shortest
    return [atPivot(p1, '1', degree), atPivot(p2, '2', degree), atPivot(p3, '3', degree), atPivot(p4, '4', degree), atPivot(p5, '5', degree)];
}

// Validate one 4-pivot zigzag correction (shared start + A/B/C leg ends) and
// label it A-B-C (or null). B must retrace 10-100% of A, and C must either
// take out A's extreme (classic) or at least retrace 10% of B (running
// correction — the truncated-C shape strong trends print after a sharp leg).
// Anything less is drift, not a correction.
function labelCorrectionQuad(win: ZigPivot[], degree: 'minor' | 'major' = 'minor'): WaveLabel[] | null {
    if (win.length < 4) return null;
    const [s, a, b, c] = win;
    const tys = [s, a, b, c].map((p) => p.type);
    if (!tys.every((t, i) => i === 0 || t !== tys[i - 1])) return null;
    // No time-proportion check here (unlike motive waves): pullbacks are
    // naturally quick compared to the push they correct, especially running
    // corrections inside trends. Size significance comes from the zigzag
    // deviation floor, and B/C proportions below are scale-free.
    const down = s.type === 'high';
    const lenA = Math.abs(a.price - s.price);
    const lenB = Math.abs(b.price - a.price);
    const lenC = Math.abs(c.price - b.price);
    if (!(lenA > 0)) return null;
    const retrB = lenB / lenA;
    if (!(retrB >= 0.1 && retrB < 1)) return null;
    if (down) {
        if (c.price < a.price) return [atPivot(a, 'A', degree), atPivot(b, 'B', degree), atPivot(c, 'C', degree)];
        if (lenB > 0 && lenC / lenB >= 0.1 && c.price < b.price) return [atPivot(a, 'A', degree), atPivot(b, 'B', degree), atPivot(c, 'C', degree)];
        return null;
    }
    if (c.price > a.price) return [atPivot(a, 'A', degree), atPivot(b, 'B', degree), atPivot(c, 'C', degree)];
    if (lenB > 0 && lenC / lenB >= 0.1 && c.price > b.price) return [atPivot(a, 'A', degree), atPivot(b, 'B', degree), atPivot(c, 'C', degree)];
    return null;
}

// Number every Elliott structure on the whole pivot series so an entire chart
// gets labelled: strict impulses first, then diagonals (the overlapping motive
// waves trends actually print), then standalone A-B-C corrections. Matches
// consume their pivots and the scan resumes at the shared endpoint (wave 5
// doubles as the correction's start, C doubles as the next impulse's start),
// which is what lets sequences tile without re-labelling a pivot.
function scanDegree(pivots: ZigPivot[], degree: 'minor' | 'major'): WaveLabel[] {
    return scanDegreeEx(pivots, degree).labels;
}

// Same scan, but also returns the accepted pivot windows so the caller can
// subdivide each labelled leg into its inner waves.
function scanDegreeEx(pivots: ZigPivot[], degree: 'minor' | 'major'): { labels: WaveLabel[]; windows: Array<{ from: number; to: number; lfrom: number; lto: number }> } {
    const out: WaveLabel[] = [];
    const windows: Array<{ from: number; to: number; lfrom: number; lto: number }> = [];
    const used = new Set<number>();
    const boundary = new Set<number>();
    let i = 0;
    const winOK = (k: number): boolean => {
        if (i + k > pivots.length) return false;
        if (used.has(i) && !boundary.has(i)) return false;
        for (let j = i + 1; j < i + k; j++) if (used.has(j)) return false;
        return true;
    };
    const consume = (k: number, labels: WaveLabel[]): void => {
        for (let j = i; j < i + k; j++) used.add(j);
        boundary.add(i + k - 1);
        const lfrom = out.length;
        out.push(...labels);
        windows.push({ from: i, to: i + k - 1, lfrom, lto: out.length });
        i += k - 1;
    };
    while (i < pivots.length) {
        let matched = false;
        if (winOK(6)) {
            const w = pivots.slice(i, i + 6);
            const motive = labelImpulse(w, degree) ?? labelDiagonal(w, degree);
            // Same pivots can read as a correction too (e.g. waves 1-2 doubling
            // as legs A-B): report it as an alternate, never pretending a
            // single certain count. Alternates share bars, so they are pushed
            // without consuming or marking anything.
            const alt = labelCorrectionQuad(pivots.slice(i, i + 4), degree);
            if (motive) {
                consume(6, motive);
                matched = true;
                if (alt) {
                    for (const l of alt) out.push({ ...l, alternate: true });
                }
            }
        }
        if (!matched && winOK(4)) {
            const corr = labelCorrectionQuad(pivots.slice(i, i + 4), degree);
            if (corr) {
                consume(4, corr);
                matched = true;
            }
        }
        if (!matched) i += 1;
    }
    return { labels: out, windows };
}

// Inner (minute) waves: subdivide every labelled minor leg at a finer
// sensitivity and number what validates inside it (i-ii-iii-iv-v / a-b-c).
// Inner counts, descending level by level below the parent scan. Guards keep it
// honest and terminating: a leg needs 10+ bars, the local sensitivity must come
// out strictly finer than the parent's (so the descent stops on its own rather
// than relying on a depth flag), labels stay inside the leg, and any bar
// already labelled at a higher degree wins over an inner one.
type Glyph = Record<string, string>;

// `base` is the global bar index of highs[0]: everything inside works on
// local indices into the arrays it was given, while every emitted label and
// every used-bar check uses global indices so the levels cannot collide.
function descendLevel(
    highs: number[],
    lows: number[],
    closes: number[],
    pivots: ZigPivot[],
    windows: Array<{ from: number; to: number; lfrom: number; lto: number }>,
    parentDev: number,
    usedBars: Set<number>,
    degree: 'sub' | 'deep',
    glyph: Glyph,
    depthLeft: number,
    base: number,
): WaveLabel[] {
    const out: WaveLabel[] = [];
    for (const w of windows) {
        for (let j = w.from; j < w.to; j++) {
            const l0 = pivots[j].index;
            const l1 = pivots[j + 1].index;
            if (!(l1 - l0 >= 10)) continue;
            const g0 = base + l0;
            const g1 = base + l1;
            const sh = highs.slice(l0, l1 + 1);
            const sl = lows.slice(l0, l1 + 1);
            const sc = closes.slice(l0, l1 + 1);
            const innerDev = autoDevPct(sh, sl, sc);
            // Sensitivity must tighten, or this is not a finer degree at all.
            if (!(innerDev < parentDev)) continue;
            const sp = zigzag(sh, sl, sc, innerDev);
            if (sp.length < 4) continue;
            const scan = scanDegreeEx(sp, 'minor');
            for (const sw of scan.windows) {
                // One inner match is emitted whole or not at all: a label may sit
                // on the leg's own endpoints (shared with the parent glyph, which
                // wins the draw), but never on another labelled bar — a partial
                // count (e.g. "a b" with "c" taken) reads broken.
                const group = scan.labels.slice(sw.lfrom, sw.lto).map((l) => ({
                    ...l,
                    label: glyph[l.label] ?? l.label,
                    index: g0 + l.index,
                    degree,
                }));
                if (group.length === 0) continue;
                const ok = group.every((l) => l.index >= g0 && l.index <= g1 &&
                    (!usedBars.has(l.index) || l.index === g0 || l.index === g1));
                if (!ok) continue;
                group.forEach((l) => usedBars.add(l.index));
                out.push(...group);
            }
            // One more level down inside this same leg, at the new sensitivity.
            if (depthLeft > 0 && scan.windows.length > 0) {
                out.push(...descendLevel(sh, sl, sc, sp, scan.windows, innerDev, usedBars, 'deep', DEEP_GLYPH, depthLeft - 1, g0));
            }
        }
    }
    return out;
}

// Full pipeline: candles in, numbered waves out. Pass devPct to force a
// threshold, leave it blank to derive one from the data (auto). Labels two
// degrees at once: the minor count from the working zigzag, plus a major
// count from a ~2.75x coarser zigzag, so a sustained trend reads as one big
// I-II-III-IV-V even where its inner swings are too choppy for a clean
// minor count. Major glyphs use degree notation (I..V, (A)..(C)).
// Each labelled leg then descends into its inner counts — minute (i-v / a-c)
// and minuette ((1)-(5) / (a)-(c)) — for four readable degrees in all.
export function elliottWaveLabels(highs: number[], lows: number[], closes: number[], devPct?: number): WaveLabel[] {
    const dev = devPct ?? autoDevPct(highs, lows, closes);
    const pivots = zigzag(highs, lows, closes, dev);
    const { labels: minor, windows } = scanDegreeEx(pivots, 'minor');
    const usedBars = new Set<number>(minor.map((l) => l.index));
    const coarseDev = Math.min(8, dev * 2.75);
    let major: WaveLabel[] = [];
    if (coarseDev > dev) {
        const coarse = zigzag(highs, lows, closes, coarseDev);
        if (coarse.length >= 6) {
            major = scanDegree(coarse, 'major');
            major.forEach((l) => usedBars.add(l.index));
        }
    }
    const inner = descendLevel(highs, lows, closes, pivots, windows, dev, usedBars, 'sub', SUB_GLYPH, 1, 0);
    return [...minor, ...major, ...inner];
}

export function elliottWavesFull(pivots: ZigPivot[]): WaveLabel[] {
    return scanDegree(pivots, 'minor');
}

// Marker for one labelled pivot. Minor glyphs pin to the exact swing extreme
// (atPriceTop/atPriceBottom + price); major-degree glyphs float above/below
// the bar at a larger size. Sub-degree (inner) glyphs pin exact at the same
// readable size as minor — letter case (a vs A) tells the degrees apart.
export const ELLIOTT_ENGINE_VERSION = '2.1.0';

export type ElliottMarker<TimeType> = {
    time: TimeType;
    position: 'aboveBar' | 'belowBar' | 'atPriceTop' | 'atPriceBottom';
    price?: number;
    color: string;
    shape: 'circle';
    size: number;
    text: string;
};

// Labels in, chart markers out. Labels are pivots, so consecutive structures
// can share a pivot and a chart can end up with two markers on one bar; the
// library keys markers by time and drops the rest. Primaries win the draw;
// an alternate count on an already-labelled bar is merged into that marker's
// text ("2 or B"), mirroring how analysts write "(ii) or (B)".
export function elliottMarkers(
    labels: WaveLabel[],
    times: (number | string)[],
    color: string,
    correctiveColor: string,
): ElliottMarker<number | string>[] {
    const corrective = new Set(['A', 'B', 'C', '(A)', '(B)', '(C)', 'a', 'b', 'c']);
    const seen = new Set<number | string>();
    const byTime = new Map<number | string, ElliottMarker<number | string>>();
    const out: ElliottMarker<number | string>[] = [];
    for (const l of labels) {
        const time = times[l.index];
        if (time == null) continue;
        const c = corrective.has(l.label) ? correctiveColor : color;
        const existing = byTime.get(time);
        if (existing !== undefined) {
            if (l.alternate && !existing.text.split(' or ').includes(l.label)) {
                existing.text += ' or ' + l.label;
            }
            seen.add(time);
            continue;
        }
        seen.add(time);
        let marker: ElliottMarker<number | string>;
        if (l.degree === 'major') {
            marker = { time, position: l.position === 'aboveBar' ? 'aboveBar' : 'belowBar', color: c, shape: 'circle', size: 3, text: l.label };
        } else if (l.degree === 'sub') {
            marker = { time, position: l.position === 'aboveBar' ? 'atPriceTop' : 'atPriceBottom', price: l.price, color: c, shape: 'circle', size: 2, text: l.label };
        } else {
            marker = { time, position: l.position === 'aboveBar' ? 'atPriceTop' : 'atPriceBottom', price: l.price, color: c, shape: 'circle', size: 2, text: l.label };
        }
        byTime.set(time, marker);
        out.push(marker);
    }
    return out;
}

// Commodity Channel Index. TP = (H+L+C)/3, CCI = (TP - SMA) / (0.015 * mean deviation).
export function cci(highs: number[], lows: number[], closes: number[], period = 20): (number | null)[] {
    const out: (number | null)[] = new Array(closes.length).fill(null);
    if (closes.length < period || period < 1) return out;
    const tp = closes.map((c, i) => (highs[i] + lows[i] + c) / 3);
    for (let i = period - 1; i < closes.length; i++) {
        let sum = 0;
        for (let j = i - period + 1; j <= i; j++) sum += tp[j];
        const mean = sum / period;
        let dev = 0;
        for (let j = i - period + 1; j <= i; j++) dev += Math.abs(tp[j] - mean);
        dev /= period;
        out[i] = dev === 0 ? 0 : (tp[i] - mean) / (0.015 * dev);
    }
    return out;
}

export type Stochastic = { k: (number | null)[]; d: (number | null)[] };

// Stochastic oscillator: %K over the rolling high/low window, %D = SMA of %K.
export function stochastic(
    highs: number[],
    lows: number[],
    closes: number[],
    kPeriod = 14,
    dPeriod = 3,
): Stochastic {
    const k: (number | null)[] = new Array(closes.length).fill(null);
    const d: (number | null)[] = new Array(closes.length).fill(null);
    if (closes.length < 1 || kPeriod < 1 || dPeriod < 1) return { k, d };
    for (let i = 0; i < closes.length; i++) {
        if (i < kPeriod - 1) continue;
        let hh = -Infinity;
        let ll = Infinity;
        for (let j = i - kPeriod + 1; j <= i; j++) {
            if (highs[j] > hh) hh = highs[j];
            if (lows[j] < ll) ll = lows[j];
        }
        k[i] = hh === ll ? null : ((closes[i] - ll) / (hh - ll)) * 100;
        if (i >= kPeriod - 1 + dPeriod - 1) {
            let sum = 0;
            let ok = true;
            for (let j = i - dPeriod + 1; j <= i; j++) {
                if (k[j] == null) { ok = false; break; }
                sum += k[j] as number;
            }
            d[i] = ok ? sum / dPeriod : null;
        }
    }
    return { k, d };
}

export type Adx = { adx: (number | null)[]; plusDI: (number | null)[]; minusDI: (number | null)[] };

// Average Directional Index with Wilder smoothing.
export function adx(highs: number[], lows: number[], closes: number[], period = 14): Adx {
    const n = closes.length;
    const out: Adx = {
        adx: new Array(n).fill(null),
        plusDI: new Array(n).fill(null),
        minusDI: new Array(n).fill(null),
    };
    if (n <= 2 * period || period < 1) return out;
    const tr: number[] = new Array(n).fill(0);
    const plusDM: number[] = new Array(n).fill(0);
    const minusDM: number[] = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
        const up = highs[i] - highs[i - 1];
        const down = lows[i - 1] - lows[i];
        plusDM[i] = up > down && up > 0 ? up : 0;
        minusDM[i] = down > up && down > 0 ? down : 0;
        tr[i] = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
    }
    const smooth = (arr: number[]) => {
        const s = new Array(n).fill(0);
        let acc = 0;
        for (let i = 1; i <= period; i++) acc += arr[i];
        s[period] = acc;
        for (let i = period + 1; i < n; i++) s[i] = s[i - 1] - s[i - 1] / period + arr[i];
        return s;
    };
    const sTR = smooth(tr);
    const sPlus = smooth(plusDM);
    const sMinus = smooth(minusDM);
    const dx = new Array(n).fill(0);
    for (let i = period; i < n; i++) {
        const plus = sTR[i] === 0 ? 0 : (100 * sPlus[i]) / sTR[i];
        const minus = sTR[i] === 0 ? 0 : (100 * sMinus[i]) / sTR[i];
        out.plusDI[i] = plus;
        out.minusDI[i] = minus;
        dx[i] = plus + minus === 0 ? 0 : (100 * Math.abs(plus - minus)) / (plus + minus);
    }
    let acc = 0;
    for (let i = period + 1; i <= 2 * period; i++) acc += dx[i];
    let prevAdx = acc / period;
    out.adx[2 * period] = prevAdx;
    for (let i = 2 * period + 1; i < n; i++) {
        prevAdx = (prevAdx * (period - 1) + dx[i]) / period;
        out.adx[i] = prevAdx;
    }
    return out;
}
