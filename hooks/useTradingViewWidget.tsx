'use client';
import { useEffect, useRef } from "react";

const useTradingViewWidget = (scriptUrl: string, config: Record<string, unknown>) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const serializedConfig = JSON.stringify(config);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Clean up previous instance
        container.innerHTML = '';

        container.innerHTML = '<div class="tradingview-widget-container__widget" style="width: 100%; height: 100%;"></div>';

        const script = document.createElement("script");
        script.src = scriptUrl;
        script.async = true;
        script.innerHTML = serializedConfig;

        container.appendChild(script);

        return () => {
            container.innerHTML = '';
        }
    }, [scriptUrl, serializedConfig])

    return containerRef;
}
export default useTradingViewWidget
