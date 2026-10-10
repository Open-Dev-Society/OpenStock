import "server-only";
import { getUpstoxToken } from "@/lib/upstox/config";

type UpstoxCandle = [string, number, number, number, number, number, number?];
type Candle = { timestamp: string; open: number; high: number; low: number; close: number; volume: number; oi?: number };

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
        headers: {
            Authorization: `Bearer ${getUpstoxToken()}`,
            Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Upstox candle request failed (${res.status}): ${detail.slice(0,160)}`);
    }
    return normalize(await res.json());
}

/**
 * Symbols are NSE_EQ trading symbols, resolved using the official instrument master in the
 * production scanner. Until that resolver is configured, callers may pass an instrument key
 * explicitly via UPSTOX_SYMBOL_MAP_JSON (e.g. {"RELIANCE":"NSE_EQ|INE002A01018"}).
 */
function instrumentKeyFor(symbol: string): string {
    let map: Record<string,string> = {};
    try { map = JSON.parse(process.env.UPSTOX_SYMBOL_MAP_JSON ?? "{}") as Record<string,string>; }
    catch { throw new Error("UPSTOX_SYMBOL_MAP_JSON must be valid JSON"); }
    const key = map[symbol];
    if (!key || !/^[A-Z_]+\|[A-Za-z0-9_-]+$/.test(key)) {
        throw new Error(`No Upstox instrument key mapped for ${symbol}. Configure UPSTOX_SYMBOL_MAP_JSON.`);
    }
    return key;
}

export async function getUpstoxIntradayCandles(symbol: string, interval: number): Promise<Candle[]> {
    const key = encodeURIComponent(instrumentKeyFor(symbol));
    return getCandles(`intraday/${key}/minutes/${interval}`);
}

export async function getUpstoxHistoricalCandles(symbol: string, interval: number): Promise<Candle[]> {
    const key = encodeURIComponent(instrumentKeyFor(symbol));
    const now = new Date();
    const to = new Date(now.getTime() - 24*60*60*1000).toISOString().slice(0,10);
    const from = new Date(now.getTime() - 10*24*60*60*1000).toISOString().slice(0,10);
    return getCandles(`${key}/minutes/${interval}/${to}/${from}`);
}

export type { Candle };
