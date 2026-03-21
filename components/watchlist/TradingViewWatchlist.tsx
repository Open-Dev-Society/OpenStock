"use client";

import React, { useEffect, useRef, memo } from 'react';
import { formatSymbolForTradingView } from '@/lib/utils';

interface TradingViewWatchlistProps {
    symbols: string[];
}

function TradingViewWatchlist({ symbols }: TradingViewWatchlistProps) {
    const container = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!container.current) return;

        // Clear previous widget if any (though React key usually handles this, safety check)
        container.current.innerHTML = "";

        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-market-quotes.js";
        script.type = "text/javascript";
        script.async = true;

        // Map user symbols to TradingView format
        // TradingView is smart enough to handle "AAPL", "GOOG" usually, but "NASDAQ:AAPL" is safer.
        // Since we don't have exchange data easily, we'll try raw symbol. 
        // Ideally we'd prefix "NASDAQ:" or "NYSE:" but let's test without first.
        const symbolList = symbols.map(s => ({
            name: formatSymbolForTradingView(s),
            displayName: s
        }));

        script.innerHTML = JSON.stringify({
            "width": "100%",
            "height": 550,
            "symbolsGroups": [
                {
                    "name": "My Watchlist",
                    "symbols": symbolList
                }
            ],
            "showSymbolLogo": true,
            "isTransparent": true,
            "colorTheme": "dark", // We can make this dynamic if needed
            "locale": "en"
        });

        container.current.appendChild(script);
    }, [symbols]);

    return (
        <div className="tradingview-widget-container border border-white/10 rounded-xl overflow-hidden shadow-2xl bg-black/40 backdrop-blur-md" ref={container}>
            <div className="tradingview-widget-container__widget"></div>
        </div>
    );
}

export default memo(TradingViewWatchlist);
