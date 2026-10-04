import Link from 'next/link';
import { LineChart } from 'lucide-react';
import ChangePill from '@/components/ChangePill';
import type { YahooDailyQuote } from '@/lib/yahoo';
import { tx, type Lang } from '@/lib/i18n';

const formatAmount = (value: number) =>
    value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Pulse tile priced from Yahoo daily quotes (SAR). Used for Tadawul, whose
// TradingView quote widgets are blocked in free embeds.
export default function SaudiPulseTile({
    tvSymbol,
    label,
    href,
    quote,
    lang,
}: {
    tvSymbol: string;
    label: string;
    href?: string | null;
    quote: YahooDailyQuote | null;
    lang: Lang;
}) {
    const body = (
        <>
            <div className="bento-head">
                <span className="bento-ico"><LineChart /></span>
                <span className="truncate">{label}</span>
                <span className="mono ms-auto text-xs text-faint">{tvSymbol.replace('TADAWUL:', '')}</span>
            </div>
            <p className="bento-value self-start num">
                {quote ? <><small>SAR&nbsp;</small>{formatAmount(quote.price)}</> : '—'}
            </p>
            <div className="bento-foot">
                {quote ? (
                    <>
                        <ChangePill value={quote.changePercent} />
                        <span className="num truncate">
                            {(quote.change ?? 0) > 0 ? '+' : ''}{formatAmount(quote.change ?? 0)} {tx(lang, 'tile.prevClose')}
                        </span>
                    </>
                ) : (
                    <span>{tx(lang, 'tile.noQuote')}</span>
                )}
            </div>
        </>
    );
    if (!href) return <div className="bento-tile">{body}</div>;
    return (
        <Link href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined} className="bento-tile transition-colors hover:bg-hover/60">
            {body}
        </Link>
    );
}
