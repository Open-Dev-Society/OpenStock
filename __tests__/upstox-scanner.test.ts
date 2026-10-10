import { describe, expect, it } from "vitest";
import { evaluateBreakout } from "@/lib/upstox/scanner";
import type { Candle } from "@/lib/upstox/rest";

function iso(day: number, hour: number, minute: number) {
    return new Date(Date.UTC(2026, 9, day, hour - 5, minute - 30)).toISOString();
}
function candle(timestamp: string, close: number, volume = 100, high = close + 1, low = close - 1): Candle {
    return { timestamp, open: close, high, low, close, volume };
}

describe("Upstox scanner breakout rules", () => {
    it("waits for a 20-candle volume baseline", () => {
        const now = new Date("2026-10-12T04:45:00.000Z"); // 10:15 IST
        const bars = Array.from({ length: 20 }, (_,i) => candle(iso(12,9,15+i*3),100,100));
        const result = evaluateBreakout({
            symbol:"DEMO", timeframe:3, intradayCandles:bars, historicalCandles:[],
            volumeMultiplier:2, allowSignal:true, now,
        });
        expect(result.direction).toBe("NONE");
        expect(result.reasons[0]).toContain("20 prior completed candles");
    });

    it("never emits a signal outside the configured session window", () => {
        const now = new Date("2026-10-12T05:15:00.000Z"); // 10:45 IST
        const bars = Array.from({ length: 22 }, (_,i) => candle(iso(12,9,15+i*3),100,100));
        const prior = Array.from({ length: 25 }, (_,i) => candle(iso(9,9,15+i*3),99,100,100,98));
        const result = evaluateBreakout({
            symbol:"DEMO", timeframe:3, intradayCandles:bars, historicalCandles:prior,
            volumeMultiplier:2, allowSignal:false, now,
        });
        expect(result.direction).toBe("NONE");
        expect(result.reasons[0]).toContain("Outside");
    });

    it("confirms a first PDH breakout when the completed candle has 2x baseline volume", () => {
        const now = new Date("2026-10-12T03:54:00.000Z"); // 09:24 IST
        const prior = Array.from({ length: 20 }, (_,i) => candle(iso(9,10,0+i*3),99,100,100,98));
        const today = [
            candle(iso(12,9,15),99,100,100,98),
            candle(iso(12,9,18),99,100,100,98),
            candle(iso(12,9,21),101,400,102,99),
        ];
        const result = evaluateBreakout({
            symbol:"DEMO", timeframe:3, intradayCandles:today, historicalCandles:prior,
            volumeMultiplier:2, allowSignal:true, now,
        });
        expect(result.direction).toBe("BULLISH");
        expect(result.volumeRatio).toBeGreaterThanOrEqual(2);
        expect(result.previousDayHigh).toBe(100);
    });

    it("does not emit a breakout when previous-session levels are missing", () => {
        const now = new Date("2026-10-12T03:54:00.000Z");
        const bars = [
            candle(iso(12,9,15),99,100,100,98),
            candle(iso(12,9,18),99,100,100,98),
            candle(iso(12,9,21),101,400,102,99),
        ];
        const baseline = Array.from({ length: 20 }, (_,i) => candle(iso(8,10,0+i*3),99,100,100,98));
        const result = evaluateBreakout({
            symbol:"DEMO", timeframe:3, intradayCandles:bars, historicalCandles:baseline,
            volumeMultiplier:2, allowSignal:true, now,
        });
        expect(result.direction).toBe("NONE");
        expect(result.reasons[0]).toContain("PDH/PDL");
    });
});
