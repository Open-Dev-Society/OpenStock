import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import TradingViewWidget from "@/components/TradingViewWidget";
import Panel from "@/components/Panel";
import IndexPulse, { PulseSkeleton } from "@/components/IndexPulse";
import DataFreshness from "@/components/DataFreshness";
import MarketSwitcher from "@/components/MarketSwitcher";
import SaudiQuotesTable, { SaudiMovers } from "@/components/SaudiQuotes";
import SaudiTerminalWatchlist from "@/components/SaudiTerminal";
import TadawulChart from "@/components/stocks/TadawulChart";
import { tradingViewSymbolUrl } from "@/lib/utils";
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
import { tx } from "@/lib/i18n";

const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;

// Widgets come from TradingView (live, no Finnhub quota) and render immediately; the tiles stream in.
export default async function Dashboard({ searchParams }: { searchParams: Promise<{ market?: string; wide?: string }> }) {
    const { market: requested, wide } = await searchParams;
    // Explicit choice, then the remembered one, then the market of the user's country
    const saved = (await cookies()).get(MARKET_COOKIE)?.value;
    const market = getMarket(requested ?? saved ?? marketForCountry((await getSession())?.user.country));
    const lang = await getLang();
    const open = isMarketOpen(market);
    // Saudi-only build: our own Yahoo-powered tiles/tables (TradingView free embeds block TADAWUL).
    const saudi = market.id === 'sa';
    const native = market.pulse.some((p) => p.finnhub || p.yahoo);
    const pulseSub = market.pulse.some((p) => p.finnhub)
        ? tx(lang, 'dash.pulseFinnhub')
        : tx(lang, 'dash.pulseYahoo');
    // Wide hero: full-width chart with the watchlist stacked below, so the
    // companies never disappear (unlike full-screen overlay mode).
    const wideHero = wide === '1';
    const heroHref = (w: boolean) => {
        const params = new URLSearchParams();
        if (requested) params.set('market', requested);
        if (w) params.set('wide', '1');
        const qs = params.toString();
        return `/dashboard${qs ? `?${qs}` : ''}`;
    };
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
                    <p className="page-sub">{market.name} · {open ? tx(lang, 'dash.openNow') : tx(lang, 'dash.closedNow')} · {market.feed.toLowerCase()} data</p>
                </div>
            </header>

            <MarketSwitcher active={market.id} openIds={MARKETS.filter((m) => isMarketOpen(m)).map((m) => m.id)} />

            <section className="hatch">
                <div className="section-head">
                    <div>
                        <h2 className="section-title">{tx(lang, 'dash.pulse')}</h2>
                        <p className="section-sub">{native ? pulseSub : `${market.feed} quotes via TradingView`}</p>
                    </div>
                    {native && <DataFreshness />}
                </div>
                {/* Keyed so switching markets swaps the tiles instead of reusing old widgets */}
                <Suspense key={market.id} fallback={<PulseSkeleton />}>
                    <IndexPulse market={market} lang={lang} />
                </Suspense>
            </section>

            <div key={market.id} className="flex flex-col gap-3">
                {saudi && (
                    <div className={wideHero ? 'flex flex-col gap-3' : 'grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'}>
                        <Panel
                            title={tx(lang, 'dash.tasi')}
                            sub={tx(lang, 'dash.tasiSub')}
                            action={
                                <Link href={heroHref(!wideHero)} className="pill">
                                    {wideHero ? tx(lang, 'dash.side') : tx(lang, 'dash.wide')}
                                </Link>
                            }
                        >
                            <TadawulChart symbol="TADAWUL:TASI" tvUrl={tradingViewSymbolUrl('TADAWUL:TASI')} lang={lang} />
                        </Panel>
                        <Panel title={tx(lang, 'dash.watchlist')} sub={tx(lang, 'dash.watchlistSub')}>
                            <SaudiTerminalWatchlist lang={lang} />
                        </Panel>
                    </div>
                )}
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                    {saudi ? (
                        <Panel title={tx(lang, 'dash.movers')} sub={tx(lang, 'dash.moversSub')}>
                            <SaudiMovers market={market} lang={lang} />
                        </Panel>
                    ) : (
                        <Panel title="Leaders" sub="12-month trend by group">
                            <TradingViewWidget scriptUrl={`${scriptUrl}market-overview.js`} config={marketOverviewConfig(market.groups)} height={560} />
                        </Panel>
                    )}
                    {heatmap ? (
                        <Panel title={heatmap.title} sub="Sized by market cap, coloured by today’s move">
                            <TradingViewWidget scriptUrl={`${scriptUrl}${heatmap.script}`} config={heatmap.config} height={560} allowExpand />
                        </Panel>
                    ) : saudi ? (
                        <Panel title={tx(lang, 'dash.quotes')} sub={tx(lang, 'dash.quotesSub')}>
                            <SaudiQuotesTable market={market} lang={lang} />
                        </Panel>
                    ) : (
                        <Panel title="Quotes" sub={`${market.name} leaders by group`}>
                            <TradingViewWidget scriptUrl={`${scriptUrl}market-quotes.js`} config={marketQuotesConfig(market.groups)} height={560} />
                        </Panel>
                    )}
                </div>

                <div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    {heatmap && (
                        <Panel title="Quotes" sub={`${market.name} leaders by group`}>
                            <TradingViewWidget scriptUrl={`${scriptUrl}market-quotes.js`} config={marketQuotesConfig(market.groups)} height={560} />
                        </Panel>
                    )}
                    <Panel title={tx(lang, 'dash.stories')} sub={saudi ? tx(lang, 'dash.storiesSub') : 'Newest first'} className={heatmap ? '' : 'xl:col-span-2'}>
                        <TradingViewWidget scriptUrl={`${scriptUrl}timeline.js`} config={timelineConfig(market.news, saudi ? 'TADAWUL:2222' : undefined)} height={560} />
                    </Panel>
                </div>
            </div>
        </>
    );
}
