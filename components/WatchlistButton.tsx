"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { addToWatchlist, removeFromWatchlist } from "@/lib/actions/watchlist.actions";
import { cn } from "@/lib/utils";
import { tx, type Lang } from "@/lib/i18n";

interface WatchlistButtonProps {
    symbol: string;
    company: string;
    isInWatchlist: boolean;
    variant?: "button" | "icon";
    lang?: Lang;
    onWatchlistChange?: (symbol: string, added: boolean) => void;
}

const WatchlistButton = ({ symbol, company, isInWatchlist, variant = "button", lang = "en", onWatchlistChange }: WatchlistButtonProps) => {
    const router = useRouter();
    const [added, setAdded] = useState(isInWatchlist);
    const [loading, setLoading] = useState(false);

    // The server re-renders with fresh membership after navigation/refresh;
    // mirror it instead of keeping a stale optimistic value per symbol.
    useEffect(() => setAdded(isInWatchlist), [isInWatchlist, symbol]);

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault(); // may sit inside a link

        const next = !added;
        setAdded(next); // optimistic
        setLoading(true);
        try {
            if (next) {
                const result = await addToWatchlist(symbol, company);
                if (result && 'error' in result) {
                    setAdded(false);
                    toast.error(result.error);
                    return;
                }
            } else await removeFromWatchlist(symbol);
            toast.success(`${symbol} ${next ? tx(lang, 'wl.added') : tx(lang, 'wl.removed')}`);
            onWatchlistChange?.(symbol, next);
            router.refresh(); // sidebar lists the watchlist from the layout
        } catch (error) {
            console.error("Watchlist action failed:", error);
            setAdded(!next);
            toast.error(tx(lang, 'wl.failed'));
        } finally {
            setLoading(false);
        }
    };

    const label = added ? `${tx(lang, 'stock.watching')} ${symbol}` : `${tx(lang, 'stock.watch')} ${symbol}`;

    if (variant === "icon") {
        return (
            <button type="button" onClick={handleClick} disabled={loading} className={cn('icon-btn', added && 'is-on')} title={label} aria-label={label} aria-pressed={added}>
                <Star fill={added ? 'currentColor' : 'none'} />
            </button>
        );
    }

    return (
        <button type="button" onClick={handleClick} disabled={loading} className={cn('btn btn-ghost', added && 'is-on')} aria-pressed={added}>
            <Star fill={added ? 'currentColor' : 'none'} />
            {added ? tx(lang, 'stock.watching') : tx(lang, 'stock.watch')}
        </button>
    );
};

export default WatchlistButton;
