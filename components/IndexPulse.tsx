import PulseTile from "@/components/PulseTile";
import SaudiPulseTile from "@/components/SaudiPulseTile";
import TradingViewWidget from "@/components/TradingViewWidget";
import { getLiveQuotes } from "@/lib/actions/finnhub.actions";
import { getYahooDailyQuotes } from "@/lib/actions/yahoo.actions";
import { singleQuoteConfig } from "@/lib/constants";
import { getMarket, type Market } from "@/lib/markets";
import type { Lang } from "@/lib/i18n";

const SINGLE_QUOTE = 'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js';

// Four headline tiles for a market. Markets Finnhub can price get native tiles from our shared quote cache;
// the rest use TradingView's quote tile, which is free for those exchanges. Yahoo-priced markets (Tadawul) get our own tiles.
export default async function IndexPulse({ market = getMarket('us'), lang = 'en' }: { market?: Market; lang?: Lang }) {
    if (market.yahoo) {
        const yahoo = await getYahooDailyQuotes(market.pulse.map((p) => p.symbol));
        return (
            <div className="bento">
                {market.pulse.map((tile) => <SaudiPulseTile key={tile.symbol} tvSymbol={tile.symbol} label={tile.label} quote={yahoo[tile.symbol] ?? null} lang={lang} />)}
            </div>
        );
    }
    const native = market.pulse.flatMap((p) => (p.finnhub ? [p.finnhub] : []));
    const quotes = native.length ? await getLiveQuotes(native) : {};

    return (
        <div className="bento">
            {market.pulse.map((tile) => {
                if (!tile.finnhub) {
                    return (
                        <div key={tile.symbol} className="bento-tile p-1.5">
                            <TradingViewWidget scriptUrl={SINGLE_QUOTE} config={singleQuoteConfig(tile.symbol)} height={112} />
                        </div>
                    );
                }
                return <PulseTile key={tile.symbol} symbol={tile.finnhub} label={tile.label} initial={quotes[tile.finnhub]} />;
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
