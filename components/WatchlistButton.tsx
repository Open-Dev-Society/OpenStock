"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { addToWatchlist, removeFromWatchlist } from "@/lib/actions/watchlist.actions";
import { cn } from "@/lib/utils";

interface WatchlistButtonProps {
    symbol: string;
    company: string;
    isInWatchlist: boolean;
    variant?: "button" | "icon";
    onWatchlistChange?: (symbol: string, added: boolean) => void;
}

const WatchlistButton = ({ symbol, company, isInWatchlist, variant = "button", onWatchlistChange }: WatchlistButtonProps) => {
    const t = useTranslations('WatchlistButton');
    const router = useRouter();
    const [added, setAdded] = useState(isInWatchlist);
    const [loading, setLoading] = useState(false);

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
            toast.success(next ? t('added', { symbol }) : t('removed', { symbol }));
            onWatchlistChange?.(symbol, next);
            router.refresh(); // sidebar lists the watchlist from the layout
        } catch (error) {
            console.error("Watchlist action failed:", error);
            setAdded(!next);
            toast.error(t('updateFailed'));
        } finally {
            setLoading(false);
        }
    };

    const label = added ? t('removeLabel', { symbol }) : t('addLabel', { symbol });

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
            {added ? t('watching') : t('watch')}
        </button>
    );
};

export default WatchlistButton;
