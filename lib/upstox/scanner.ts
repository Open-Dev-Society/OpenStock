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
    const d = new Date(timestamp);
    if (!Number.isFinite(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(d);
}
function isComplete(candle: Candle, timeframe: number, now: Date) {
    const start = Date.parse(candle.timestamp);
    if (!Number.isFinite(start)) return false;
    return start + timeframe * 60_000 <= now.getTime();
}
function getPriorDayLevels(candles: Candle[], today: string) {
    const grouped = new Map<string,Candle[]>();
    for (const candle of candles) {
        const key = dayKey(candle.timestamp);
        if (!key || key >= today) continue;
        grouped.set(key, [...(grouped.get(key) ?? []), candle]);
    }
    const previousSession = [...grouped.keys()].sort().at(-1);
    const bars = previousSession ? grouped.get(previousSession) ?? [] : [];
    if (!bars.length) return null;
    return { high: Math.max(...bars.map(c=>c.high)), low: Math.min(...bars.map(c=>c.low)), date: previousSession! };
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
    const currentDay = intradayCandles
        .filter(c => dayKey(c.timestamp) === today && isComplete(c,timeframe,now))
        .sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
    if (currentDay.length < 2) {
        return { symbol, direction:"NONE", score:0, reasons:["Waiting for at least two completed candles today"] };
    }

    const bar = currentDay.at(-1)!;
    // Combine historical and current-session candles, de-duplicate by timestamp,
    // and only use candles that had fully closed before the candidate breakout bar.
    const byTimestamp = new Map<string,Candle>();
    for (const candle of [...historicalCandles, ...intradayCandles]) {
        if (!isComplete(candle,timeframe,now)) continue;
        if (Date.parse(candle.timestamp) >= Date.parse(bar.timestamp)) continue;
        byTimestamp.set(candle.timestamp,candle);
    }
    const baselineBars = [...byTimestamp.values()].sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp)).slice(-20);
    if (baselineBars.length < 20) {
        return { symbol, direction:"NONE", score:0, price:bar.close, reasons:["Waiting for 20 prior completed candles for volume baseline"], candleTime:bar.timestamp };
    }

    const volumeAverage = average(baselineBars.map(c=>c.volume));
    const volumeRatio = volumeAverage > 0 ? bar.volume/volumeAverage : 0;
    const levels = getPriorDayLevels(historicalCandles,today);
    if (!levels) return { symbol, direction:"NONE", score:0, price:bar.close, volumeRatio, reasons:["Previous-session PDH/PDL data unavailable"], candleTime:bar.timestamp };
    if (!allowSignal) return {
        symbol, direction:"NONE", score:0, price:bar.close, volumeRatio,
        previousDayHigh:levels.high, previousDayLow:levels.low,
        reasons:["Outside 09:15–10:00 IST signal window"], candleTime:bar.timestamp,
    };

    const priorSameDay = currentDay.at(-2)!;
    const bullish = bar.close > levels.high && priorSameDay.close <= levels.high && volumeRatio >= volumeMultiplier;
    const bearish = bar.close < levels.low && priorSameDay.close >= levels.low && volumeRatio >= volumeMultiplier;
    if (!bullish && !bearish) return {
        symbol, direction:"NONE", score:0, price:bar.close, volumeRatio,
        previousDayHigh:levels.high, previousDayLow:levels.low,
        reasons:["No first-cross PDH/PDL breakout with volume confirmation"], candleTime:bar.timestamp,
    };
    const direction = bullish ? "BULLISH" : "BEARISH";
    const reasons = [
        bullish ? "Completed candle closed above PDH" : "Completed candle closed below PDL",
        `Volume ${volumeRatio.toFixed(2)}× 20-candle baseline`,
        `Previous session: ${levels.date}`,
    ];
    const score = Math.min(100, 70 + Math.min(30, Math.max(0, (volumeRatio-volumeMultiplier)*10)));
    return { symbol, direction, score, price:bar.close, volumeRatio, previousDayHigh:levels.high, previousDayLow:levels.low, reasons, candleTime:bar.timestamp };
}
