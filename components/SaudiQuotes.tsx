import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import ChangePill from '@/components/ChangePill';
import { getYahooDailyQuotes } from '@/lib/actions/yahoo.actions';
import { tadawulAppSymbol } from '@/lib/yahoo';
import type { Market } from '@/lib/markets';

const fmt = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const symbolsOf = (market: Market) => [...new Set(market.groups.flatMap((g) => g.symbols.map(([s]) => s)))];

// Our own quotes table for Tadawul (Yahoo daily quotes, SAR): TradingView's market-quotes widget shows no TADAWUL values in free embeds.
export default async function SaudiQuotesTable({ market }: { market: Market }) {
    const quotes = await getYahooDailyQuotes(symbolsOf(market));

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
                <thead>
                    <tr className="text-left text-faint">
                        <th className="px-3 py-2 font-medium">Company</th>
                        <th className="px-3 py-2 text-right font-medium">Price</th>
                        <th className="px-3 py-2 text-right font-medium">Change</th>
                        <th className="px-3 py-2 text-right font-medium">Change %</th>
                    </tr>
                </thead>
                {market.groups.map((group) => (
                    <tbody key={group.title}>
                        <tr>
                            <td colSpan={4} className="kicker px-3 pt-3 pb-1">{group.title}</td>
                        </tr>
                        {group.symbols.map(([tvSymbol, name]) => {
                            const q = quotes[tvSymbol];
                            const appSymbol = tadawulAppSymbol(tvSymbol);
                            return (
                                <tr key={tvSymbol} className="border-t border-line/60 transition-colors hover:bg-hover/40">
                                    <td className="px-3 py-2">
                                        <Link href={`/stocks/${appSymbol}`} className="font-semibold hover:text-brand-ink">
                                            {name} <span className="mono text-[11px] text-faint">{appSymbol}</span>
                                        </Link>
                                    </td>
                                    <td className="num px-3 py-2 text-right font-semibold">{q ? fmt(q.price) : '—'}</td>
                                    <td className={`num px-3 py-2 text-right ${q && q.change < 0 ? 'text-down' : 'text-up'}`}>
                                        {q ? `${q.change > 0 ? '+' : ''}${fmt(q.change)}` : '—'}
                                    </td>
                                    <td className="px-3 py-2 text-right"><ChangePill value={q?.changePercent} /></td>
                                </tr>
                            );
                        })}
                    </tbody>
                ))}
            </table>
            <p className="px-3 py-2 text-[11.5px] text-faint">Prices in SAR via Yahoo Finance, delayed about 15 minutes.</p>
        </div>
    );
}

// Today's biggest movers across the same groups, ranked by day change %
export async function SaudiMovers({ market, count = 8 }: { market: Market; count?: number }) {
    const symbols = symbolsOf(market);
    const nameOf = Object.fromEntries(market.groups.flatMap((g) => g.symbols));
    const quotes = await getYahooDailyQuotes(symbols);
    const ranked = symbols
        .flatMap((symbol) => (quotes[symbol] ? [{ symbol, name: nameOf[symbol], quote: quotes[symbol] }] : []))
        .sort((a, b) => Math.abs(b.quote.changePercent) - Math.abs(a.quote.changePercent))
        .slice(0, count);
    const max = Math.max(0.01, ...ranked.map((r) => Math.abs(r.quote.changePercent)));

    if (ranked.length === 0) return <p className="search-list-indicator">Quotes unavailable right now.</p>;

    return (
        <ul className="flex flex-col gap-1 p-1">
            {ranked.map(({ symbol, name, quote }) => {
                const up = quote.changePercent >= 0;
                return (
                    <li key={symbol}>
                        <Link href={`/stocks/${tadawulAppSymbol(symbol)}`} className="flex items-center gap-3 rounded-[10px] px-3 py-2 transition-colors hover:bg-hover/60">
                            <span className={up ? 'text-up' : 'text-down'}>
                                {up ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13.5px] font-semibold">{name}</span>
                                <span className="mono block text-[11.5px] text-faint">{symbol.replace('TADAWUL:', '')}</span>
                            </span>
                            <span className="relative h-1.5 w-20 overflow-hidden rounded-full bg-hover">
                                <span
                                    className={`absolute inset-y-0 rounded-full ${up ? 'left-0 bg-up' : 'right-0 bg-down'}`}
                                    style={{ width: `${(Math.abs(quote.changePercent) / max) * 100}%` }}
                                />
                            </span>
                            <ChangePill value={quote.changePercent} />
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
}
