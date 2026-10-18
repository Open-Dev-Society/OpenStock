'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ChangePill from '@/components/ChangePill';
import PriceFlash from '@/components/PriceFlash';
import { getMarket, isMarketOpen } from '@/lib/markets';
import { getIntradayLast } from '@/lib/actions/yahoo.actions';
import type { ScanRow } from '@/lib/actions/screener.actions';
import { SIGNAL_LABELS } from '@/lib/setup-scan';
import { tx, type Lang } from '@/lib/i18n';

const POLL_MS = 10_000;

// Live screener rows: daily signals stay fixed, session prices refresh every
// minute while Tadawul is open (shared server cache, no page reload needed).
export default function SetupsLiveTable({ rows, lang }: { rows: ScanRow[]; lang: Lang }) {
    const [live, setLive] = useState<Record<string, { price: number; changePercent: number }>>({});
    const [auto, setAuto] = useState(false);
    const [spinning, setSpinning] = useState(false);

    const symbols = rows.map((r) => r.symbol);
    const refresh = async () => {
        if (document.hidden) return;
        setSpinning(true);
        try {
            const quotes = await getIntradayLast(symbols);
            if (Object.keys(quotes).length) setLive(quotes);
        } catch {
            // keep last known prices
        } finally {
            setSpinning(false);
        }
    };

    useEffect(() => {
        let cancelled = false;
        let timer: ReturnType<typeof setInterval> | null = null;
        const load = async () => {
            if (document.hidden || cancelled) return;
            const quotes = await getIntradayLast(symbols).catch(() => ({}));
            if (!cancelled && Object.keys(quotes).length) setLive(quotes);
        };
        if (isMarketOpen(getMarket('sa'))) {
            setAuto(true);
        }
        load();
        timer = setInterval(() => {
            if (!isMarketOpen(getMarket('sa'))) {
                setAuto(false);
                return;
            }
            setAuto(true);
            load();
        }, POLL_MS);
        return () => {
            cancelled = true;
            if (timer) clearInterval(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            <div className="flex items-center justify-between gap-2 px-3 pt-2">
                <span className={`text-[11.5px] font-semibold ${auto ? 'text-up' : 'text-faint'}`}>
                    {auto ? `● ${tx(lang, 'screen.auto')}` : `○ ${tx(lang, 'screen.paused')}`}
                </span>
                <button type="button" onClick={refresh} disabled={spinning} className="pill h-7">
                    {spinning ? '…' : `⟳ ${tx(lang, 'screen.refresh')}`}
                </button>
            </div>
            <ul className="row-list">
                {rows.map(({ symbol, name, setup }) => {
                    const tick = live[symbol];
                    const price = tick?.price ?? setup.price;
                    const changePct = tick?.changePercent ?? setup.changePercent;
                    return (
                        <li key={symbol}>
                            <Link href={`/stocks/${symbol}`} className="search-item-link group">
                                <span className="flex w-24 shrink-0 flex-col">
                                    <span className="mono text-[13px] font-semibold text-brand-ink">{symbol}</span>
                                    {setup.score > 0 && <span className="num text-[11px] text-faint">★ {setup.score}</span>}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="search-item-name block truncate">{name}</span>
                                    {setup.signals.length > 0 && (
                                        <span className="mt-1 flex flex-wrap gap-1">
                                            {setup.signals.map((s) => (
                                                <span key={s} className="pill h-6 px-2 text-[11px]" title={SIGNAL_LABELS[s].ar}>
                                                    {SIGNAL_LABELS[s][lang === 'ar' ? 'ar' : 'en']}
                                                </span>
                                            ))}
                                        </span>
                                    )}
                                </span>
                                <span className="hidden text-right sm:block">
                                    <PriceFlash value={price} className="num block text-[13px] font-semibold">
                                        {price.toFixed(2)}
                                    </PriceFlash>
                                    <span className="num block text-[11px] text-faint">
                                        {setup.rsi != null ? `RSI ${setup.rsi.toFixed(0)}${setup.rsiChange != null ? ` (+${setup.rsiChange.toFixed(1)})` : ''}` : ''}
                                        {setup.volumeRatio != null ? ` · Vol ×${setup.volumeRatio.toFixed(1)}` : ''}
                                    </span>
                                </span>
                                <ChangePill value={changePct} />
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </>
    );
}
