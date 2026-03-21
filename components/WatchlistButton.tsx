"use client";
import React, { useMemo, useState } from "react";
import { addToWatchlist, removeFromWatchlist } from "@/lib/actions/watchlist.actions";
import { toast } from "sonner";

interface WatchlistButtonProps {
    symbol: string;
    company: string;
    isInWatchlist: boolean;
    showTrashIcon?: boolean;
    type?: "button" | "icon";
    userId?: string; // Made optional for backward compat, but required for actions
    onWatchlistChange?: (symbol: string, added: boolean) => void;
}

const WatchlistButton = ({
    symbol,
    company,
    isInWatchlist,
    showTrashIcon = false,
    type = "button",
    userId,
    onWatchlistChange,
}: WatchlistButtonProps) => {
    const [added, setAdded] = useState<boolean>(!!isInWatchlist);
    const [loading, setLoading] = useState(false);

    const label = useMemo(() => {
        if (type === "icon") return added ? "" : "";
        return added ? "Remove from Watchlist" : "Add to Watchlist";
    }, [added, type]);

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent link navigation if inside a link

        if (!userId && !onWatchlistChange) {
            console.error("WatchlistButton: userId or onWatchlistChange is required");
            toast.error("Please sign in to modify watchlist");
            return;
        }

        const next = !added;
        setAdded(next); // Optimistic update
        setLoading(true);

        try {
            if (userId) {
                if (next) {
                    await addToWatchlist(userId, symbol, company);
                    toast.success(`${symbol} added to watchlist`);
                } else {
                    await removeFromWatchlist(userId, symbol);
                    toast.success(`${symbol} removed from watchlist`);
                }
            }

            // Call external handler if provided (e.g. for UI refresh)
            onWatchlistChange?.(symbol, next);
        } catch (error) {
            console.error("Watchlist action failed:", error);
            setAdded(!next); // Revert on error
            toast.error("Failed to update watchlist");
        } finally {
            setLoading(false);
        }
    };

    if (type === "icon") {
        return (
            <button
                type="button"
                title={added ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
                aria-label={added ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
                className={`flex items-center justify-center p-2 rounded-full transition-all ${added ? "text-yellow-400 hover:bg-yellow-400/10" : "text-gray-400 hover:text-white hover:bg-white/10"} ${loading ? "opacity-50 cursor-wait" : ""}`}
                onClick={handleClick}
                disabled={loading}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill={added ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="w-6 h-6"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.385a.563.563 0 00-.182-.557L3.04 10.385a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345l2.125-5.111z"
                    />
                </svg>
            </button>
        );
    }

    return (
        <button
            type="button"
            className={`watchlist-btn ${added ? "watchlist-remove" : ""} ${loading ? "opacity-70 cursor-wait" : ""}`}
            onClick={handleClick}
            disabled={loading}
        >
            {showTrashIcon && added ? (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5 mr-2"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 4v6m4-6v6m4-6v6" />
                </svg>
            ) : null}
            <span>{loading ? "Updating..." : label}</span>
        </button>
    );
};

export default WatchlistButton;