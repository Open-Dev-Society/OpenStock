'use server';

import { TADAWUL_MAIN_COMPANIES } from '@/lib/tadawul-companies';
import { tadawulDisplayName } from '@/lib/tadawul-search';
import { parseYahooChart, type OhlcCandle } from '@/lib/yahoo';
import { rsi } from '@/lib/indicators';
import { rsiBurst, rsiMomentum, scoreSetup, type SetupScore } from '@/lib/setup-scan';

export type ScanRow = {
    symbol: string;
    name: string;
    setup: SetupScore;
};

type ScannedSymbol = { symbol: string; name: string; candles: OhlcCandle[] };

const CONCURRENCY = 12;

// One shared pass over the main market only (Nomu excluded). Heavy cold
// (~30s for ~284 symbols with 12 workers), then shared from the 1-hour data cache.
async function fetchAllDaily(): Promise<ScannedSymbol[]> {
    const out: ScannedSymbol[] = [];
    const queue = [...TADAWUL_MAIN_COMPANIES];
    const workers = Array.from({ length: CONCURRENCY }, async () => {
        while (queue.length) {
            const company = queue.shift();
            if (!company) return;
            try {
                const res = await fetch(
                    `https://query1.finance.yahoo.com/v8/finance/chart/${company.symbol}?interval=1d&range=1y`,
                    {
                        headers: { 'User-Agent': 'Mozilla/5.0' },
                        signal: AbortSignal.timeout(12_000),
                        next: { revalidate: 3600 },
                    },
                );
                if (!res.ok) continue;
                const parsed = parseYahooChart(await res.json());
                if (!parsed || parsed.candles.length < 60) continue;
                out.push({ symbol: company.symbol, name: tadawulDisplayName(company), candles: parsed.candles });
            } catch {
                // One bad symbol never sinks the scan
            }
        }
    });
    await Promise.all(workers);
    return out;
}

// Scan the whole main market on daily candles (1y for SMA50 + 52w high).
export async function scanMarket(top = 25): Promise<{ rows: ScanRow[]; scanned: number; asOf: string }> {
    const all = await fetchAllDaily();
    const results: ScanRow[] = [];
    for (const { symbol, name, candles } of all) {
        const setup = scoreSetup(
            candles.map((c) => c.close),
            candles.map((c) => c.high),
            candles.map((c) => c.low),
            candles.map((c) => c.volume),
        );
        if (setup && setup.score > 0) results.push({ symbol, name, setup });
    }
    results.sort((a, b) => b.setup.score - a.setup.score || b.setup.changePercent - a.setup.changePercent);
    return { rows: results.slice(0, top), scanned: TADAWUL_MAIN_COMPANIES.length, asOf: new Date().toISOString().slice(0, 10) };
}

// Up day + RSI inside [lo, hi], strongest day move first.
export async function scanRsiBand(lo: number, hi: number, top = 25): Promise<{ rows: ScanRow[]; scanned: number }> {
    const all = await fetchAllDaily();
    const results: ScanRow[] = [];
    for (const { symbol, name, candles } of all) {
        const closes = candles.map((c) => c.close);
        if (closes.length < 20) continue;
        const price = closes[closes.length - 1];
        const prev = closes[closes.length - 2];
        const changePercent = prev ? ((price - prev) / prev) * 100 : 0;
        if (changePercent <= 0) continue;
        const r = rsi(closes, 14);
        const rv = r[r.length - 1];
        if (rv == null || rv <= lo || rv >= hi) continue;
        results.push({
            symbol,
            name,
            setup: { signals: [], score: 0, rsi: rv, price, changePercent, volumeRatio: null },
        });
    }
    results.sort((a, b) => b.setup.changePercent - a.setup.changePercent);
    return { rows: results.slice(0, top), scanned: TADAWUL_MAIN_COMPANIES.length };
}

// RSI momentum: RSI(14) higher than yesterday, biggest gain first.
export async function scanRsiRising(top = 25): Promise<{ rows: ScanRow[]; scanned: number }> {
    const all = await fetchAllDaily();
    const results: ScanRow[] = [];
    for (const { symbol, name, candles } of all) {
        const closes = candles.map((c) => c.close);
        const m = rsiMomentum(closes);
        if (!m || m.change <= 0) continue;
        const price = closes[closes.length - 1];
        const prev = closes[closes.length - 2];
        results.push({
            symbol,
            name,
            setup: {
                signals: ['rsi-rising'],
                score: 1,
                rsi: m.rsi,
                price,
                changePercent: prev ? ((price - prev) / prev) * 100 : 0,
                volumeRatio: null,
                rsiChange: m.change,
            },
        });
    }
    results.sort((a, b) => (b.setup.rsiChange ?? 0) - (a.setup.rsiChange ?? 0));
    return { rows: results.slice(0, top), scanned: TADAWUL_MAIN_COMPANIES.length };
}

// RSI burst: one-day RSI(14) jump >= minJump while RSI <= maxRsi (default 6 / 50).
export async function scanRsiBurst(top = 25, minJump = 6, maxRsi = 50): Promise<{ rows: ScanRow[]; scanned: number }> {
    const all = await fetchAllDaily();
    const results: ScanRow[] = [];
    for (const { symbol, name, candles } of all) {
        const closes = candles.map((c) => c.close);
        const m = rsiBurst(closes, minJump, maxRsi);
        if (!m) continue;
        const price = closes[closes.length - 1];
        const prev = closes[closes.length - 2];
        results.push({
            symbol,
            name,
            setup: {
                signals: ['rsi-burst'],
                score: 1,
                rsi: m.rsi,
                price,
                changePercent: prev ? ((price - prev) / prev) * 100 : 0,
                volumeRatio: null,
                rsiChange: m.change,
            },
        });
    }
    results.sort((a, b) => (b.setup.rsiChange ?? 0) - (a.setup.rsiChange ?? 0));
    return { rows: results.slice(0, top), scanned: TADAWUL_MAIN_COMPANIES.length };
}
