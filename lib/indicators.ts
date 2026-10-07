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
    return pivots.filter((p, i) => i === 0 || p.index !== pivots[i - 1].index);
}

export type WaveLabel = { index: number; label: string; position: 'aboveBar' | 'belowBar' };

const atPivot = (p: ZigPivot, label: string): WaveLabel => ({
    index: p.index,
    label,
    position: p.type === 'high' ? 'aboveBar' : 'belowBar',
});

// Validate one 6-pivot impulse and label it 1-5 (or null when a rule breaks).
function labelImpulse(pts: ZigPivot[]): WaveLabel[] | null {
    if (pts.length < 6) return null;
    const [p0, p1, p2, p3, p4, p5] = pts;
    // Pivots must strictly alternate — zigzag ratchets can repeat a side
    const tys = [p0, p1, p2, p3, p4, p5].map((p) => p.type);
    if (!tys.every((t, i) => i === 0 || t !== tys[i - 1])) return null;
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
    return [atPivot(p1, '1'), atPivot(p2, '2'), atPivot(p3, '3'), atPivot(p4, '4'), atPivot(p5, '5')];
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
