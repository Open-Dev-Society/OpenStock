import type { Candle } from "@/lib/upstox/rest";

export type ScannerSignal = {
    symbol: string;
    direction: "BULLISH" | "BEARISH" | "NONE";
    score: number;
    price?: number;
    volumeRatio?: number;
    previousDayHigh?: number;
    previousDayLow?: number;
    reasons: string[];
    candleTime?: string;
    error?: boolean;
};

function average(values: number[]) {
    return values.length ? values.reduce((a,b) => a+b, 0) / values.length : 0;
}
function dayKey(timestamp: string) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date(timestamp));
}
function isComplete(candle: Candle, timeframe: number, now: Date) {
    const start = Date.parse(candle.timestamp);
    if (!Number.isFinite(start)) return false;
    return start + timeframe*60_000 <= now.getTime();
}
function getPriorDayLevels(candles: Candle[], today: string) {
    const prior = candles.filter(c => dayKey(c.timestamp) < today);
    const byDay = new Map<string,Candle[]>();
    for (const c of prior) {
        const key = dayKey(c.timestamp);
        byDay.set(key, [...(byDay.get(key) ?? []), c]);
    }
    const days = [...byDay.keys()].sort();
    const previous = days.at(-1);
    const bars = previous ? byDay.get(previous) ?? [] : [];
    if (!bars.length) return null;
    return { high: Math.max(...bars.map(c=>c.high)), low: Math.min(...bars.map(c=>c.low)), date: previous! };
}

export function evaluateBreakout(input: {
    symbol: string;
    timeframe: number;
    intradayCandles: Candle[];
    historicalCandles: Candle[];
    volumeMultiplier: number;
    allowSignal: boolean;
    now: Date;
}): ScannerSignal {
    const {symbol,timeframe,intradayCandles,historicalCandles,volumeMultiplier,allowSignal,now} = input;
    const today = dayKey(now.toISOString());
    const completed = intradayCandles.filter(c => dayKey(c.timestamp) === today && isComplete(c,timeframe,now));
    if (completed.length < 21) return { symbol, direction:"NONE", score:0, reasons:["Waiting for 21 completed candles"] };

    // Use preceding 20 completed bars; exclude the breakout bar from baseline volume.
    const bar = completed.at(-1)!;
    const previous = completed.slice(-21,-1);
    const volumeAverage = average(previous.map(c=>c.volume));
    const volumeRatio = volumeAverage > 0 ? bar.volume/volumeAverage : 0;
    const levels = getPriorDayLevels(historicalCandles,today);
    if (!levels) return { symbol, direction:"NONE", score:0, price:bar.close, volumeRatio, reasons:["Previous-day levels unavailable"], candleTime:bar.timestamp };
    if (!allowSignal) return { symbol, direction:"NONE", score:0, price:bar.close, volumeRatio, previousDayHigh:levels.high, previousDayLow:levels.low, reasons:["Outside 09:15–10:00 IST signal window"], candleTime:bar.timestamp };

    const bullish = bar.close > levels.high && previous.at(-1)!.close <= levels.high && volumeRatio >= volumeMultiplier;
    const bearish = bar.close < levels.low && previous.at(-1)!.close >= levels.low && volumeRatio >= volumeMultiplier;
    if (!bullish && !bearish) return {
        symbol, direction:"NONE", score:0, price:bar.close, volumeRatio,
        previousDayHigh:levels.high, previousDayLow:levels.low, reasons:["No confirmed PDH/PDL breakout with volume"], candleTime:bar.timestamp,
    };
    const direction = bullish ? "BULLISH" : "BEARISH";
    const reasons = [bullish ? "Close broke above PDH" : "Close broke below PDL", `Volume ${volumeRatio.toFixed(2)}x 20-bar average`, `Previous session levels from ${levels.date}`];
    // Score is a transparent setup score, not a probability of profit.
    const score = Math.min(100, 60 + Math.min(30, Math.max(0, (volumeRatio-volumeMultiplier)*10)) + 10);
    return { symbol, direction, score, price:bar.close, volumeRatio, previousDayHigh:levels.high, previousDayLow:levels.low, reasons, candleTime:bar.timestamp };
}
