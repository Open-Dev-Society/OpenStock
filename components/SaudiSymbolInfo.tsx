import Link from 'next/link';
import { getYahooDailyQuotes, getTadawulCandles } from '@/lib/actions/yahoo.actions';
import type { YahooDailyQuote } from '@/lib/yahoo';
import { getMarket, isMarketOpen } from '@/lib/markets';
import { TADAWUL_COMPANIES } from '@/lib/tadawul-companies';
import { tadawulDisplayName } from '@/lib/tadawul-search';
import { tx, type Lang } from '@/lib/i18n';

const DIRECTORY = new Map(TADAWUL_COMPANIES.map((c) => [c.symbol, c]));
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 });
const fmt = (v: number) =>
    v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// TradingView-style symbol card: big price, day change, key stats (volume,
// 30-day average volume, live market cap from shares outstanding).
export default async function SaudiSymbolInfo({ symbol, lang }: { symbol: string; lang: Lang }) {
    const upper = symbol.toUpperCase();
    const tv = upper.startsWith('TADAWUL:') ? upper : `TADAWUL:${upper.split('.')[0]}`;
    const dir = DIRECTORY.get(upper.startsWith('TADAWUL:') ? `${upper.split(':')[1]}.SR` : upper);
    const quotes: Record<string, YahooDailyQuote> = await getYahooDailyQuotes([tv]).catch(() => ({}));
    const candles = await getTadawulCandles(symbol, 'D').catch(() => null);
    const q = quotes[tv];
    const vols = (candles?.candles ?? []).slice(-30).map((c) => c.volume).filter((v) => v > 0);
    const avgVol = vols.length ? vols.reduce((a, b) => a + b, 0) / vols.length : null;
    const mcap = q && dir?.sh ? q.price * dir.sh : null;
    const open = isMarketOpen(getMarket('sa'));

    return (
        <div className="flex flex-col gap-1 p-1">
            <div className="flex items-baseline justify-between gap-2 px-2 pt-1">
                <span className="truncate text-[13px] font-semibold">{dir ? tadawulDisplayName(dir) : symbol}</span>
                <Link href="/companies" className="shrink-0 text-[11.5px] text-brand-ink hover:underline">TADAWUL</Link>
            </div>
            {q ? (
                <div className="px-2">
                    <p className="num text-[26px] font-bold tracking-tight">
                        {fmt(q.price)} <small className="text-[13px] font-semibold text-faint">SAR</small>
                    </p>
                    <p className="num flex items-center gap-2 text-[13px]">
                        <span className={q.change >= 0 ? 'text-up' : 'text-down'}>
                            {q.change > 0 ? '+' : ''}{fmt(q.change)} ({q.changePercent >= 0 ? '+' : ''}{q.changePercent.toFixed(2)}%)
                        </span>
                        <span className="text-[11px] text-faint">· {open ? tx(lang, 'info.open') : tx(lang, 'info.closed')}</span>
                    </p>
                </div>
            ) : (
                <p className="px-2 text-[13px] text-faint">{tx(lang, 'tile.noQuote')}</p>
            )}
            <dl className="mt-1 flex flex-col gap-1.5 px-2 pb-1 text-[12.5px]">
                <div className="flex items-center justify-between gap-2">
                    <dt className="text-faint">{tx(lang, 'info.volume')}</dt>
                    <dd className="num font-semibold">{q && q.volume > 0 ? compact.format(q.volume) : '—'}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <dt className="text-faint">{tx(lang, 'info.avgVol')}</dt>
                    <dd className="num font-semibold">{avgVol ? compact.format(avgVol) : '—'}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <dt className="text-faint">{tx(lang, 'info.mcap')}</dt>
                    <dd className="num font-semibold">{mcap ? `${compact.format(mcap)} SAR` : '—'}</dd>
                </div>
            </dl>
        </div>
    );
}
