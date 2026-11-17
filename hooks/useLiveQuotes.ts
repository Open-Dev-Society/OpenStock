'use client';

import { useEffect, useState } from "react";
import { isRealtime, MAX_QUOTE_SYMBOLS_PER_REQUEST } from "@/lib/market-data";

export type LiveQuote = { c?: number; d?: number; dp?: number; h?: number; l?: number; o?: number; pc?: number; t?: number };

// Realtime mode only: polls the shared /api/quotes cache while the tab is visible.
// In cached mode prices come from the server render and refresh hourly for everyone.
export function useLiveQuotes(symbols: string[], intervalMs = 15_000) {
    const [quotes, setQuotes] = useState<Record<string, LiveQuote | null>>({});
    const key = symbols.join(",");

    useEffect(() => {
        if (!key || !isRealtime) return;
        let cancelled = false;
        // The route caps each response at 25 symbols; send larger watchlists in batches.
        const tickers = key.split(",");
        const batches: string[][] = [];
        for (let i = 0; i < tickers.length; i += MAX_QUOTE_SYMBOLS_PER_REQUEST) {
            batches.push(tickers.slice(i, i + MAX_QUOTE_SYMBOLS_PER_REQUEST));
        }

        const load = async () => {
            if (document.visibilityState !== "visible") return;
            const results = await Promise.all(batches.map(async (batch) => {
                try {
                    const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(batch.join(","))}`);
                    return res.ok ? (await res.json()) as Record<string, LiveQuote | null> : null;
                } catch {
                    return null; // Retain the last good quotes if this batch failed.
                }
            }));
            if (cancelled) return;
            const successful = results.filter((r): r is Record<string, LiveQuote | null> => r !== null);
            if (successful.length) setQuotes((old) => ({ ...old, ...Object.assign({}, ...successful) }));
        };
        const onVisibility = () => { if (document.visibilityState === "visible") void load(); };

        void load(); // Don't wait a full polling interval after opening the page.
        const interval = setInterval(() => { void load(); }, intervalMs);
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            cancelled = true;
            clearInterval(interval);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [key, intervalMs]);

    return quotes;
}
