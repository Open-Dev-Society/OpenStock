'use server';

import {
    CandleRangeId,
    CANDLE_RANGES,
    IndexCandles,
    OhlcCandle,
    mergeProxyHistory,
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
    const isIndex = yahooSymbol.startsWith('^');
    const resample = isIndex && (rangeId === 'D' || rangeId === 'W' || rangeId === 'M');
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
        let candles: OhlcCandle[] = !resample
            ? parsed.candles
            : rangeId === 'D'
                ? resampleDaily(parsed.candles)
                : rangeId === 'W'
                    ? resampleWeekly(parsed.candles)
                    : resampleMonthly(parsed.candles);
        if (candles.length === 0) return null;
        // Hourly history caps at 2 years, so index D/W/M charts start in Oct
        // 2024. Backfill the earlier part from a Saudi-market tracker fund
        // scaled into index points (see backfillIndexHistory) so the chart and
        // the Elliott/pattern work cover the same window users see elsewhere.
        let estimatedFrom: string | undefined;
        if (isIndex) {
            const filled = await backfillIndexHistory(candles, rangeId);
            estimatedFrom = filled.estimatedFrom;
            candles = filled;
        }
        return { candles, currency: parsed.currency, name: parsed.name, estimatedFrom };
    } catch (e) {
        console.error('Yahoo chart error', yahooSymbol, e);
        return null;
    }
}

// TASI index daily bars before the hourly window, reconstructed from a Saudi
// equity tracker (KSA on Yahoo: daily history reaches far past the index's own
// hourly cap). KSA is a USD fund, so its closes are scaled by the ratio between
// real index closes and fund closes over the period where both exist — measured
// at ~1% coefficient of variation, with ~1% drift across the overlap, which is
// immaterial for swing/pivot analysis but is NOT an official index close.
// Bars are flagged so the chart can say so instead of passing them off as data.
const INDEX_PROXY_SYMBOL = 'KSA';

async function backfillIndexHistory(real: OhlcCandle[], frame: CandleRangeId): Promise<IndexCandles> {
    try {
        // Always a long daily window: the point is history the index itself
        // cannot serve (CANDLE_RANGES['D'] is only 1y — too short to reach
        // behind the hourly cap, which silently produced an empty backfill).
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${INDEX_PROXY_SYMBOL}?interval=1d&range=5y`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            next: { revalidate: 900 },
        });
        if (!res.ok) return real;
        const proxied = parseYahooChart(await res.json(), false);
        if (!proxied || proxied.candles.length === 0) return real;
        // Resample the proxy into the frame the caller asked for, so the
        // backfilled bars line up with the real ones bar-for-bar.
        const proxy = frame === 'D'
            ? proxied.candles
            : frame === 'W'
                ? resampleWeekly(proxied.candles)
                : resampleMonthly(proxied.candles);
        return mergeProxyHistory(real, proxy);
    } catch (e) {
        console.error('Index backfill failed', e);
        return real;
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
