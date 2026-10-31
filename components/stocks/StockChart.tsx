'use client';

import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import TradingViewWidget from "@/components/TradingViewWidget";
import Panel from "@/components/Panel";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CANDLE_CHART_WIDGET_CONFIG } from "@/lib/constants";
import { indicatorLabel, tx, type Lang } from "@/lib/i18n";

// The free embed can't save indicators added inside it, so the ones picked here are kept per browser and
// passed in as `studies` on every chart. Each id was checked on a live advanced-chart embed.
const INDICATORS = [
    { id: 'STD;SMA', label: 'Moving average (SMA)' },
    { id: 'STD;EMA', label: 'Exponential MA (EMA)' },
    { id: 'STD;Bollinger_Bands', label: 'Bollinger Bands' },
    { id: 'STD;VWAP', label: 'VWAP' },
    { id: 'STD;RSI', label: 'RSI' },
    { id: 'STD;MACD', label: 'MACD' },
    { id: 'STD;Stochastic', label: 'Stochastic' },
    { id: 'STD;Average_True_Range', label: 'ATR' },
];
const STORAGE_KEY = 'openstock:chart-indicators';
const CHART_HEIGHT = 560;

const readSaved = (): string[] => {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
        return Array.isArray(saved) ? INDICATORS.map((i) => i.id).filter((id) => saved.includes(id)) : [];
    } catch {
        return [];
    }
};

export default function StockChart({ tvSymbol, scriptUrl, lang = 'en' }: { tvSymbol: string; scriptUrl: string; lang?: Lang }) {
    // null until the browser's saved list is read, so the chart mounts once with the right indicators
    const [studies, setStudies] = useState<string[] | null>(null);
    useEffect(() => setStudies(readSaved()), []);

    const toggle = (id: string) => {
        const current = studies ?? [];
        const next = INDICATORS.map((i) => i.id).filter((i) => (i === id ? !current.includes(id) : current.includes(i)));
        setStudies(next);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* private mode: still applies for this visit */ }
    };

    const menu = (
        <DropdownMenu>
            <DropdownMenuTrigger className="btn btn-ghost h-8 px-2.5 text-[13px]" disabled={!studies}>
                <SlidersHorizontal /> {tx(lang, 'chart.indicators')}{studies?.length ? <span className="num text-faint">{studies.length}</span> : null}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-[12px] font-normal text-faint">{tx(lang, 'chart.indicatorsNote')}</DropdownMenuLabel>
                {INDICATORS.map(({ id, label }) => (
                    <DropdownMenuCheckboxItem key={id} checked={studies?.includes(id) ?? false} onCheckedChange={() => toggle(id)} onSelect={(e) => e.preventDefault()}>
                        {indicatorLabel(lang, id, label)}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <Panel title={tx(lang, 'stock.chart')} sub={tx(lang, 'stock.chartLive')} action={menu}>
            {studies ? (
                <TradingViewWidget scriptUrl={scriptUrl} config={{ ...CANDLE_CHART_WIDGET_CONFIG(tvSymbol), studies }} height={CHART_HEIGHT} allowExpand />
            ) : (
                <div className="tv-frame" style={{ height: CHART_HEIGHT }} />
            )}
        </Panel>
    );
}
