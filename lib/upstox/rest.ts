import "server-only";
import { getUpstoxToken } from "@/lib/upstox/config";
import { getNseFnoEquityInstrument } from "@/lib/upstox/instruments";

type UpstoxCandle = [string, number, number, number, number, number, number?];
export type Candle = { timestamp: string; open: number; high: number; low: number; close: number; volume: number; oi?: number };

function normalize(data: unknown): Candle[] {
    const root = data as { data?: { candles?: UpstoxCandle[] } };
    return (root?.data?.candles ?? []).map(c => ({
        timestamp: c[0], open: Number(c[1]), high: Number(c[2]),
        low: Number(c[3]), close: Number(c[4]), volume: Number(c[5]), oi: c[6] == null ? undefined : Number(c[6]),
    })).filter(c => [c.open,c.high,c.low,c.close,c.volume].every(Number.isFinite))
      .sort((a,b) => Date.parse(a.timestamp)-Date.parse(b.timestamp));
}

async function getCandles(path: string): Promise<Candle[]> {
    const res = await fetch(`https://api.upstox.com/v3/historical-candle/${path}`, {
        headers: { Authorization: `Bearer ${getUpstoxToken()}`, Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Upstox candle request failed (${res.status}): ${detail.slice(0,160)}`);
    }
    return normalize(await res.json());
}

async function instrumentKeyFor(symbol: string): Promise<string> {
    const instrument = await getNseFnoEquityInstrument(symbol);
    if (!instrument) throw new Error(`${symbol} is not in the current NSE equity F&O universe.`);
    return instrument.instrumentKey;
}

export async function getUpstoxIntradayCandles(symbol: string, interval: number): Promise<Candle[]> {
    const key = encodeURIComponent(await instrumentKeyFor(symbol));
    return getCandles(`intraday/${key}/minutes/${interval}`);
}

export async function getUpstoxHistoricalCandles(symbol: string, interval: number): Promise<Candle[]> {
    const key = encodeURIComponent(await instrumentKeyFor(symbol));
    const now = new Date();
    const to = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year:"numeric", month:"2-digit", day:"2-digit" }).format(now);
    const fromDate = new Date(now.getTime() - 14*24*60*60*1000);
    const from = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year:"numeric", month:"2-digit", day:"2-digit" }).format(fromDate);
    return getCandles(`${key}/minutes/${interval}/${to}/${from}`);
}
