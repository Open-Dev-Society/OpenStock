'use client';

import React, { memo, useState, useEffect } from 'react';
import useTradingViewWidget from "@/hooks/useTradingViewWidget";
import { cn } from "@/lib/utils";
import { Maximize2, Minimize2 } from 'lucide-react';

interface TradingViewWidgetProps {
    scriptUrl: string;
    config: Record<string, unknown>;
    height?: number;
    className?: string;
    allowExpand?: boolean;
}

// Fullscreen resizes the same element in place: moving or re-creating the embed would reset the chart.
const TradingViewWidget = ({ scriptUrl, config, height = 600, className, allowExpand = false }: TradingViewWidgetProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (!isExpanded) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsExpanded(false);
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onKey);
        };
    }, [isExpanded]);

    const containerRef = useTradingViewWidget(scriptUrl, { ...config, width: "100%", height: "100%", autosize: true });

    return (
        <>
            {isExpanded && <div className="fixed inset-0 z-50 bg-page/70 backdrop-blur-[3px]" onClick={() => setIsExpanded(false)} />}
            {/* Height lives on the frame: TradingView's autosize overwrites the container's own height with 100% */}
            <div
                className={cn("tv-frame group", isExpanded && "fixed inset-3 z-50 shadow-[0_0_0_4px_var(--frame),0_24px_60px_oklch(0_0_0/0.6)]")}
                style={isExpanded ? undefined : { height }}
            >
                {allowExpand && (
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={cn("icon-btn absolute top-2 right-2 z-10 bg-card/80", !isExpanded && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100")}
                        aria-label={isExpanded ? "Exit full screen" : "Full screen"}
                        title={isExpanded ? "Exit full screen (Esc)" : "Full screen"}
                    >
                        {isExpanded ? <Minimize2 /> : <Maximize2 />}
                    </button>
                )}

                <div
                    ref={containerRef}
                    className={cn('tradingview-widget-container', className)}
                    style={{ height: '100%', width: '100%' }}
                />
            </div>
        </>
    );
}

export default memo(TradingViewWidget);
