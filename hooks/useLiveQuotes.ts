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

        let pollGeneration = 0;
        const lastAppliedGeneration = batches.map(() => 0);
        const load = () => {
            if (document.visibilityState !== "visible") return;
            const generation = ++pollGeneration;

            // Apply each batch independently: a slow request must not hold up other quotes.
            batches.forEach((batch, index) => {
                void (async () => {
                    try {
                        const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(batch.join(","))}`);
                        if (!res.ok) return;
                        const fresh = await res.json() as Record<string, LiveQuote | null>;
                        // Overlapping polls may finish out of order; never apply older data over newer data.
                        if (cancelled || generation < lastAppliedGeneration[index]) return;
                        lastAppliedGeneration[index] = generation;
                        setQuotes((previous) => ({ ...previous, ...fresh }));
                    } catch { /* Retain the last good quotes for this batch. */ }
                })();
            });
        };
        const onVisibility = () => { if (document.visibilityState === "visible") load(); };

        load(); // Don't wait a full polling interval after opening the page.
        const interval = setInterval(load, intervalMs);
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            cancelled = true;
            clearInterval(interval);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [key, intervalMs]);

    return quotes;
}
