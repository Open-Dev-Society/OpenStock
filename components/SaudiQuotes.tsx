import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import ChangePill from '@/components/ChangePill';
import { getYahooDailyQuotes } from '@/lib/actions/yahoo.actions';
import { tx, type Lang } from '@/lib/i18n';
import type { Market } from '@/lib/markets';

const fmt = (v: number) =>
    v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Own quotes table for Tadawul (Yahoo daily quotes, SAR), since TradingView
// market-quotes widgets show no TADAWUL values in free embeds.
export default async function SaudiQuotesTable({ market, lang }: { market: Market; lang: Lang }) {
    const symbols = [...new Set(market.groups.flatMap((g) => g.symbols.map(([s]) => s)))];
    const quotes = await getYahooDailyQuotes(symbols);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
                <thead>
                    <tr className="text-start text-faint">
                        <th className="px-3 py-2 font-medium">{tx(lang, 'wl.company')}</th>
                        <th className="px-3 py-2 text-right font-medium">{tx(lang, 'wl.price')}</th>
                        <th className="px-3 py-2 text-right font-medium">{tx(lang, 'wl.change')}</th>
                        <th className="px-3 py-2 text-right font-medium">{tx(lang, 'wl.chgpct')}</th>
                    </tr>
                </thead>
                {market.groups.map((group) => (
                    <tbody key={group.title}>
                        <tr>
                            <td colSpan={4} className="kicker px-3 pt-3 pb-1">{group.title}</td>
                        </tr>
                        {group.symbols.map(([tvSymbol, name]) => {
                            const q = quotes[tvSymbol];
                            const appSymbol = tvSymbol.startsWith('TADAWUL:') && /^\d+$/.test(tvSymbol.split(':')[1])
                                ? `${tvSymbol.split(':')[1]}.SR`
                                : null;
                            return (
                                <tr key={tvSymbol} className="border-t border-line/60 transition-colors hover:bg-hover/40">
                                    <td className="px-3 py-2">
                                        {appSymbol ? (
                                            <Link href={`/stocks/${appSymbol}`} className="font-semibold hover:text-brand-ink">
                                                {name} <span className="mono text-[11px] text-faint">{appSymbol}</span>
                                            </Link>
                                        ) : (
                                            <span className="font-semibold">{name}</span>
                                        )}
                                    </td>
                                    <td className="num px-3 py-2 text-right font-semibold">{q ? fmt(q.price) : '—'}</td>
                                    <td className={`num px-3 py-2 text-right ${q && q.change < 0 ? 'text-down' : 'text-up'}`}>
                                        {q ? `${q.change > 0 ? '+' : ''}${fmt(q.change)}` : '—'}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        {q ? <ChangePill value={q.changePercent} /> : <span className="pill">—</span>}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                ))}
            </table>
            <p className="px-3 py-2 text-[11.5px] text-faint">{tx(lang, 'wl.delayedFoot')}</p>
        </div>
    );
}

// Today's biggest movers across the same groups, ranked by day change %.
export async function SaudiMovers({ market, count = 8, lang }: { market: Market; count?: number; lang: Lang }) {
    const symbols = [...new Set(market.groups.flatMap((g) => g.symbols.map(([s]) => s)))];
    const nameOf = Object.fromEntries(market.groups.flatMap((g) => g.symbols));
    const quotes = await getYahooDailyQuotes(symbols);
    const ranked = symbols
        .map((s) => ({ symbol: s, name: nameOf[s] as string, quote: quotes[s] }))
        .filter((r) => r.quote)
        .sort((a, b) => Math.abs(b.quote!.changePercent) - Math.abs(a.quote!.changePercent))
        .slice(0, count);
    const max = Math.max(0.01, ...ranked.map((r) => Math.abs(r.quote!.changePercent)));

    if (ranked.length === 0) return <p className="search-list-indicator">{tx(lang, 'wl.noData')}</p>;

    return (
        <ul className="flex flex-col gap-1 p-1">
            {ranked.map(({ symbol, name, quote }) => {
                const up = (quote!.changePercent ?? 0) >= 0;
                const appSymbol = symbol.startsWith('TADAWUL:') ? `${symbol.split(':')[1]}.SR` : null;
                return (
                    <li key={symbol}>
                        <Link
                            href={appSymbol ? `/stocks/${appSymbol}` : '#'}
                            className="group flex items-center gap-3 rounded-[10px] px-3 py-2 transition-colors hover:bg-hover/60"
                        >
                            <span className={up ? 'text-up' : 'text-down'}>
                                {up ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13.5px] font-semibold">{name}</span>
                                <span className="mono block text-[11.5px] text-faint">{symbol.replace('TADAWUL:', '')}</span>
                            </span>
                            <span className="relative h-1.5 w-20 overflow-hidden rounded-full bg-hover">
                                <span
                                    className={`absolute inset-y-0 rounded-full ${up ? 'bg-up' : 'bg-down'} ${up ? 'left-0' : 'right-0'}`}
                                    style={{ width: `${(Math.abs(quote!.changePercent) / max) * 100}%` }}
                                />
                            </span>
                            <ChangePill value={quote!.changePercent} />
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
}
