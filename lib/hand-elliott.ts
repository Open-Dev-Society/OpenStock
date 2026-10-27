// A "reader's own" Elliott count on a fine zigzag (3%): the longest valid
// structure that reaches the live edge, plus the move still forming.
//
// It is deliberately separate from the strict engine in indicators.ts: the
// engine scans every rule-valid window, this one picks the single most
// meaningful recent structure — the way a chart is read by hand.
//
// Iron rules are still enforced on every window that can be drawn:
//   impulse 1-5 : wave 2 holds the start, wave 3 exceeds wave 1, wave 4 does
//                  not overlap wave 1, wave 3 is never the shortest
//   impulse 1-4 : the same checks on the confirmed waves
//   A-B-C       : B retraces 10-100% of A, C takes out A (classic) or runs
// If nothing validates, nothing is drawn (no forced labels).

import { zigzag, type ZigPivot } from './indicators';

export type HandWaveLabel = {
    index: number;
    price: number;
    label: string;
    position: 'aboveBar' | 'belowBar';
    kind: 'impulse' | 'abc';
};

export type HandCount = {
    prev: HandWaveLabel[];
    live: HandWaveLabel[];
    dev: number;
    flags: string[];
};

const DEV = 3;             // fine zigzag: 3-5% legs still count as swings
const WINDOW = 110;         // bars of history the count may reach back into
const MAX_LIVE = 3;         // A-B-C or 1-2-3 in the live structure

const dir = (a: number, b: number): number => (b > a ? 1 : -1);

function alternating(seq: ZigPivot[]): boolean {
    for (let i = 1; i < seq.length; i++) if (seq[i].type === seq[i - 1].type) return false;
    return true;
}

function impulse5(seq: ZigPivot[]): boolean {
    if (seq.length < 6 || !alternating(seq)) return false;
    const d = dir(seq[0].price, seq[1].price);
    if (d > 0) {
        if (seq[2].price <= seq[0].price) return false;   // wave 2 holds the start
        if (seq[3].price <= seq[1].price) return false;   // wave 3 exceeds wave 1
        if (seq[4].price <= seq[1].price) return false;   // wave 4 no overlap
    } else {
        if (seq[2].price >= seq[0].price) return false;
        if (seq[3].price >= seq[1].price) return false;
        if (seq[4].price >= seq[1].price) return false;
    }
    const l1 = Math.abs(seq[1].price - seq[0].price);
    const l3 = Math.abs(seq[3].price - seq[2].price);
    const l5 = Math.abs(seq[5].price - seq[4].price);
    return l3 >= Math.min(l1, l5);                        // wave 3 never the shortest
}

function impulse4(seq: ZigPivot[]): boolean {
    if (seq.length < 5 || !alternating(seq)) return false;
    const d = dir(seq[0].price, seq[1].price);
    if (d > 0) {
        if (seq[2].price <= seq[0].price) return false;
        if (seq[3].price <= seq[1].price) return false;
        if (seq[4].price <= seq[1].price) return false;
    } else {
        if (seq[2].price >= seq[0].price) return false;
        if (seq[3].price >= seq[1].price) return false;
        if (seq[4].price >= seq[1].price) return false;
    }
    const l1 = Math.abs(seq[1].price - seq[0].price);
    const l3 = Math.abs(seq[3].price - seq[2].price);
    return l3 > l1;
}

function abc4(seq: ZigPivot[]): boolean {
    if (seq.length < 4 || !alternating(seq)) return false;
    const d = dir(seq[0].price, seq[1].price);
    if (dir(seq[1].price, seq[2].price) === d) return false;
    const aLen = Math.abs(seq[1].price - seq[0].price);
    const rb = aLen > 0 ? Math.abs(seq[2].price - seq[1].price) / aLen : 0;
    if (rb < 0.1 || rb > 1) return false;
    if (dir(seq[2].price, seq[3].price) !== d) return false;
    const classic = d > 0 ? seq[3].price > seq[1].price : seq[3].price < seq[1].price;
    const cLen = Math.abs(seq[3].price - seq[2].price);
    const bLen = Math.abs(seq[2].price - seq[1].price);
    return classic || (bLen > 0 && cLen >= 0.1 * bLen);
}

export function handCount(
    highs: number[],
    lows: number[],
    closes: number[],
    opts: { dev?: number; window?: number; marketOpen?: boolean } = {},
): HandCount | null {
    const dev = opts.dev ?? DEV;
    const window = opts.window ?? WINDOW;
    const n = closes.length;
    if (n < 6) return null;

    const mp = zigzag(highs, lows, closes, dev);
    // while the market is open the last bar is still forming: its extreme is a
    // running value, not a confirmed pivot
    const confirmed = opts.marketOpen ? mp.filter((p) => p.index < n - 1) : mp;
    if (confirmed.length < 3) return null;

    let recent = confirmed.filter((p) => p.index >= n - window);
    if (recent.length < 4) recent = confirmed.slice(-4);
    if (recent.length < 3) return null;

    type Cand = { kind: 'impulse' | 'impulse4' | 'abc'; seq: ZigPivot[]; labels: string[] };
    const cands: Cand[] = [];
    for (let s = 0; s + 5 < recent.length; s++) {
        const seq = recent.slice(s, s + 6);
        if (impulse5(seq)) cands.push({ kind: 'impulse', seq, labels: ['1', '2', '3', '4', '5'] });
    }
    for (let s = 0; s + 4 < recent.length; s++) {
        const seq = recent.slice(s, s + 5);
        if (impulse4(seq)) cands.push({ kind: 'impulse4', seq, labels: ['1', '2', '3', '4'] });
    }
    for (let s = 0; s + 3 < recent.length; s++) {
        const seq = recent.slice(s, s + 4);
        if (abc4(seq)) cands.push({ kind: 'abc', seq, labels: ['A', 'B', 'C'] });
    }
    if (!cands.length) return null;

    const liveKindOf = (k: Cand['kind']): 'imp' | 'abc' => (k === 'abc' ? 'imp' : 'abc');

    // longest valid prefix of the live structure
    const livePrefix = (after: ZigPivot[], base: ZigPivot, liveKind: 'imp' | 'abc'): ZigPivot[] => {
        for (let k = Math.min(MAX_LIVE, after.length); k >= 1; k--) {
            const sub = after.slice(0, k);
            let ok = true;
            if (liveKind === 'imp') {
                if (k >= 2) {
                    if (sub[1].price <= base.price) ok = false;
                    let lo = Infinity;
                    for (let i = sub[0].index; i <= sub[1].index; i++) lo = Math.min(lo, lows[i]);
                    if (lo <= base.price) ok = false;
                }
                if (k >= 3 && sub[2].price <= sub[0].price) ok = false;
            } else if (k >= 2) {
                const aLen = Math.abs(sub[0].price - base.price);
                const rb = aLen > 0 ? Math.abs(sub[1].price - sub[0].price) / aLen : 0;
                if (rb < 0.1 || rb > 1) ok = false;
            }
            if (ok) return sub;
        }
        return [];
    };

    const coverage = (c: Cand): [number, number] => {
        const after = confirmed.filter((p) => p.index > c.seq[c.seq.length - 1].index);
        const pref = livePrefix(after, c.seq[c.seq.length - 1], liveKindOf(c.kind));
        return [pref.length ? pref[pref.length - 1].index : c.seq[c.seq.length - 1].index, pref.length];
    };

    cands.sort((a, b) => {
        const ca = coverage(a); const cb = coverage(b);
        if (cb[0] !== ca[0]) return cb[0] - ca[0];
        if (cb[1] !== ca[1]) return cb[1] - ca[1];
        return b.seq[b.seq.length - 1].index - a.seq[a.seq.length - 1].index;
    });
    const pick = cands[0];

    const base = pick.seq[pick.seq.length - 1];
    const prev: HandWaveLabel[] = pick.labels.map((lab, i) => {
        const p = pick.seq[i + 1];
        return { index: p.index, price: p.price, label: lab, position: p.type === 'low' ? 'aboveBar' : 'belowBar', kind: pick.kind === 'abc' ? 'abc' : 'impulse' };
    });

    const liveKind = liveKindOf(pick.kind);
    const liveLabels = liveKind === 'imp' ? ['1', '2', '3'] : ['A', 'B', 'C'];
    const after = confirmed.filter((p) => p.index > base.index);
    const pref = livePrefix(after, base, liveKind);
    const live: HandWaveLabel[] = pref.map((p, i) => ({
        index: p.index, price: p.price, label: liveLabels[i] ?? '?',
        position: p.type === 'low' ? 'aboveBar' : 'belowBar', kind: liveKind === 'imp' ? 'impulse' : 'abc',
    }));
    if (live.length) {
        // a wave that ends on the last bar is still forming -> '?'
        if (live[live.length - 1].index >= n - 1) live[live.length - 1] = { ...live[live.length - 1], label: live[live.length - 1].label + '?' };
        else if (live[live.length - 1].label.endsWith('?')) {
            // already marked
        } else {
            live[live.length - 1] = { ...live[live.length - 1], label: live[live.length - 1].label + '?' };
        }
    } else {
        // no confirmed live wave yet: the first wave is forming
        const dirUp = highs[n - 1] >= base.price;
        let price = closes[n - 1];
        let index = n - 1;
        if (dirUp) {
            price = highs[n - 1];
            for (let i = base.index; i < n; i++) if (highs[i] > price) { price = highs[i]; index = i; }
        } else {
            price = lows[n - 1];
            for (let i = base.index; i < n; i++) if (lows[i] < price) { price = lows[i]; index = i; }
        }
        live.push({ index, price, label: (liveKind === 'imp' ? '1?' : 'A?'), position: dirUp ? 'belowBar' : 'aboveBar', kind: liveKind === 'imp' ? 'impulse' : 'abc' });
    }

    return { prev, live, dev, flags: [] };
}

// Markers for the hand count: square badges in their own colour so the layer is
// readable next to the engine's circles.
export function handCountMarkers(
    hand: HandCount,
    times: (number | string)[],
    color: string,
    priceOffset = 0,
    size = 2,
): { time: number | string; position: 'aboveBar' | 'belowBar' | 'atPriceTop' | 'atPriceBottom'; price?: number; shape: 'square' | 'circle'; size: number; text: string }[] {
    const out: { time: number | string; position: 'aboveBar' | 'belowBar' | 'atPriceTop' | 'atPriceBottom'; price?: number; shape: 'square' | 'circle'; size: number; text: string }[] = [];
    for (const l of [...hand.prev, ...hand.live]) {
        const time = times[l.index];
        if (time == null) continue;
        const above = l.position === 'aboveBar';
        out.push({
            time,
            position: above ? 'atPriceTop' : 'atPriceBottom',
            price: l.price + (above ? priceOffset : -priceOffset),
            shape: 'square',
            size,
            text: l.label,
            color,
        } as never);
    }
    return out;
}
