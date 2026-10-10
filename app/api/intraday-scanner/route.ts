import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/better-auth/auth";
import { getScannerConfig, isUpstoxConfigured } from "@/lib/upstox/config";
import { getUpstoxIntradayCandles, getUpstoxHistoricalCandles } from "@/lib/upstox/rest";
import { evaluateBreakout } from "@/lib/upstox/scanner";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

const SYMBOL_RE = /^[A-Z0-9_-]{1,30}$/;

/**
 * On-demand scanner snapshot. This intentionally does not create a persistent WebSocket
 * inside a serverless request. A long-running worker can later publish the same signal model.
 */
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!isUpstoxConfigured()) {
        return NextResponse.json({
            status: "not_configured",
            message: "Add UPSTOX_ACCESS_TOKEN in the server environment to enable Upstox data.",
            signals: [],
            config: getScannerConfig(),
        });
    }

    const params = req.nextUrl.searchParams;
    const timeframe = Number(params.get("timeframe") ?? "3");
    const volumeMultiplier = Number(params.get("volumeMultiplier") ?? "2");
    const symbols = [...new Set((params.get("symbols") ?? "RELIANCE,HDFCBANK,ICICIBANK,SBIN,INFY,TCS,LT,BEL,TATAMOTORS,AXISBANK")
        .split(",").map(s => s.trim().toUpperCase()).filter(s => SYMBOL_RE.test(s)))].slice(0, 20);

    if (![1, 3, 5].includes(timeframe) || !Number.isFinite(volumeMultiplier) || volumeMultiplier < 1 || volumeMultiplier > 10) {
        return NextResponse.json({ error: "Invalid timeframe or volume multiplier." }, { status: 400 });
    }

    const now = new Date();
    const marketMinutes = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).format(now);
    const inSignalWindow = marketMinutes >= "09:15" && marketMinutes <= "10:00";
    const working = await Promise.allSettled(symbols.map(async symbol => {
        const [intraday, history] = await Promise.all([
            getUpstoxIntradayCandles(symbol, timeframe),
            getUpstoxHistoricalCandles(symbol, timeframe),
        ]);
        return evaluateBreakout({
            symbol, timeframe, intradayCandles: intraday, historicalCandles: history,
            volumeMultiplier, allowSignal: inSignalWindow, now,
        });
    }));
    const results = working.flatMap((r, i) => r.status === "fulfilled"
        ? [r.value]
        : [{ symbol: symbols[i], direction: "NONE" as const, score: 0, reasons: ["Data unavailable"], error: true }]);

    const activeSignals = results.filter(r => r.direction !== "NONE");
    return NextResponse.json({
        status: "ok",
        scannedAt: now.toISOString(),
        timezone: "Asia/Kolkata",
        inSignalWindow,
        timeframe,
        volumeMultiplier,
        scanned: symbols.length,
        signalCount: activeSignals.length,
        signals: results.sort((a, b) => b.score - a.score),
        note: "On-demand snapshot, not a persistent live WebSocket. Only completed candles are evaluated.",
    }, { headers: { "Cache-Control": "private, no-store" } });
}
