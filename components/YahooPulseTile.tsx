import Link from 'next/link';
import { LineChart } from 'lucide-react';
import ChangePill from '@/components/ChangePill';
import { yahooAppSymbol, type YahooDailyQuote } from '@/lib/yahoo';
import { arDigits, tx, type Lang } from '@/lib/i18n';
import { saudiSymbolNameAr } from '@/lib/saudi-symbols';

const formatAmount = (value: number) =>
    value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Pulse tile priced from Yahoo daily quotes. Used for Tadawul, whose TradingView quote widgets are blocked in free embeds,
// and Warsaw, whose embeds are end of day only.
export default function YahooPulseTile({ tvSymbol, label, quote, lang = 'en' }: { tvSymbol: string; label: string; quote: YahooDailyQuote | null; lang?: Lang }) {
    const appSymbol = yahooAppSymbol(tvSymbol);
    // The Arabic table names the company the way the Arabic press does; the market config is English.
    const title = (lang === 'ar' && appSymbol ? saudiSymbolNameAr(appSymbol) : null) ?? label;
    const body = (
        <>
            <div className="bento-head">
                <span className="bento-ico"><LineChart /></span>
                <span className="truncate">{title}</span>
                <span className="mono ms-auto text-xs text-faint">{tvSymbol.split(':').pop()}</span>
            </div>
            <p className="bento-value self-start num">
                {/* Indices are in points, not a currency */}
                {quote ? <>{appSymbol && <small>{quote.currency}&nbsp;</small>}{arDigits(formatAmount(quote.price), lang)}</> : '—'}
            </p>
            <div className="bento-foot">
                {quote ? (
                    <>
                        <ChangePill value={quote.changePercent} lang={lang} />
                        <span className="num truncate">
                            {/* <bdi> keeps the signed number a single left-to-right run; without it
                                Arabic renders "-0.08" as "0.08-". */}
                            <bdi>{quote.change > 0 ? '+' : ''}{arDigits(formatAmount(quote.change), lang)}</bdi> {tx(lang, 'tile.prevClose')}
                        </span>
                    </>
                ) : (
                    <span>{tx(lang, 'tile.noQuote')}</span>
                )}
            </div>
        </>
    );
    // Indices (TASI, WIG20, ...) have no stock page
    if (!appSymbol) return <div className="bento-tile">{body}</div>;
    return <Link href={`/stocks/${appSymbol}`} className="bento-tile transition-colors hover:bg-hover/60">{body}</Link>;
}
