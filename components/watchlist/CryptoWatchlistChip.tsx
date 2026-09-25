"use client";

import React, { useState } from "react";
import { Bell, Loader2, X } from "lucide-react";
import { getCryptoQuote } from "@/lib/actions/crypto.actions";
import { removeFromWatchlist } from "@/lib/actions/watchlist.actions";
import CreateAlertModal from "./CreateAlertModal";
import { toast } from "sonner";
import CryptoAssetIcon from "@/components/markets/CryptoAssetIcon";

interface CryptoWatchlistChipProps {
    userId: string;
    symbol: string;
    company: string;
    instrumentId?: string;
    provider?: string;
    providerSymbol?: string;
    quoteCurrency?: string;
}

export default function CryptoWatchlistChip({
    userId,
    symbol,
    company,
    instrumentId,
    provider = 'finnhub',
    providerSymbol,
    quoteCurrency = 'USDT',
}: CryptoWatchlistChipProps) {
    const [price, setPrice] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [loadingPrice, setLoadingPrice] = useState(false);

    const handleBellClick = async () => {
        setLoadingPrice(true);
        try {
            const quote = await getCryptoQuote(providerSymbol ?? symbol);
            if (!quote) {
                toast.error("Crypto quote is unavailable right now");
                return;
            }
            setPrice(quote.price);
            setModalOpen(true);
        } finally {
            setLoadingPrice(false);
        }
    };

    const handleRemove = async () => {
        await removeFromWatchlist(userId, symbol, { instrumentId });
    };

    return (
        <div className="group flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700/80 rounded-full border border-teal-900/70 transition-all">
            <CryptoAssetIcon symbol={providerSymbol ?? symbol} name={company} size="sm" />
            <span className="font-semibold text-sm text-white">{symbol}</span>
            <span className="text-[10px] uppercase tracking-wide text-teal-300">Crypto</span>
            <div className="w-px h-4 bg-gray-600 mx-1" />
            <button
                onClick={handleBellClick}
                className="text-gray-400 hover:text-yellow-400 transition-colors p-0.5"
                title="Create crypto alert"
                disabled={loadingPrice}
            >
                {loadingPrice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
            </button>
            <form action={handleRemove}>
                <button type="submit" className="text-gray-400 hover:text-red-400 transition-colors p-0.5" title="Remove">
                    <X className="w-3.5 h-3.5" />
                </button>
            </form>
            <CreateAlertModal
                userId={userId}
                symbol={symbol}
                companyName={company}
                currentPrice={price}
                assetClass="crypto"
                instrumentId={instrumentId}
                provider={provider}
                providerSymbol={providerSymbol}
                currency={quoteCurrency}
                open={modalOpen}
                onOpenChange={setModalOpen}
            />
        </div>
    );
}
