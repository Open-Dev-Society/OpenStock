"use client";

import React, { useState } from "react";
import { removeFromWatchlist } from "@/lib/actions/watchlist.actions";
import { getQuote } from "@/lib/actions/finnhub.actions";
import { Bell, Loader2, X } from "lucide-react";
import CreateAlertModal from "./CreateAlertModal";

interface WatchlistStockChipProps {
    symbol: string;
    userId: string;
}

export default function WatchlistStockChip({ symbol, userId }: WatchlistStockChipProps) {
    const [price, setPrice] = useState<number>(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [loadingPrice, setLoadingPrice] = useState(false);

    const handleBellClick = async () => {
        setLoadingPrice(true);
        try {
            const data = await getQuote(symbol);
            if (data && data.c) {
                setPrice(data.c);
                setModalOpen(true);
            } else {
                // Fallback if fetch fails
                setPrice(0);
                setModalOpen(true);
            }
        } catch (err) {
            console.error(err);
            setPrice(0);
            setModalOpen(true);
        } finally {
            setLoadingPrice(false);
        }
    };

    const handleRemove = async () => {
        await removeFromWatchlist(userId, symbol);
    };

    return (
        <div className="group flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700/80 rounded-full border border-gray-700 transition-all">
            <span className="font-semibold text-sm text-white">{symbol}</span>

            {/* Divider */}
            <div className="w-px h-4 bg-gray-600 mx-1"></div>

            {/* Alert Button */}
            <button
                onClick={handleBellClick}
                className="text-gray-400 hover:text-yellow-400 transition-colors p-0.5"
                title="Create Alert"
                disabled={loadingPrice}
            >
                {loadingPrice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
            </button>

            {/* Remove Button */}
            <form action={handleRemove}>
                <button type="submit" className="text-gray-400 hover:text-red-400 transition-colors p-0.5" title="Remove">
                    <X className="w-3.5 h-3.5" />
                </button>
            </form>

            <CreateAlertModal
                userId={userId}
                symbol={symbol}
                currentPrice={price}
                open={modalOpen}
                onOpenChange={setModalOpen}
            />
        </div>
    );
}
