// Setup scanner: rank Tadawul stocks by technical strength from daily candles.
// A screen, not a prediction: these are setups matching momentum/oversold/
// breakout criteria, not financial advice.

import { adx, macd, rsi, sma, stochastic } from '@/lib/indicators';

export type SetupSignal =
    | 'oversold' // RSI(14) < 30: washed-out bounce watch
    | 'macd-cross' // MACD histogram flipped positive: fresh momentum
    | 'uptrend' // Close > SMA20 > SMA50: aligned trend
    | 'stoch-cross' // %K crossed above %D: short-term turn
    | 'breakout' // Within 2% of the 52-week high
    | 'volume-surge'; // Today > 2x the 20-day average volume

export const SIGNAL_LABELS: Record<SetupSignal, { en: string; ar: string }> = {
    oversold: { en: 'Oversold', ar: 'تشبع بيعي' },
    'macd-cross': { en: 'MACD cross', ar: 'تقاطع MACD' },
    uptrend: { en: 'Uptrend', ar: 'ترند صاعد' },
    'stoch-cross': { en: 'Stoch cross', ar: 'تقاطع ستوكاستك' },
    breakout: { en: 'Near high', ar: 'قرب القمة' },
    'volume-surge': { en: 'Volume surge', ar: 'سيولة عالية' },
};

export type SetupScore = {
    signals: SetupSignal[];
    score: number;
    rsi: number | null;
    price: number;
    changePercent: number;
    volumeRatio: number | null;
};

// Validate an RSI band from URL params. Returns [lo, hi] or null when absent/invalid.
// Lives here (not in screener.actions.ts) because Server Actions files may only
// export async functions.
export function parseBand(rawMin: unknown, rawMax: unknown): [number, number] | null {
    if (rawMin == null || rawMax == null || rawMin === '' || rawMax === '') return null;
    const lo = Number(rawMin);
    const hi = Number(rawMax);
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
    if (lo < 0 || hi > 100 || lo >= hi) return null;
    return [lo, hi];
}

export function scoreSetup(
    closes: number[],
    highs: number[],
    lows: number[],
    volumes: number[],
): SetupScore | null {
    if (closes.length < 60) return null;
    const last = (a: (number | null)[]) => a[a.length - 1];
    const prev = (a: (number | null)[]) => a[a.length - 2];

    const rsiArr = rsi(closes, 14);
    const m = macd(closes, 12, 26, 9);
    const s = stochastic(highs, lows, closes, 14, 3);
    const sma20 = sma(closes, 20);
    const sma50 = sma(closes, 50);

    const price = closes[closes.length - 1];
    const prevClose = closes[closes.length - 2];
    const rsiLast = last(rsiArr);
    const volAvg = volumes.slice(-21, -1).reduce((a, b) => a + b, 0) / Math.min(20, volumes.length - 1);
    const volRatio = volAvg > 0 ? volumes[volumes.length - 1] / volAvg : null;
    const high52 = Math.max(...closes.slice(-250));

    const signals: SetupSignal[] = [];
    if (rsiLast != null && rsiLast < 30) signals.push('oversold');
    const h0 = last(m.map((p) => p.hist));
    const h1 = prev(m.map((p) => p.hist));
    if (h0 != null && h1 != null && h1 <= 0 && h0 > 0) signals.push('macd-cross');
    const s20 = last(sma20);
    const s50 = last(sma50);
    if (s20 != null && s50 != null && price > s20 && s20 > s50) signals.push('uptrend');
    const k0 = last(s.k);
    const k1 = prev(s.k);
    const d0 = last(s.d);
    const d1 = prev(s.d);
    if (k0 != null && k1 != null && d0 != null && d1 != null && k1 <= d1 && k0 > d0) signals.push('stoch-cross');
    if (high52 > 0 && (high52 - price) / high52 < 0.02) signals.push('breakout');
    if (volRatio != null && volRatio > 2) signals.push('volume-surge');

    return {
        signals,
        score: signals.length,
        rsi: rsiLast,
        price,
        changePercent: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
        volumeRatio: volRatio,
    };
}
