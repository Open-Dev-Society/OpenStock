'use client';

import { useCallback, useSyncExternalStore } from 'react';

const KEY = 'tadawul-watchlist-hidden';

let cache: string[] | null = null;
const listeners = new Set<() => void>();
// Stable empty snapshot: returning a fresh array each call makes React loop.
const EMPTY_SNAPSHOT: string[] = [];

function read(): string[] {
    if (cache === null) {
        try {
            const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown;
            cache = Array.isArray(raw) ? raw.filter((s): s is string => typeof s === 'string') : [];
        } catch {
            cache = [];
        }
    }
    return cache;
}

function write(next: string[]) {
    cache = next;
    try {
        localStorage.setItem(KEY, JSON.stringify(next));
    } catch { /* ignore */ }
    listeners.forEach((l) => l());
}

function subscribe(notify: () => void) {
    listeners.add(notify);
    return () => {
        listeners.delete(notify);
    };
}

// Per-symbol show/hide across the sidebar, terminal panel and watchlist table.
// Shared store so every surface updates together; persisted in localStorage.
export function useWatchlistVisibility() {
    const hidden = useSyncExternalStore(subscribe, read, () => EMPTY_SNAPSHOT);
    const toggle = useCallback((symbol: string) => {
        const cur = read();
        write(cur.includes(symbol) ? cur.filter((s) => s !== symbol) : [...cur, symbol]);
    }, []);
    const reset = useCallback(() => write([]), []);
    return { hidden, toggle, reset };
}
