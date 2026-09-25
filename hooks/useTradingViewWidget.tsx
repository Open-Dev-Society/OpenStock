'use client';
import { useEffect, useRef } from "react";

const useTradingViewWidget = (scriptUrl: string, config: Record<string, unknown>, height: number | string = 600) => {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.inert = true;
        container.innerHTML = '';

        const isAutosize = config.autosize === true;
        const styleHeight = isAutosize ? '100%' : `${height}px`;
        container.innerHTML = `<div class="tradingview-widget-container__widget" style="width: 100%; height: ${styleHeight};"></div>`;

        const script = document.createElement("script");
        script.src = scriptUrl;
        script.async = true;
        script.innerHTML = JSON.stringify(config);
        container.appendChild(script);

        return () => {
            container.innerHTML = '';
        };
    }, [scriptUrl, JSON.stringify(config), height]) // Use stringified config to avoid ref issues

    return containerRef;
}
export default useTradingViewWidget