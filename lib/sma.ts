// Moving-average price alerts (issue #59). Finnhub's indicator endpoints need a paid plan, so the simple moving
// average is computed here from free daily closes on Yahoo Finance's chart endpoint (the one lib/yahoo.ts reads).

export const SMA_PERIODS = [20, 50, 100, 200] as const;
export type SmaPeriod = (typeof SMA_PERIODS)[number];
export const isSmaPeriod = (value: unknown): value is SmaPeriod => SMA_PERIODS.includes(value as SmaPeriod);

export type Side = 'ABOVE' | 'BELOW';

// Mean of the last `period` closes; null until there are that many
export function sma(closes: readonly number[], period: number): number | null {
    if (!Number.isInteger(period) || period < 1 || closes.length < period) return null;
    let sum = 0;
    for (let i = closes.length - period; i < closes.length; i++) sum += closes[i];
    return sum / period;
}

// Which side of the average the price is on. Exactly on it is neither, so it keeps whatever side came before.
export const sideOf = (price: number, average: number): Side | null =>
    price > average ? 'ABOVE' : price < average ? 'BELOW' : null;

// TradingView's "crossing up/down": the previous check saw the price on the other side and this one sees it on the
// alert's side. Unlike a fixed-price alert, a price that is already past the average when the alert is set waits
// for the next cross instead of firing at once. No previous side yet means no cross.
export const hasCrossed = (condition: Side, lastSide: Side | null | undefined, price: number, average: number) =>
    !!lastSide && lastSide !== condition && sideOf(price, average) === condition;

// Alert symbols (Finnhub's: US tickers and Binance pairs) as Yahoo chart symbols: AAPL -> AAPL, BRK.B -> BRK-B,
// BINANCE:BTCUSDT -> BTC-USD (USDT tracks the dollar). null when Yahoo has no matching daily series.
export function yahooChartSymbol(symbol: string): string | null {
    const upper = (symbol || '').trim().toUpperCase();
    const pair = /^BINANCE:([A-Z0-9]{2,15})USDT$/.exec(upper);
    if (pair) return `${pair[1]}-USD`;
    return /^[A-Z][A-Z0-9]{0,9}(\.[A-Z])?$/.test(upper) ? upper.replace('.', '-') : null;
}

type ChartJson = {
    chart?: { result?: Array<{ meta?: { regularMarketPrice?: number }; indicators?: { quote?: Array<{ close?: (number | null)[] }> } }> };
};

// Daily closes, oldest first, plus Yahoo's latest price. Gaps (null closes on holidays or halts) are dropped.
export function closesFromChart(json: unknown): { closes: number[]; price: number | null } | null {
    const result = (json as ChartJson)?.chart?.result?.[0];
    const closes = (result?.indicators?.quote?.[0]?.close ?? []).filter((n): n is number => Number.isFinite(n) && n! > 0);
    if (!result || closes.length === 0) return null;
    const price = result.meta?.regularMarketPrice;
    return { closes, price: Number.isFinite(price) && price! > 0 ? price! : closes[closes.length - 1] };
}

// A year of daily bars covers SMA 200 (about 250 trading days). The average moves once a day, so the response is
// cached for an hour and shared: one request per symbol per hour, however many alerts or checks use it.
// null means Yahoo couldn't be reached (timeout, 5xx), worth retrying; an empty history means it has none for
// this symbol (404, an empty chart), which retrying won't change.
const NO_HISTORY = { closes: [] as number[], price: null };
export async function getDailyCloses(symbol: string): Promise<{ closes: number[]; price: number | null } | null> {
    const yahooSymbol = yahooChartSymbol(symbol);
    if (!yahooSymbol) return NO_HISTORY;
    try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1y`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            next: { revalidate: 3600 },
            signal: AbortSignal.timeout(5000),
        });
        if (res.status === 404) return NO_HISTORY;
        if (!res.ok) return null;
        return closesFromChart(await res.json()) ?? NO_HISTORY;
    } catch (e) {
        console.error('Daily closes error', symbol, e);
        return null;
    }
}
