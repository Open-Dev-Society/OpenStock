"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Search, Star } from "lucide-react";
import CreateAlertModal from "./CreateAlertModal";
import AddToListMenu from "./AddToListMenu";
import WatchlistButton from "@/components/WatchlistButton";
import ChangePill from "@/components/ChangePill";
import PriceFlash from "@/components/PriceFlash";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { SearchButton } from "@/components/SearchCommand";
import { formatNumber } from "@/lib/utils";
import { hasFinnhubQuotes } from "@/lib/markets";
import { tx, type Lang } from "@/lib/i18n";
import { arDigits } from "@/lib/i18n";
import { saudiSymbolNameAr } from "@/lib/saudi-symbols";
import type { getWatchlistData } from "@/lib/actions/finnhub.actions";
import Price from "@/components/Price";

type Row = Awaited<ReturnType<typeof getWatchlistData>>[number];
const SUGGESTIONS = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'AMZN'];

export default function WatchlistTable({ initialRows, lists = [], lang }: { initialRows: Row[]; lists?: { id: string; name: string }[]; lang: Lang }) {
    const [baseRows, setBaseRows] = useState(initialRows);
    const live = useLiveQuotes(baseRows.map((r) => r.symbol));

    // Server re-renders (after add/remove) replace the local copy
    useEffect(() => setBaseRows(initialRows), [initialRows]);

    const rows = baseRows.map((r) => {
        const q = live[r.symbol];
        return q?.c ? { ...r, price: q.c, change: q.d ?? r.change, changePercent: q.dp ?? r.changePercent } : r;
    });

    if (rows.length === 0) {
        return (
            <div className="empty-state">
                <span className="empty-icon"><Star className="size-5" /></span>
                <h3>{tx(lang, 'wl.empty')}</h3>
                <p className="max-w-sm">{tx(lang, 'wl.emptySub')}</p>
                <SearchButton className="btn btn-primary mt-3"><Search /> {tx(lang, 'wl.search')}</SearchButton>
                <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                    {SUGGESTIONS.map((s) => (
                        <Link key={s} href={`/stocks/${s}`} dir="ltr" className="pill mono h-7 px-3 hover:bg-hover hover:text-foreground">{s}</Link>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-[14px]">
            <table className="data-table">
                <thead>
                    <tr>
                        <th>{tx(lang, 'wl.company')}</th>
                        <th className="is-num">{tx(lang, 'wl.price')}</th>
                        <th className="is-num">{tx(lang, 'wl.today')}</th>
                        <th className="is-num">{tx(lang, 'wl.change')}</th>
                        <th className="is-num">{tx(lang, 'wl.mcap')}</th>
                        <th className="w-[88px]"><span className="sr-only">{tx(lang, 'wl.actions')}</span></th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        // The Saudi table carries the Arabic name; the quote feed is English-only.
                        const company = (lang === 'ar' ? saudiSymbolNameAr(row.symbol) : null) ?? row.name;
                        return (
                        <tr key={row.symbol}>
                            <td className="max-w-[320px]">
                                <Link href={`/stocks/${row.symbol}`} className="group flex items-center gap-3">
                                    {row.logo ? (
                                        <span className="logo-well"><img src={row.logo} alt="" className="size-full object-contain p-1" /></span>
                                    ) : (
                                        <span className="logo-well is-empty">{row.symbol[0]}</span>
                                    )}
                                    <span className="min-w-0">
                                        <span dir="auto" className="block truncate font-semibold text-foreground group-hover:text-brand-ink transition-colors" title={company}>{company}</span>
                                        <span dir="ltr" className="mono block text-[12px] text-faint">{row.symbol}</span>
                                    </span>
                                </Link>
                            </td>
                            <td className="is-num font-semibold text-foreground">
                                <PriceFlash value={row.price} className="px-1">{row.price ? <Price value={row.price} currency={row.currency} lang={lang} /> : '—'}</PriceFlash>
                            </td>
                            <td className="is-num"><ChangePill value={row.price ? row.changePercent : null} lang={lang} /></td>
                            <td className="is-num text-muted-foreground">{row.price ? `${row.change > 0 ? '+' : ''}${arDigits(row.change.toFixed(2), lang)}` : '—'}</td>
                            <td className="is-num text-muted-foreground">{row.marketCap ? formatNumber(row.marketCap, lang) : '—'}</td>
                            <td>
                                <div className="flex items-center justify-end gap-1">
                                    <AddToListMenu symbol={row.symbol} company={row.name} lists={lists} />
                                    {hasFinnhubQuotes(row.symbol) ? (
                                        <CreateAlertModal symbol={row.symbol} currentPrice={row.price} currency={row.currency} lang={lang}>
                                            <button type="button" className="icon-btn" title={`Set a price alert for ${row.symbol}`} aria-label={`Set a price alert for ${row.symbol}`}>
                                                <Bell />
                                            </button>
                                        </CreateAlertModal>
                                    ) : (
                                        <span className="icon-btn opacity-40" title={tx(lang, 'alert.tooltipUsOnly')}><Bell /></span>
                                    )}
                                    <WatchlistButton
                                        symbol={row.symbol}
                                        company={row.name}
                                        isInWatchlist
                                        variant="icon"
                                        lang={lang}
                                        onWatchlistChange={(sym, added) => {
                                            if (!added) setBaseRows((current) => current.filter((r) => r.symbol !== sym));
                                        }}
                                    />
                                </div>
                            </td>
                        </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
