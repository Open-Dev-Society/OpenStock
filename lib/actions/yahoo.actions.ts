'use server';

import {
    CandleRangeId,
    CANDLE_RANGES,
    YahooDailyQuote,
    buildYahooUrl,
    dailyQuoteFromCandles,
    normalizeYahooSymbol,
    parseYahooChart,
    resampleDaily,
    resampleMonthly,
    resampleWeekly,
    sessionMove,
} from '@/lib/yahoo';

// Daily/weekly Tadawul candles from Yahoo Finance (free, no key, covers .SR).
// Cached 15 minutes in the Next data cache, shared across users.
export async function getTadawulCandles(symbol: string, rangeId: CandleRangeId = 'D') {
    const yahooSymbol = normalizeYahooSymbol(symbol);
    if (!yahooSymbol) return null;
    // Index history (year-ranges return one point; max/monthly has a 2023-2026
    // gap), so rebuild D/W/M bars from 2 years of hourly candles instead.
    const resample = yahooSymbol.startsWith('^') && (rangeId === 'D' || rangeId === 'W' || rangeId === 'M');
    const fetchRange: CandleRangeId = resample ? '1H' : rangeId;
    const intraday = CANDLE_RANGES[fetchRange]?.intraday ?? false;
    try {
        const res = await fetch(buildYahooUrl(yahooSymbol, fetchRange), {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            next: { revalidate: intraday ? 60 : 900 },
        });
        if (!res.ok) {
            console.error('Yahoo chart failed', yahooSymbol, rangeId, res.status);
            return null;
        }
        const parsed = parseYahooChart(await res.json(), intraday);
        if (!parsed) return null;
        // Hourly bars come back with unix times; resample down to the requested frame.
        const candles = !resample
            ? parsed.candles
            : rangeId === 'D'
                ? resampleDaily(parsed.candles)
                : rangeId === 'W'
                    ? resampleWeekly(parsed.candles)
                    : resampleMonthly(parsed.candles);
        if (candles.length === 0) return null;
        return { candles, currency: parsed.currency, name: parsed.name };
    } catch (e) {
        console.error('Yahoo chart error', yahooSymbol, e);
        return null;
    }
}

// Bulk daily quotes for dashboard tiles/tables. One chart call per symbol
// (Yahoo has no batch quote endpoint without login); shared 5-minute cache,
// so the whole dashboard costs ~17 requests every 5 minutes, not per user.
export async function getYahooDailyQuotes(symbols: string[]): Promise<Record<string, YahooDailyQuote>> {
    const entries = await Promise.all(
        symbols.map(async (symbol) => {
            const yahooSymbol = normalizeYahooSymbol(symbol);
            if (!yahooSymbol) return [symbol, null] as const;
            try {
                const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=5d`;
                const res = await fetch(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    next: { revalidate: 300 },
                });
                if (!res.ok) return [symbol, null] as const;
                const parsed = parseYahooChart(await res.json());
                if (!parsed) return [symbol, null] as const;
                return [symbol, dailyQuoteFromCandles(parsed.candles, parsed.currency, parsed.name)] as const;
            } catch (e) {
                console.error('Yahoo daily quote error', symbol, e);
                return [symbol, null] as const;
            }
        }),
    );
    return Object.fromEntries(entries.filter(([, q]) => q)) as Record<string, YahooDailyQuote>;
}

// Live session prices for a handful of symbols (1-minute candles, shared 60s
// cache). Powers auto-refreshing screener rows without re-running the scan.
export async function getIntradayLast(symbols: string[]): Promise<Record<string, { price: number; changePercent: number }>> {
    const entries = await Promise.all(
        symbols.map(async (symbol) => {
            const yahooSymbol = normalizeYahooSymbol(symbol);
            if (!yahooSymbol) return [symbol, null] as const;
            try {
                const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1m&range=1d`;
                const res = await fetch(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    next: { revalidate: 60 },
                });
                if (!res.ok) return [symbol, null] as const;
                const parsed = parseYahooChart(await res.json(), true);
                if (!parsed) return [symbol, null] as const;
                const move = sessionMove(parsed.candles.map((c) => c.close));
                return [symbol, move] as const;
            } catch (e) {
                console.error('Yahoo intraday error', symbol, e);
                return [symbol, null] as const;
            }
        }),
    );
    return Object.fromEntries(entries.filter(([, q]) => q)) as Record<string, { price: number; changePercent: number }>;
}
