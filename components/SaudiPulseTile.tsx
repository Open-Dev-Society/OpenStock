import Link from 'next/link';
import { LineChart } from 'lucide-react';
import ChangePill from '@/components/ChangePill';
import { tadawulAppSymbol, type YahooDailyQuote } from '@/lib/yahoo';
import { tx, type Lang } from '@/lib/i18n';
import { saudiSymbolNameAr } from '@/lib/saudi-symbols';
import { arDigits } from "@/lib/i18n";
import Price from "@/components/Price";

const formatAmount = (value: number) =>
    value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Pulse tile priced from Yahoo daily quotes (SAR). Used for Tadawul, whose TradingView quote widgets are blocked in free embeds.
export default function SaudiPulseTile({ tvSymbol, label, quote, lang }: { tvSymbol: string; label: string; quote: YahooDailyQuote | null; lang: Lang }) {
    const appSymbol = tadawulAppSymbol(tvSymbol);
    // The Arabic table names the company the way the Arabic press does; the market config is English.
    const title = (lang === 'ar' && appSymbol ? saudiSymbolNameAr(appSymbol) : null) ?? label;
    const body = (
        <>
            <div className="bento-head">
                <span className="bento-ico"><LineChart /></span>
                <span className="truncate">{title}</span>
                <span className="mono ms-auto text-xs text-faint">{tvSymbol.replace('TADAWUL:', '')}</span>
            </div>
            <p className="bento-value self-start num">
                {quote ? <Price value={quote.price} currency="SAR" lang={lang} /> : '—'}
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
    // The TASI index has no stock page
    if (!appSymbol) return <div className="bento-tile">{body}</div>;
    return <Link href={`/stocks/${appSymbol}`} className="bento-tile transition-colors hover:bg-hover/60">{body}</Link>;
}
