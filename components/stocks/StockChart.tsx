'use client';

import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import TradingViewWidget from "@/components/TradingViewWidget";
import Panel from "@/components/Panel";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CANDLE_CHART_WIDGET_CONFIG } from "@/lib/constants";

// The free embed can't save indicators added inside it, so the ones picked here are kept per browser and
// passed in as `studies` on every chart. Each id was checked on a live advanced-chart embed.
const INDICATORS = [
    { id: 'STD;SMA', labelKey: 'sma' },
    { id: 'STD;EMA', labelKey: 'ema' },
    { id: 'STD;Bollinger_Bands', labelKey: 'bollingerBands' },
    { id: 'STD;VWAP', labelKey: 'vwap' },
    { id: 'STD;RSI', labelKey: 'rsi' },
    { id: 'STD;MACD', labelKey: 'macd' },
    { id: 'STD;Stochastic', labelKey: 'stochastic' },
    { id: 'STD;Average_True_Range', labelKey: 'atr' },
] as const;
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

export default function StockChart({ tvSymbol, scriptUrl }: { tvSymbol: string; scriptUrl: string }) {
    const t = useTranslations('StockChart');
    const tw = useTranslations('TradingViewWidget');
    const locale = useLocale();
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
                <SlidersHorizontal /> {t('indicatorsButton')}{studies?.length ? <span className="num text-faint">{studies.length}</span> : null}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-[12px] font-normal text-faint">{t('keptNote')}</DropdownMenuLabel>
                {INDICATORS.map(({ id, labelKey }) => (
                    <DropdownMenuCheckboxItem key={id} checked={studies?.includes(id) ?? false} onCheckedChange={() => toggle(id)} onSelect={(e) => e.preventDefault()}>
                        {t(`indicators.${labelKey}`)}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <Panel title={t('title')} sub={t('sub')} action={menu}>
            {studies ? (
                <TradingViewWidget scriptUrl={scriptUrl} config={{ ...CANDLE_CHART_WIDGET_CONFIG(tvSymbol, locale), studies }} height={CHART_HEIGHT} allowExpand
                    labels={{ fullScreen: tw('fullScreen'), exitFullScreen: tw('exitFullScreen'), exitFullScreenHint: tw('exitFullScreenHint') }} />
            ) : (
                <div className="tv-frame" style={{ height: CHART_HEIGHT }} />
            )}
        </Panel>
    );
}
