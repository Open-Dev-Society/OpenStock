import "server-only";
import { gunzipSync } from "node:zlib";

type RawInstrument = {
    segment?: string;
    exchange?: string;
    instrument_type?: string;
    instrument_key?: string;
    trading_symbol?: string;
    underlying_symbol?: string;
    underlying_key?: string;
    underlying_type?: string;
    expiry?: number | string;
    name?: string;
};

export type FnoEquityInstrument = {
    symbol: string;
    name: string;
    instrumentKey: string;
};

const INSTRUMENTS_URL = "https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz";
const CACHE_MS = 6 * 60 * 60 * 1000;
let cache: { expiresAt: number; instruments: FnoEquityInstrument[] } | null = null;
let pending: Promise<FnoEquityInstrument[]> | null = null;

function decodeInstrumentJson(bytes: Buffer): unknown {
    let text: string;
    try { text = gunzipSync(bytes).toString("utf8"); }
    catch { text = bytes.toString("utf8"); } // Fetch may already have decompressed the response.
    return JSON.parse(text);
}

function expiryTime(value: RawInstrument["expiry"]): number {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
}

async function loadUniverse(): Promise<FnoEquityInstrument[]> {
    const response = await fetch(INSTRUMENTS_URL, {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
        headers: { Accept: "application/json, application/gzip, */*" },
    });
    if (!response.ok) throw new Error(`Upstox instrument master fetch failed: HTTP ${response.status}`);
    const raw = decodeInstrumentJson(Buffer.from(await response.arrayBuffer()));
    if (!Array.isArray(raw)) throw new Error("Unexpected Upstox instrument master format");
    const rows = raw as RawInstrument[];

    const equityBySymbol = new Map<string, RawInstrument>();
    for (const row of rows) {
        if (row.segment === "NSE_EQ" && row.exchange === "NSE" &&
            row.instrument_type === "EQ" && row.trading_symbol && row.instrument_key) {
            equityBySymbol.set(row.trading_symbol.toUpperCase(), row);
        }
    }

    const today = new Date();
    const eligible = new Map<string, FnoEquityInstrument>();
    for (const row of rows) {
        if (row.segment !== "NSE_FO" || row.exchange !== "NSE" ||
            row.instrument_type !== "FUT" || row.underlying_type !== "EQUITY" ||
            !row.underlying_symbol || expiryTime(row.expiry) < today.getTime()) continue;
        const symbol = row.underlying_symbol.toUpperCase();
        const equity = equityBySymbol.get(symbol);
        if (!equity?.instrument_key) continue;
        eligible.set(symbol, {
            symbol,
            name: equity.name || equity.trading_symbol || symbol,
            instrumentKey: equity.instrument_key,
        });
    }
    return [...eligible.values()].sort((a,b) => a.symbol.localeCompare(b.symbol));
}

export async function getNseFnoEquityInstruments(): Promise<FnoEquityInstrument[]> {
    if (cache && cache.expiresAt > Date.now()) return cache.instruments;
    if (!pending) {
        pending = loadUniverse().then(instruments => {
            cache = { instruments, expiresAt: Date.now() + CACHE_MS };
            return instruments;
        }).finally(() => { pending = null; });
    }
    return pending;
}

export async function getNseFnoEquityInstrument(symbol: string): Promise<FnoEquityInstrument | null> {
    const instruments = await getNseFnoEquityInstruments();
    return instruments.find(item => item.symbol === symbol.trim().toUpperCase()) ?? null;
}
