'use client';

import { useEffect, useState } from "react";
import { isRealtime } from "@/lib/market-data";

export type LiveQuote = { c?: number; d?: number; dp?: number; h?: number; l?: number; o?: number; pc?: number; t?: number };

// Realtime mode only: polls the shared /api/quotes cache while the tab is visible.
// In cached mode prices come from the server render and refresh hourly for everyone.
export function useLiveQuotes(symbols: string[], intervalMs = 15_000) {
    const [quotes, setQuotes] = useState<Record<string, LiveQuote | null>>({});
    const key = symbols.join(",");

    useEffect(() => {
        if (!key || !isRealtime) return;
        let cancelled = false;

        const load = async () => {
            if (document.visibilityState !== "visible") return;
            try {
                const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(key)}`);
                if (res.ok && !cancelled) setQuotes(await res.json());
            } catch { /* keep the last good prices */ }
        };
        const onVisibility = () => { if (document.visibilityState === "visible") load(); };

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
