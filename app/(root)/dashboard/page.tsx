import { Suspense } from "react";
import { cookies } from "next/headers";
import TradingViewWidget from "@/components/TradingViewWidget";
import Panel from "@/components/Panel";
import IndexPulse, { PulseSkeleton } from "@/components/IndexPulse";
import DataFreshness from "@/components/DataFreshness";
import MarketSwitcher from "@/components/MarketSwitcher";
import SaudiQuotesTable, { SaudiMovers } from "@/components/SaudiQuotes";
import {
    CRYPTO_HEATMAP_CONFIG,
    STOCK_HEATMAP_CONFIG,
    marketOverviewConfig,
    marketQuotesConfig,
    timelineConfig,
} from "@/lib/constants";
import { MARKETS, MARKET_COOKIE, getMarket, isMarketOpen, marketForCountry } from "@/lib/markets";
import { getSession } from "@/lib/better-auth/auth";
import { getLang } from "@/lib/i18n-server";
import { feedLabel, marketName, tx } from "@/lib/i18n";

const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;

// Widgets come from TradingView (live, no Finnhub quota) and render immediately; the tiles stream in.
export default async function Dashboard({ searchParams }: { searchParams: Promise<{ market?: string }> }) {
    const { market: requested } = await searchParams;
    // Explicit choice, then the remembered one, then the market of the user's country
    const saved = (await cookies()).get(MARKET_COOKIE)?.value;
    const market = getMarket(requested ?? saved ?? marketForCountry((await getSession())?.user.country));
    const lang = await getLang();
    const open = isMarketOpen(market);
    const native = market.pulse.some((p) => p.finnhub);
    const pulseSub = native
        ? tx(lang, 'dash.pulseFinnhub')
        : market.yahoo ? tx(lang, 'dash.pulseYahoo') : `${market.feed} quotes via TradingView`;
    const heatmap = market.heatmap === 'stocks'
        ? { script: 'stock-heatmap.js', config: STOCK_HEATMAP_CONFIG, title: 'S&P 500 heatmap' }
        : market.heatmap === 'crypto'
            ? { script: 'crypto-coins-heatmap.js', config: CRYPTO_HEATMAP_CONFIG, title: 'Crypto heatmap' }
            : null;

    return (
        <>
            <header className="page-head">
                <div>
                    <h1 className="page-title">{tx(lang, 'dash.title')}</h1>
                    <p className="page-sub">{marketName(lang, market.id)} · {open ? tx(lang, 'dash.openNow') : tx(lang, 'dash.closedNow')} · {feedLabel(lang, market.feed)}</p>
                </div>
            </header>

            <MarketSwitcher lang={lang} active={market.id} openIds={MARKETS.filter((m) => isMarketOpen(m)).map((m) => m.id)} />

            <section className="hatch">
                <div className="section-head">
                    <div>
                        <h2 className="section-title">{tx(lang, 'dash.pulse')}</h2>
                        <p className="section-sub">{pulseSub}</p>
                    </div>
                    {native && <DataFreshness lang={lang} />}
                </div>
                {/* Keyed so switching markets swaps the tiles instead of reusing old widgets */}
                <Suspense key={market.id} fallback={<PulseSkeleton />}>
                    <IndexPulse market={market} lang={lang} />
                </Suspense>
            </section>

            <div key={market.id} className="flex flex-col gap-3">
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                    {market.yahoo ? (
                        <Panel title={tx(lang, 'dash.movers')} sub={tx(lang, 'dash.moversSub')}>
                            <SaudiMovers market={market} lang={lang} />
                        </Panel>
                    ) : (
                        <Panel title={tx(lang, 'dash.leaders')} sub={tx(lang, 'dash.leadersSub')}>
                            <TradingViewWidget scriptUrl={`${scriptUrl}market-overview.js`} config={marketOverviewConfig(market.groups)} height={560} />
                        </Panel>
                    )}
                    {heatmap ? (
                        <Panel title={heatmap.title} sub="Sized by market cap, coloured by today’s move">
                            <TradingViewWidget scriptUrl={`${scriptUrl}${heatmap.script}`} config={heatmap.config} height={560} allowExpand />
                        </Panel>
                    ) : (
                        <Panel title={tx(lang, 'dash.quotes')} sub={`${marketName(lang, market.id)} · ${tx(lang, 'dash.byGroup')}`}>
                            {market.yahoo
                                ? <SaudiQuotesTable market={market} lang={lang} />
                                : <TradingViewWidget scriptUrl={`${scriptUrl}market-quotes.js`} config={marketQuotesConfig(market.groups)} height={560} />}
                        </Panel>
                    )}
                </div>

                <div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    {heatmap && (
                        <Panel title={tx(lang, 'dash.quotes')} sub={`${marketName(lang, market.id)} · ${tx(lang, 'dash.byGroup')}`}>
                            <TradingViewWidget scriptUrl={`${scriptUrl}market-quotes.js`} config={marketQuotesConfig(market.groups)} height={560} />
                        </Panel>
                    )}
                    <Panel title={tx(lang, 'dash.stories')} sub={tx(lang, 'dash.storiesSub')} className={heatmap ? '' : 'xl:col-span-2'}>
                        <TradingViewWidget scriptUrl={`${scriptUrl}timeline.js`} config={timelineConfig(market.news)} height={560} />
                    </Panel>
                </div>
            </div>
        </>
    );
}
