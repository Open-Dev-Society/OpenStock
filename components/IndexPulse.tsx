import PulseTile from "@/components/PulseTile";
import SaudiPulseTile from "@/components/SaudiPulseTile";
import TradingViewWidget from "@/components/TradingViewWidget";
import { getLiveQuotes } from "@/lib/actions/finnhub.actions";
import { getYahooDailyQuotes } from "@/lib/actions/yahoo.actions";
import { singleQuoteConfig } from "@/lib/constants";
import { getMarket, type Market } from "@/lib/markets";
import { tradingViewSymbolUrl } from "@/lib/utils";
import { tx, type Lang } from "@/lib/i18n";
import type { YahooDailyQuote } from "@/lib/yahoo";

const SINGLE_QUOTE = 'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js';

// Headline tiles for a market. Finnhub-priced and Yahoo-priced tiles use our own
// shared quote caches; the rest use TradingView's quote tile (blocked for TADAWUL).
export default async function IndexPulse({ market = getMarket('sa'), lang = 'en' }: { market?: Market; lang?: Lang }) {
    const native = market.pulse.flatMap((p) => (p.finnhub ? [p.finnhub] : []));
    const yahooSyms = market.pulse.flatMap((p) => (p.yahoo ? [p.yahoo] : []));
    const finnhubQuotes = native.length ? await getLiveQuotes(native) : {};
    const yahooQuotes: Record<string, YahooDailyQuote> = yahooSyms.length
        ? await getYahooDailyQuotes(yahooSyms)
        : {};

    return (
        <div className="bento">
            {market.pulse.map((tile) => {
                if (tile.yahoo) {
                    const appSymbol = tile.yahoo.endsWith('.SR') ? tile.yahoo : null;
                    return (
                        <SaudiPulseTile
                            key={tile.symbol}
                            tvSymbol={tile.symbol}
                            label={tile.label}
                            href={appSymbol ? `/stocks/${appSymbol}` : tradingViewSymbolUrl(tile.symbol)}
                            quote={yahooQuotes[tile.yahoo] ?? null}
                            lang={lang}
                        />
                    );
                }
                if (!tile.finnhub) {
                    // TradingView free embeds refuse TADAWUL quotes ("This symbol is only
                    // available on TradingView"), so a quote widget for them is a broken tile.
                    // Show a plain tile instead of the error state.
                    if (tile.symbol.startsWith('TADAWUL:')) {
                        return (
                            <div key={tile.symbol} className="bento-tile">
                                <div className="bento-head">
                                    <span className="truncate">{tile.label}</span>
                                    <span className="mono ms-auto text-xs text-faint">{tile.symbol.replace('TADAWUL:', '')}</span>
                                </div>
                                <p className="bento-value self-start">—</p>
                                <div className="bento-foot"><span>{tx(lang, 'tile.noQuote')}</span></div>
                            </div>
                        );
                    }
                    return (
                        <div key={tile.symbol} className="bento-tile p-1.5">
                            <TradingViewWidget scriptUrl={SINGLE_QUOTE} config={singleQuoteConfig(tile.symbol)} height={112} />
                        </div>
                    );
                }
                return <PulseTile key={tile.symbol} symbol={tile.finnhub} label={tile.label} initial={finnhubQuotes[tile.finnhub]} />;
            })}
        </div>
    );
}

export const PulseSkeleton = () => (
    <div className="bento" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bento-tile h-[124px]"><span className="h-full animate-pulse rounded-lg bg-hover/60" /></div>
        ))}
    </div>
);
