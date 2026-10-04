import Link from 'next/link';
import ChangePill from '@/components/ChangePill';
import { getYahooDailyQuotes } from '@/lib/actions/yahoo.actions';
import { tx, type Lang } from '@/lib/i18n';

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const fmt = (v: number) =>
    v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toTv = (symbol: string) => {
    const upper = symbol.toUpperCase();
    if (upper.startsWith('TADAWUL:')) return upper;
    if (/^\d+\.SR$/.test(upper)) return `TADAWUL:${upper.split('.')[0]}`;
    return upper;
};

const toApp = (tvSymbol: string) => {
    const m = /^TADAWUL:(\d+)$/.exec(tvSymbol);
    return m ? `${m[1]}.SR` : null;
};

// Quotes table for a named list (e.g. "mishal watch list"), Yahoo-powered.
export default async function NamedListTable({ symbols, lang }: { symbols: { symbol: string; company: string }[]; lang: Lang }) {
    const tvSymbols = symbols.map((s) => toTv(s.symbol));
    const nameOf = new Map(symbols.map((s) => [toTv(s.symbol), s.company]));
    const quotes = await getYahooDailyQuotes(tvSymbols);

    if (tvSymbols.length === 0) return <p className="search-list-indicator">{tx(lang, 'wl.listEmpty')}</p>;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
                <thead>
                    <tr className="text-start text-faint">
                        <th className="px-3 py-2 font-medium">{tx(lang, 'wl.symbol')}</th>
                        <th className="px-3 py-2 text-right font-medium">{tx(lang, 'wl.last')}</th>
                        <th className="px-3 py-2 text-right font-medium">{tx(lang, 'wl.chg')}</th>
                        <th className="px-3 py-2 text-right font-medium">{tx(lang, 'wl.chgpct')}</th>
                        <th className="px-3 py-2 text-right font-medium">{tx(lang, 'wl.vol')}</th>
                    </tr>
                </thead>
                <tbody>
                    {tvSymbols.map((tv) => {
                        const q = quotes[tv];
                        const app = toApp(tv);
                        const up = (q?.changePercent ?? 0) >= 0;
                        return (
                            <tr key={tv} className="border-t border-line/60 transition-colors hover:bg-hover/40">
                                <td className="px-3 py-2">
                                    {app ? (
                                        <Link href={`/stocks/${app}`} className="group">
                                            <span className="mono block font-semibold group-hover:text-brand-ink">{tv.replace('TADAWUL:', '')}</span>
                                            <span className="block max-w-52 truncate text-[11.5px] text-faint">{nameOf.get(tv)}</span>
                                        </Link>
                                    ) : (
                                        <>
                                            <span className="mono block font-semibold">{tv.replace('TADAWUL:', '')}</span>
                                            <span className="block max-w-52 truncate text-[11.5px] text-faint">{nameOf.get(tv)}</span>
                                        </>
                                    )}
                                </td>
                                <td className="num px-3 py-2 text-right font-semibold">{q ? fmt(q.price) : '—'}</td>
                                <td className={`num px-3 py-2 text-right ${!q ? '' : up ? 'text-up' : 'text-down'}`}>
                                    {q ? `${q.change > 0 ? '+' : ''}${fmt(q.change)}` : '—'}
                                </td>
                                <td className="px-3 py-2 text-right">{q ? <ChangePill value={q.changePercent} /> : <span className="pill">—</span>}</td>
                                <td className="num px-3 py-2 text-right text-faint">{q && q.volume > 0 ? compact.format(q.volume) : '—'}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <p className="px-3 py-2 text-[11.5px] text-faint">{tx(lang, 'wl.delayedFoot')}</p>
        </div>
    );
}
