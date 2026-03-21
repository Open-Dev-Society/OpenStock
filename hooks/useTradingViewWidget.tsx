'use client';
import { useEffect, useRef } from "react";

const useTradingViewWidget = (scriptUrl: string, config: Record<string, unknown>, height: number | string = 600) => {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Clean up previous instance
        containerRef.current.innerHTML = '';

        // Create wrapper with dynamic height support
        // If autosize is true in config, we want 100% height/width
        const isAutosize = config.autosize === true;
        const styleHeight = isAutosize ? '100%' : `${height}px`;

        containerRef.current.innerHTML = `<div class="tradingview-widget-container__widget" style="width: 100%; height: ${styleHeight};"></div>`;

        const script = document.createElement("script");
        script.src = scriptUrl;
        script.async = true;
        script.innerHTML = JSON.stringify(config);

        containerRef.current.appendChild(script);

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        }
    }, [scriptUrl, JSON.stringify(config), height]) // Use stringified config to avoid ref issues

    return containerRef;
}
export default useTradingViewWidget