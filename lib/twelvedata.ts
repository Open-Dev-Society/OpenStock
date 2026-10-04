// Twelve Data helpers for live Tadawul prices. Pure functions, covered by tests;
// the network calls live in lib/actions/twelvedata.actions.ts.
//
// Symbol format: Twelve uses the bare number + exchange, e.g. symbol=2222&exchange=Tadawul.
// Plan note: Tadawul real-time needs a Pro plan; free keys only cover trial symbols (e.g. 7203).

import type { OhlcCandle } from '@/lib/yahoo';
import type { CandleRangeId } from '@/lib/yahoo';

export const TWELVE_EXCHANGE = 'Tadawul';

// Twelve interval + size per chart timeframe (intraday only; daily+ come from Yahoo).
export const TWELVE_RANGE_MAP: Partial<Record<CandleRangeId, { interval: string; outputsize: number }>> = {
    '1m': { interval: '1min', outputsize: 2200 },
    '5m': { interval: '5min', outputsize: 800 },
    '15m': { interval: '15min', outputsize: 500 },
    '30m': { interval: '30min', outputsize: 500 },
    '1H': { interval: '1h', outputsize: 500 },
};

// "2222.SR" or "TADAWUL:2222" -> "2222". Anything else -> null.
export function twelveSymbol(symbol: string): string | null {
    const upper = (symbol || '').trim().toUpperCase();
    const m = upper.match(/^(\d+)\.SR$/) || upper.match(/^TADAWUL:(\d+)$/);
    return m ? m[1] : null;
}

export type TwelveQuote = {
    price: number;
    change: number;
    changePercent: number;
    currency: string;
    exchange: string;
};

// "2026-10-01 15:00:00" in Asia/Riyadh (UTC+3, no DST) -> unix seconds.
export function riyadhToUnix(datetime: string): number | null {
    const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(datetime || '');
    if (!m) return null;
    const [, y, mo, d, h, mi, s] = m.map(Number);
    return Math.floor(Date.UTC(y, mo - 1, d, h, mi, s) / 1000) - 3 * 3600;
}

type TwelveSeriesJson = {
    status?: string;
    code?: number;
    message?: string;
    meta?: { currency?: string };
    values?: Array<{
        datetime?: string;
        open?: string;
        high?: string;
        low?: string;
        close?: string;
        volume?: string;
    }>;
};

// Twelve returns newest-first; we normalize to oldest-first candles.
export function parseTwelveSeries(json: unknown): { candles: OhlcCandle[]; currency: string } | null {
    const data = json as TwelveSeriesJson;
    if (!data || data.status !== 'ok' || !Array.isArray(data.values)) return null;
    const candles: OhlcCandle[] = [];
    for (const v of data.values) {
        const t = riyadhToUnix(v.datetime || '');
        const open = Number(v.open);
        const high = Number(v.high);
        const low = Number(v.low);
        const close = Number(v.close);
        if (t == null || [open, high, low, close].some((n) => !Number.isFinite(n))) continue;
        candles.push({ time: t, open, high, low, close, volume: Number(v.volume) || 0 });
    }
    if (candles.length === 0) return null;
    candles.reverse();
    return { candles, currency: data.meta?.currency || 'SAR' };
}

export function parseTwelveQuote(json: unknown): TwelveQuote | null {
    const q = json as Record<string, unknown> | null;
    if (!q || typeof q !== 'object' || (q as { status?: string }).status === 'error') return null;
    const price = Number((q as { close?: string; price?: string }).close ?? (q as { price?: string }).price);
    if (!Number.isFinite(price)) return null;
    return {
        price,
        change: Number((q as { change?: string }).change) || 0,
        changePercent: Number((q as { percent_change?: string }).percent_change) || 0,
        currency: String((q as { currency?: string }).currency || 'SAR'),
        exchange: String((q as { exchange?: string }).exchange || TWELVE_EXCHANGE),
    };
}

// Plan-locked responses ("available starting with the Pro or Venture plan") are
// cached client-side per symbol so we stop spending quota on them.
export const isPlanLocked = (json: unknown) =>
    (json as { code?: number; message?: string })?.code === 404 &&
    /pro or venture plan/i.test(String((json as { message?: string }).message || ''));
