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
    const completed = intradayCandles
        .filter(c => dayKey(c.timestamp) === today && isComplete(c,timeframe,now))
        .sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
    if (completed.length < 2) return { symbol, direction:"NONE", score:0, reasons:["Not enough completed candles"] };

    // Current completed candle's volume compares with the preceding 20 completed bars.
    // With fewer bars available, wait rather than weakening the volume filter.
    if (completed.length < 21) return { symbol, direction:"NONE", score:0, reasons:["Waiting for 21 completed candles"] };
    const bar = completed.at(-1)!;
    const previous = completed.slice(-21,-1);
    const volumeAverage = average(previous.map(c=>c.volume));
    const volumeRatio = volumeAverage > 0 ? bar.volume/volumeAverage : 0;
    const levels = getPriorDayLevels(historicalCandles,today);
    if (!levels) return { symbol, direction:"NONE", score:0, price:bar.close, volumeRatio, reasons:["Previous-session PDH/PDL data unavailable"], candleTime:bar.timestamp };
    if (!allowSignal) return {
        symbol, direction:"NONE", score:0, price:bar.close, volumeRatio,
        previousDayHigh:levels.high, previousDayLow:levels.low,
        reasons:["Outside 09:15–10:00 IST signal window"], candleTime:bar.timestamp,
    };

    const priorClose = previous.at(-1)!.close;
    const bullish = bar.close > levels.high && priorClose <= levels.high && volumeRatio >= volumeMultiplier;
    const bearish = bar.close < levels.low && priorClose >= levels.low && volumeRatio >= volumeMultiplier;
    if (!bullish && !bearish) return {
        symbol, direction:"NONE", score:0, price:bar.close, volumeRatio,
        previousDayHigh:levels.high, previousDayLow:levels.low,
        reasons:["No first-cross PDH/PDL breakout with volume confirmation"], candleTime:bar.timestamp,
    };
    const direction = bullish ? "BULLISH" : "BEARISH";
    const reasons = [
        bullish ? "Completed candle closed above PDH" : "Completed candle closed below PDL",
        `Volume ${volumeRatio.toFixed(2)}× 20-candle average`,
        `Previous session: ${levels.date}`,
    ];
    const score = Math.min(100, 70 + Math.min(30, Math.max(0, (volumeRatio-volumeMultiplier)*10)));
    return { symbol, direction, score, price:bar.close, volumeRatio, previousDayHigh:levels.high, previousDayLow:levels.low, reasons, candleTime:bar.timestamp };
}
