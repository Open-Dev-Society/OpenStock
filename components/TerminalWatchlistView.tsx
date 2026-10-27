'use client';

import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import ChangePill from '@/components/ChangePill';
import WatchlistVisibilityMenu from '@/components/WatchlistVisibilityMenu';
import { useWatchlistVisibility } from '@/components/useWatchlistVisibility';
import type { YahooDailyQuote } from '@/lib/yahoo';
import { tx, type Lang } from '@/lib/i18n';

export type TerminalRow = {
    tv: string;
    num: string;
    name: string;
    app: string | null;
    quote: YahooDailyQuote | null;
};

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const fmt = (v: number) =>
    v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Client table with per-symbol show/hide (same toggle UX as the Indicators menu).
export default function TerminalWatchlistView({ rows, lang, hasCustom }: { rows: TerminalRow[]; lang: Lang; hasCustom: boolean }) {
    const { hidden } = useWatchlistVisibility();
    const visible = rows.filter((r) => !hidden.includes(r.tv));
    const hiddenCount = rows.length - visible.length;

    return (
        <div>
            <div className="flex items-center justify-between gap-2 px-2 pb-1">
                <span className="text-[11.5px] text-faint">
                    {hiddenCount > 0 ? tx(lang, 'wl.hiddenN').replace('{n}', String(hiddenCount)) : ''}
                </span>
                <WatchlistVisibilityMenu items={rows.map((r) => ({ id: r.tv, label: r.name }))} lang={lang} />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                    <thead>
                        <tr className="text-start text-faint">
                            <th className="px-2 py-2 font-medium">{tx(lang, 'wl.symbol')}</th>
                            <th className="px-2 py-2 text-right font-medium">{tx(lang, 'wl.last')}</th>
                            <th className="px-2 py-2 text-right font-medium">{tx(lang, 'wl.chg')}</th>
                            <th className="px-2 py-2 text-right font-medium">{tx(lang, 'wl.chgpct')}</th>
                            <th className="px-2 py-2 text-right font-medium">{tx(lang, 'wl.vol')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map(({ tv, num, name, app, quote: q }) => {
                            const up = (q?.changePercent ?? 0) >= 0;
                            return (
                                <tr key={tv} className="border-t border-line/60 transition-colors hover:bg-hover/40">
                                    <td className="px-2 py-1.5">
                                        {app ? (
                                            <Link href={`/stocks/${app}`} className="group">
                                                <span className="mono block font-semibold group-hover:text-brand-ink">{num}</span>
                                                <span className="block max-w-36 truncate text-[11px] text-faint">{name}</span>
                                            </Link>
                                        ) : (
                                            <>
                                                <span className="mono block font-semibold">{num === 'TASI' ? 'TASI' : num}</span>
                                                <span className="block max-w-36 truncate text-[11px] text-faint">{name}</span>
                                            </>
                                        )}
                                    </td>
                                    <td className="num px-2 py-1.5 text-right font-semibold">{q ? fmt(q.price) : '—'}</td>
                                    <td className={`num px-2 py-1.5 text-right ${!q ? '' : up ? 'text-up' : 'text-down'}`}>
                                        {q ? `${q.change > 0 ? '+' : ''}${fmt(q.change)}` : '—'}
                                    </td>
                                    <td className="px-2 py-1.5 text-right">{q ? <ChangePill value={q.changePercent} /> : <span className="pill">—</span>}</td>
                                    <td className="num px-2 py-1.5 text-right text-faint">{q && q.volume > 0 ? compact.format(q.volume) : '—'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <p className="px-2 py-2 text-[11.5px] text-faint">
                    {hasCustom ? tx(lang, 'dash.watchlistMine') : tx(lang, 'dash.watchlistDefault')}
                </p>
            </div>
        </div>
    );
}

export function TerminalRowEye({ tv, lang }: { tv: string; lang: Lang }) {
    const { hidden, toggle } = useWatchlistVisibility();
    const off = hidden.includes(tv);
    return (
        <button
            type="button"
            onClick={() => toggle(tv)}
            title={off ? tx(lang, 'wl.showHidden') : tx(lang, 'wl.hide')}
            aria-pressed={!off}
            className="rounded p-1 text-faint hover:bg-hover hover:text-foreground"
        >
            {off ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </button>
    );
}
