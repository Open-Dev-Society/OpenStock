'use client';

import { useState } from "react";
import { Activity, Play, RefreshCw, ShieldAlert } from "lucide-react";

type Signal = {
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
type ScannerResponse = {
    status: string;
    message?: string;
    note?: string;
    scannedAt?: string;
    inSignalWindow?: boolean;
    scanned?: number;
    signalCount?: number;
    signals?: Signal[];
    error?: string;
};

const STARTER_SYMBOLS = "RELIANCE,HDFCBANK,ICICIBANK,SBIN,INFY,TCS,LT,BEL,TATAMOTORS,AXISBANK";

export default function ScannerConsole() {
    const [timeframe, setTimeframe] = useState("3");
    const [multiplier, setMultiplier] = useState("2");
    const [symbols, setSymbols] = useState(STARTER_SYMBOLS);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ScannerResponse | null>(null);
    const [error, setError] = useState("");

    async function scan() {
        setLoading(true);
        setError("");
        try {
            const query = new URLSearchParams({
                timeframe,
                volumeMultiplier: multiplier,
                symbols: symbols.replace(/\s+/g, ""),
            });
            const res = await fetch(`/api/intraday-scanner?${query.toString()}`, { cache: "no-store" });
            const payload = await res.json() as ScannerResponse;
            if (!res.ok) throw new Error(payload.error || (res.status === 401 ? "Please sign in again." : "Scanner request failed."));
            setData(payload);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Unexpected scanner error.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="grid gap-3 md:grid-cols-[160px_200px_minmax(0,1fr)_auto] md:items-end">
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
                    Candle timeframe
                    <select value={timeframe} onChange={e=>setTimeframe(e.target.value)} className="h-10 rounded-lg border border-line bg-card px-3 text-sm text-foreground">
                        <option value="1">1 minute</option><option value="3">3 minutes</option><option value="5">5 minutes</option>
                    </select>
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
                    Volume ≥ average ×
                    <input type="number" min="1" max="10" step="0.25" value={multiplier} onChange={e=>setMultiplier(e.target.value)} className="h-10 rounded-lg border border-line bg-card px-3 text-sm text-foreground"/>
                </label>
                <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
                    Symbols (comma-separated, max 20)
                    <input value={symbols} onChange={e=>setSymbols(e.target.value)} className="h-10 min-w-0 rounded-lg border border-line bg-card px-3 text-sm text-foreground" spellCheck={false}/>
                </label>
                <button type="button" disabled={loading} onClick={scan} className="btn btn-primary h-10 justify-center disabled:opacity-60">
                    {loading ? <RefreshCw className="size-4 animate-spin"/> : <Play className="size-4"/>}
                    {loading ? "Scanning…" : "Scan now"}
                </button>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-warn/30 bg-hover p-3 text-xs text-muted-foreground">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warn"/>
                <p>This version validates each symbol against Upstox’s current NSE equity F&O universe and resolves its cash-equity instrument key automatically. It is still an on-demand snapshot—not a continuous full-universe WebSocket scanner.</p>
            </div>

            {error && <p role="alert" className="rounded-lg border border-down/30 bg-down-soft p-3 text-sm">{error}</p>}
            {data?.status === "not_configured" && <p className="rounded-lg border border-warn/30 bg-hover p-3 text-sm text-muted-foreground">{data.message}</p>}

            {data?.status === "ok" && (
                <div className="flex flex-col gap-3">
                    <div className="grid gap-2 sm:grid-cols-3">
                        <div className="rounded-lg border border-line p-3"><p className="text-xs text-muted-foreground">Symbols scanned</p><p className="mt-1 text-xl font-semibold">{data.scanned ?? 0}</p></div>
                        <div className="rounded-lg border border-line p-3"><p className="text-xs text-muted-foreground">Confirmed setups</p><p className="mt-1 text-xl font-semibold">{data.signalCount ?? 0}</p></div>
                        <div className="rounded-lg border border-line p-3"><p className="text-xs text-muted-foreground">Signal window</p><p className="mt-1 text-base font-semibold">{data.inSignalWindow ? "OPEN · IST" : "CLOSED · IST"}</p></div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-line">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="bg-hover text-xs text-muted-foreground">
                                <tr>{["Symbol","Signal","Score","Last completed close","Volume ratio","PDH","PDL","Reason"].map(h=><th key={h} className="px-3 py-3 font-semibold">{h}</th>)}</tr>
                            </thead>
                            <tbody>
                                {(data.signals ?? []).map(row=><tr key={row.symbol} className="border-t border-line">
                                    <td className="px-3 py-3 font-semibold">{row.symbol}</td>
                                    <td className="px-3 py-3"><span className={row.direction==="BULLISH"?"rounded-md bg-up-soft px-2 py-1 text-xs font-bold text-up":row.direction==="BEARISH"?"rounded-md bg-down-soft px-2 py-1 text-xs font-bold text-down":"text-muted-foreground"}>{row.direction}</span></td>
                                    <td className="px-3 py-3 tabular-nums">{row.score}</td>
                                    <td className="px-3 py-3 tabular-nums">{row.price?.toFixed(2) ?? "—"}</td>
                                    <td className="px-3 py-3 tabular-nums">{row.volumeRatio?.toFixed(2) ?? "—"}×</td>
                                    <td className="px-3 py-3 tabular-nums">{row.previousDayHigh?.toFixed(2) ?? "—"}</td>
                                    <td className="px-3 py-3 tabular-nums">{row.previousDayLow?.toFixed(2) ?? "—"}</td>
                                    <td className="max-w-[280px] px-3 py-3 text-xs text-muted-foreground">{row.error ? "Data unavailable — check active symbol, token or API limits" : row.reasons.join(" · ")}</td>
                                </tr>)}
                                {(!data.signals || data.signals.length===0) && <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No rows returned.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    {data.scannedAt && <p className="text-xs text-faint">Fetched {new Date(data.scannedAt).toLocaleString()} · {data.note}</p>}
                </div>
            )}

            {!data && !error && <div className="rounded-xl border border-dashed border-line py-10 text-center"><Activity className="mx-auto size-6 text-faint"/><p className="mt-3 text-sm font-semibold">Ready to scan</p><p className="mt-1 text-xs text-muted-foreground">Choose your settings and press Scan now.</p></div>}
        </div>
    );
}
