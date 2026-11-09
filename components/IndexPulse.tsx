import { getTranslations } from "next-intl/server";
import PulseTile, { LocalizedPulseTile } from "@/components/PulseTile";
import YahooPulseTile from "@/components/YahooPulseTile";
import TradingViewWidget from "@/components/TradingViewWidget";
import { getLiveQuotes } from "@/lib/actions/finnhub.actions";
import { getYahooDailyQuotes } from "@/lib/actions/yahoo.actions";
import { singleQuoteConfig } from "@/lib/constants";
import { getMarket, type Market } from "@/lib/markets";
import type { Locale } from "@/i18n/config";

const SINGLE_QUOTE = 'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js';

// Four headline tiles for a market. Markets Finnhub can price get native tiles from our shared quote cache;
// the rest use TradingView's quote tile, which is free for those exchanges. Yahoo-priced markets (Tadawul, Warsaw) get our own tiles.
// `locale` is passed by translated pages; the marketing preview leaves it out and stays English.
export default async function IndexPulse({ market = getMarket('us'), locale }: { market?: Market; locale?: Locale }) {
    const t = locale ? await getTranslations({ locale, namespace: 'PulseTile' }) : null;
    if (market.yahoo) {
        const yahoo = await getYahooDailyQuotes(market.pulse.map((p) => p.symbol));
        const labels = t ? { vsPrevClose: (change: string) => t('vsPrevClose', { change }), unavailable: t('unavailable') } : undefined;
        return (
            <div className="bento">
                {market.pulse.map((tile) => <YahooPulseTile key={tile.symbol} tvSymbol={tile.symbol} label={tile.label} quote={yahoo[tile.symbol] ?? null} labels={labels} />)}
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
                            <TradingViewWidget scriptUrl={SINGLE_QUOTE} config={singleQuoteConfig(tile.symbol, locale)} height={112} />
                        </div>
                    );
                }
                const Tile = t ? LocalizedPulseTile : PulseTile;
                return <Tile key={tile.symbol} symbol={tile.finnhub} label={tile.label} initial={quotes[tile.finnhub]} />;
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
