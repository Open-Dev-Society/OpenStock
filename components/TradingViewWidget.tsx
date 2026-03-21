'use client';

import React, { memo, useState, useEffect } from 'react';
import useTradingViewWidget from "@/hooks/useTradingViewWidget";
import { cn } from "@/lib/utils";
import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TradingViewWidgetProps {
    title?: string;
    scriptUrl: string;
    config: Record<string, unknown>;
    height?: number;
    className?: string;
    allowExpand?: boolean;
}

const TradingViewWidget = ({ title, scriptUrl, config, height = 600, className, allowExpand = false }: TradingViewWidgetProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [windowHeight, setWindowHeight] = useState(0);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setWindowHeight(window.innerHeight);
            const handleResize = () => setWindowHeight(window.innerHeight);
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);

    const currentHeight = isExpanded ? windowHeight : height;

    const widgetConfig = {
        ...config,
        height: currentHeight,
        width: "100%",
        autosize: true,
    };

    const containerRef = useTradingViewWidget(scriptUrl, widgetConfig, currentHeight);

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div className={cn("w-full transition-all duration-300", isExpanded && "fixed inset-0 z-[9999] bg-background")}>
            <div className={cn("w-full relative group", isExpanded && "h-full w-full")}>
                {title && !isExpanded && <h3 className="font-semibold text-2xl text-gray-100 mb-5">{title}</h3>}

                {allowExpand && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleExpand}
                        className={cn(
                            "absolute top-2 right-2 z-10 hover:bg-background/50 text-muted-foreground hover:text-foreground transition-all duration-200",
                            !isExpanded ? "opacity-0 group-hover:opacity-100" : "bg-background/20"
                        )}
                        title={isExpanded ? "Minimize" : "Click to expand"}
                    >
                        {isExpanded ? <Minimize2 className="h-6 w-6" /> : <Maximize2 className="h-6 w-6" />}
                    </Button>
                )}

                <div className={cn('tradingview-widget-container', className, isExpanded && "h-full")} ref={containerRef}>
                    <div className="tradingview-widget-container__widget" style={{ height: currentHeight, width: "100%" }} />
                </div>
            </div>
        </div>
    );
}

export default memo(TradingViewWidget);
