// Yahoo Finance helpers for Tadawul (.SR) candles. Pure functions, covered by tests;
// the network call lives in lib/actions/yahoo.actions.ts.

export type CandleRangeId = '1m' | '5m' | '15m' | '30m' | '1H' | 'D' | 'W' | 'M';

export const CANDLE_RANGES: Record<CandleRangeId, { range: string; interval: string; label: string; labelAr: string; intraday?: boolean }> = {    '1m': { range: '7d', interval: '1m', label: '1m', labelAr: '1د', intraday: true },
    '5m': { range: '1mo', interval: '5m', label: '5m', labelAr: '5د', intraday: true },
    '15m': { range: '1mo', interval: '15m', label: '15m', labelAr: '15د', intraday: true },
    '30m': { range: '1mo', interval: '30m', label: '30m', labelAr: '30د', intraday: true },
    '1H': { range: '2y', interval: '1h', label: '1H', labelAr: '1س', intraday: true },
    'D': { range: '1y', interval: '1d', label: 'D', labelAr: 'يوم' },
    'W': { range: '5y', interval: '1wk', label: 'W', labelAr: 'أسبوع' },
    'M': { range: 'max', interval: '1mo', label: 'M', labelAr: 'شهر' },
};

export const isCandleRangeId = (v: unknown): v is CandleRangeId =>
    typeof v === 'string' && (CANDLE_RANGES as Record<string, unknown>)[v] !== undefined;

export type OhlcCandle = {
    time: string | number; // YYYY-MM-DD for daily/weekly, unix seconds for intraday
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
};

// "2222.SR" or "TADAWUL:2222" -> "2222.SR". TASI index -> "^TASI.SR". Anything else -> null.
export function normalizeYahooSymbol(symbol: string): string | null {
    const upper = (symbol || '').trim().toUpperCase();
    if (/^\d+\.SR$/.test(upper)) return upper;
    if (upper === 'TADAWUL:TASI' || upper === 'TASI' || upper === '^TASI.SR') return '^TASI.SR';
    if (upper.startsWith('TADAWUL:')) {
        const ticker = upper.slice('TADAWUL:'.length);
        if (/^\d+$/.test(ticker)) return `${ticker}.SR`;
    }
    return null;
}

export type YahooDailyQuote = {
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    currency: string;
    name: string;
};

// Session move from minute candles: last price vs first price of the day.
// Used for live screener rows (daily closes don't move intraday).
export function sessionMove(closes: number[]): { price: number; changePercent: number } | null {
    const valid = closes.filter((n) => Number.isFinite(n));
    if (valid.length === 0) return null;
    const first = valid[0];
    const price = valid[valid.length - 1];
    return { price, changePercent: first ? ((price - first) / first) * 100 : 0 };
}

// Last two daily closes -> today's quote. Shared by pulse tiles, movers and tables.
export function dailyQuoteFromCandles(
    candles: OhlcCandle[],
    currency = 'SAR',
    name = '',
): YahooDailyQuote | null {
    const closes = candles.map((c) => c.close).filter((n) => Number.isFinite(n));
    if (closes.length === 0) return null;
    const price = closes[closes.length - 1];
    const prev = closes.length > 1 ? closes[closes.length - 2] : null;
    const change = prev != null ? price - prev : 0;
    return {
        price,
        change,
        changePercent: prev ? (change / prev) * 100 : 0,
        volume: candles[candles.length - 1].volume ?? 0,
        currency,
        name,
    };
}

export const isTadawulSymbol = (symbol: string) => normalizeYahooSymbol(symbol) !== null;

// lightweight-charts only accepts YYYY-MM-DD strings or finite unix seconds.
// Filter once at ingest so a bad row can never crash setData.
export function validCandles(candles: OhlcCandle[]): OhlcCandle[] {
    return candles.filter((c) =>
        typeof c.time === 'number'
            ? Number.isFinite(c.time)
            : /^\d{4}-\d{2}-\d{2}$/.test(c.time),
    );
}

// Riyadh calendar date (YYYY-MM-DD) for a unix timestamp. The Tadawul session
// (10:00-15:00 AST) never crosses midnight, so grouping is unambiguous.
export function riyadhDay(unixSeconds: number): string {
    return new Date((unixSeconds + 3 * 3600) * 1000).toISOString().slice(0, 10);
}

type Bucket = { key: string; open: number; high: number; low: number; close: number; volume: number };

function bucketize(candles: OhlcCandle[], keyOf: (unix: number, date: string) => string): OhlcCandle[] {
    const order: string[] = [];
    const map = new Map<string, Bucket>();
    for (const c of candles) {
        if (typeof c.time !== 'number') continue;
        const date = riyadhDay(c.time);
        const key = keyOf(c.time, date);
        let b = map.get(key);
        if (!b) {
            b = { key, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume };
            map.set(key, b);
            order.push(key);
        } else {
            if (c.high > b.high) b.high = c.high;
            if (c.low < b.low) b.low = c.low;
            b.close = c.close;
            b.volume += c.volume;
        }
    }
    return order.map((key) => {
        const b = map.get(key)!;
        return { time: key, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume };
    });
}

// Yahoo has no usable daily/weekly/monthly history for the TASI index
// (year-ranges return one point; max/monthly has a 2023-2026 gap), so rebuild
// larger bars from 2 years of hourly candles instead.
export const resampleDaily = (candles: OhlcCandle[]): OhlcCandle[] =>
    bucketize(candles, (_unix, date) => date);

export const resampleWeekly = (candles: OhlcCandle[]): OhlcCandle[] =>
    bucketize(candles, (_unix, date) => {
        const d = new Date(`${date}T00:00:00Z`);
        const sunday = new Date(d.getTime() - d.getUTCDay() * 86400000);
        return sunday.toISOString().slice(0, 10);
    });

export const resampleMonthly = (candles: OhlcCandle[]): OhlcCandle[] =>
    bucketize(candles, (_unix, date) => `${date.slice(0, 7)}-01`);

export function buildYahooUrl(yahooSymbol: string, rangeId: CandleRangeId): string {
    const { range, interval } = CANDLE_RANGES[rangeId] ?? CANDLE_RANGES['D'];
    return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`;
}

type YahooChartJson = {
    chart?: {
        result?: Array<{
            timestamp?: number[];
            meta?: { currency?: string; shortName?: string; longName?: string };
            indicators?: { quote?: Array<{ open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[]; volume?: (number | null)[] }> };
        }>;
    };
};

export function parseYahooChart(json: unknown, intraday = false): { candles: OhlcCandle[]; currency: string; name: string } | null {
    const result = (json as YahooChartJson)?.chart?.result?.[0];
    const timestamps = result?.timestamp;
    const quote = result?.indicators?.quote?.[0];
    if (!result || !Array.isArray(timestamps) || !quote) return null;

    const Opens = quote.open ?? [];
    const Highs = quote.high ?? [];
    const Lows = quote.low ?? [];
    const Closes = quote.close ?? [];
    const Volumes = quote.volume ?? [];

    const candles: OhlcCandle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
        const open = Opens[i];
        const high = Highs[i];
        const low = Lows[i];
        const close = Closes[i];
        if (open == null || high == null || low == null || close == null) continue;
        candles.push({
            time: intraday ? timestamps[i] : new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
            open,
            high,
            low,
            close,
            volume: Volumes[i] ?? 0,
        });
    }
    if (candles.length === 0) return null;

    return {
        candles,
        currency: result.meta?.currency || 'SAR',
        name: result.meta?.shortName || result.meta?.longName || '',
    };
}
