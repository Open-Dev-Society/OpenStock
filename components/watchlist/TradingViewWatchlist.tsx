"use client";

import React, { useEffect, useRef, memo } from 'react';
import { formatSymbolForTradingView } from '@/lib/utils';

interface TradingViewWatchlistProps {
    symbols: string[];
}

function TradingViewWatchlist({ symbols }: TradingViewWatchlistProps) {
    const container = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const widget = container.current;
        if (!widget) return;

        widget.inert = true;
        widget.innerHTML = "";

        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-market-quotes.js";
        script.type = "text/javascript";
        script.async = true;

        const symbolList = symbols.map((symbol) => ({
            name: formatSymbolForTradingView(symbol, 'BMFBOVESPA'),
            displayName: symbol,
        }));

        script.innerHTML = JSON.stringify({
            "width": "100%",
            "height": 550,
            "symbolsGroups": [
                {
                    "name": "Minha carteira B3",
                    "symbols": symbolList
                }
            ],
            "showSymbolLogo": true,
            "isTransparent": true,
            "colorTheme": "dark",
            "locale": "br"
        });

        widget.appendChild(script);
    }, [symbols]);

    return (
        <div className="tradingview-widget-container pointer-events-none select-none border border-white/10 rounded-xl overflow-hidden shadow-2xl bg-black/40 backdrop-blur-md" ref={container}>
            <div className="tradingview-widget-container__widget"></div>
        </div>
    );
}

export default memo(TradingViewWatchlist);
