import { Suspense } from "react";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import type { Messages } from "next-intl";
import TradingViewWidget from "@/components/TradingViewWidget";
import Panel from "@/components/Panel";
import IndexPulse, { PulseSkeleton } from "@/components/IndexPulse";
import { LocalizedDataFreshness } from "@/components/DataFreshness";
import MarketSwitcher from "@/components/MarketSwitcher";
import YahooQuotesTable, { YahooMovers } from "@/components/YahooQuotes";
import {
    CRYPTO_HEATMAP_CONFIG,
    STOCK_HEATMAP_CONFIG,
    marketOverviewConfig,
    marketQuotesConfig,
    timelineConfig,
} from "@/lib/constants";
import { MARKETS, MARKET_COOKIE, getMarket, isMarketOpen, marketForCountry } from "@/lib/markets";
import { getSession } from "@/lib/better-auth/auth";
import { toMessageKey } from "@/i18n/config";

const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;

type GroupKey = keyof Messages['Markets']['groups'];
type FeedKey = keyof Messages['Markets']['feed'];

// Widgets come from TradingView (live, no Finnhub quota) and render immediately; the tiles stream in.
export default async function Dashboard({ searchParams }: { searchParams: Promise<{ market?: string }> }) {
    const { market: requested } = await searchParams;
    // Explicit choice, then the remembered one, then the market of the user's country
    const saved = (await cookies()).get(MARKET_COOKIE)?.value;
    const market = getMarket(requested ?? saved ?? marketForCountry((await getSession())?.user.country));
    const [t, tm, tw, locale] = await Promise.all([getTranslations('Dashboard'), getTranslations('Markets'), getTranslations('TradingViewWidget'), getLocale()]);
    const name = tm(`names.${market.id}`);
    const feed = toMessageKey(market.feed) as FeedKey;
    // Translated tab and group titles inside the TradingView widgets
    const groups = market.groups.map((g) => ({ ...g, title: tm(`groups.${toMessageKey(g.title) as GroupKey}`) }));
    const expandLabels = { fullScreen: tw('fullScreen'), exitFullScreen: tw('exitFullScreen'), exitFullScreenHint: tw('exitFullScreenHint') };
    const open = isMarketOpen(market);
    const native = market.pulse.some((p) => p.finnhub);
    const pulseSub = native ? t('pulseSubFinnhub') : market.yahoo ? t('pulseSubYahoo') : t('pulseSubTradingView', { feed });
    const heatmap = market.heatmap === 'stocks'
        ? { script: 'stock-heatmap.js', config: { ...STOCK_HEATMAP_CONFIG, locale }, title: t('stockHeatmapTitle') }
        : market.heatmap === 'crypto'
            ? { script: 'crypto-coins-heatmap.js', config: { ...CRYPTO_HEATMAP_CONFIG, locale }, title: t('cryptoHeatmapTitle') }
            : null;

    return (
        <>
            <header className="page-head">
                <div>
                    <h1 className="page-title">{t('title')}</h1>
                    <p className="page-sub">{t('sub', { market: name, status: open ? 'open' : 'closed', feed })}</p>
                </div>
            </header>

            <MarketSwitcher active={market.id} openIds={MARKETS.filter((m) => isMarketOpen(m)).map((m) => m.id)} />

            <section className="hatch">
                <div className="section-head">
                    <div>
                        <h2 className="section-title">{t('pulseTitle')}</h2>
                        <p className="section-sub">{pulseSub}</p>
                    </div>
                    {native && <LocalizedDataFreshness />}
                </div>
                {/* Keyed so switching markets swaps the tiles instead of reusing old widgets */}
                <Suspense key={market.id} fallback={<PulseSkeleton />}>
                    <IndexPulse market={market} locale={locale} />
                </Suspense>
            </section>

            <div key={market.id} className="flex flex-col gap-3">
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                    {market.yahoo ? (
                        <Panel title={t('moversTitle')} sub={t('moversSub')}>
                            <YahooMovers market={market} />
                        </Panel>
                    ) : (
                        <Panel title={t('leadersTitle')} sub={t('leadersSub')}>
                            <TradingViewWidget scriptUrl={`${scriptUrl}market-overview.js`} config={marketOverviewConfig(groups, locale)} height={560} />
                        </Panel>
                    )}
                    {heatmap ? (
                        <Panel title={heatmap.title} sub={t('heatmapSub')}>
                            <TradingViewWidget scriptUrl={`${scriptUrl}${heatmap.script}`} config={heatmap.config} height={560} allowExpand labels={expandLabels} />
                        </Panel>
                    ) : (
                        <Panel title={t('quotesTitle')} sub={t('quotesSub', { market: name })}>
                            {market.yahoo
                                ? <YahooQuotesTable market={market} />
                                : <TradingViewWidget scriptUrl={`${scriptUrl}market-quotes.js`} config={marketQuotesConfig(groups, locale)} height={560} />}
                        </Panel>
                    )}
                </div>

                <div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    {heatmap && (
                        <Panel title={t('quotesTitle')} sub={t('quotesSub', { market: name })}>
                            <TradingViewWidget scriptUrl={`${scriptUrl}market-quotes.js`} config={marketQuotesConfig(groups, locale)} height={560} />
                        </Panel>
                    )}
                    <Panel title={t('storiesTitle')} sub={t('storiesSub')} className={heatmap ? '' : 'xl:col-span-2'}>
                        <TradingViewWidget scriptUrl={`${scriptUrl}timeline.js`} config={timelineConfig(market.news, locale)} height={560} />
                    </Panel>
                </div>
            </div>
        </>
    );
}
