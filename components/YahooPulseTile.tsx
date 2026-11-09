import Link from 'next/link';
import { LineChart } from 'lucide-react';
import ChangePill from '@/components/ChangePill';
import { yahooAppSymbol, type YahooDailyQuote } from '@/lib/yahoo';

const formatAmount = (value: number) =>
    value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Pulse tile priced from Yahoo daily quotes. Used for Tadawul, whose TradingView quote widgets are blocked in free embeds,
// and Warsaw, whose embeds are end of day only.
export default function YahooPulseTile({ tvSymbol, label, quote }: { tvSymbol: string; label: string; quote: YahooDailyQuote | null }) {
    const appSymbol = yahooAppSymbol(tvSymbol);
    const body = (
        <>
            <div className="bento-head">
                <span className="bento-ico"><LineChart /></span>
                <span className="truncate">{label}</span>
                <span className="mono ml-auto text-xs text-faint">{tvSymbol.split(':').pop()}</span>
            </div>
            <p className="bento-value self-start num">
                {/* Indices are in points, not a currency */}
                {quote ? <>{appSymbol && <small>{quote.currency}&nbsp;</small>}{formatAmount(quote.price)}</> : '—'}
            </p>
            <div className="bento-foot">
                {quote ? (
                    <>
                        <ChangePill value={quote.changePercent} />
                        <span className="num truncate">{quote.change > 0 ? '+' : ''}{formatAmount(quote.change)} vs prev close</span>
                    </>
                ) : (
                    <span>Quote unavailable</span>
                )}
            </div>
        </>
    );
    // Indices (TASI, WIG20, ...) have no stock page
    if (!appSymbol) return <div className="bento-tile">{body}</div>;
    return <Link href={`/stocks/${appSymbol}`} className="bento-tile transition-colors hover:bg-hover/60">{body}</Link>;
}
