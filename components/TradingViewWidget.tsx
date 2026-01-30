'use client';

import React, { memo } from 'react';
import useTradingViewWidget from "@/hooks/useTradingViewWidget";
import { cn } from "@/lib/utils";

/**
 * TradingView 小组件属性接口
 */
interface TradingViewWidgetProps {
    title?: string; // 组件标题
    scriptUrl: string; // 脚本 URL
    config: Record<string, unknown>; // TradingView 配置对象
    height?: number; // 高度，默认 600
    className?: string; // 容器类名
}

/**
 * 封装的 TradingView 小组件
 * 使用自定义 hook 加载 TradingView 的外部嵌入脚本
 */
const TradingViewWidget = ({ title, scriptUrl, config, height = 600, className }: TradingViewWidgetProps) => {
    const containerRef = useTradingViewWidget(scriptUrl, config, height);

    return (
        <div className="w-full">
            {title && <h3 className="font-semibold text-2xl text-gray-100 mb-5">{title}</h3>}
            <div className={cn('tradingview-widget-container', className)} ref={containerRef}>
                <div className="tradingview-widget-container__widget" style={{ height, width: "100%" }} />
            </div>
        </div>
    );
}

export default memo(TradingViewWidget);