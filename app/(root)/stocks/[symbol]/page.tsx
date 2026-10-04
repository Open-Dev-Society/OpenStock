import { Suspense } from "react";
import { CandlestickChart } from "lucide-react";
import TradingViewWidget from "@/components/TradingViewWidget";
import StockHeader, { StockHeaderSkeleton } from "@/components/stocks/StockHeader";
import StockSentimentCard from "@/components/stocks/StockSentimentCard";
import Panel from "@/components/Panel";
import {
    CANDLE_CHART_WIDGET_CONFIG,
    TECHNICAL_ANALYSIS_WIDGET_CONFIG,
    COMPANY_PROFILE_WIDGET_CONFIG,
    COMPANY_FINANCIALS_WIDGET_CONFIG,
} from "@/lib/constants";
import { getStockSentimentInsights } from '@/lib/actions/adanos.actions';
import { formatSymbolForTradingView, isChartEmbeddable, tradingViewSymbolUrl } from '@/lib/utils';
import { isCandleRangeId, isTadawulSymbol } from '@/lib/yahoo';
import TadawulChart from "@/components/stocks/TadawulChart";
import SaudiSymbolInfo from "@/components/SaudiSymbolInfo";
import SaudiTerminalWatchlist from "@/components/SaudiTerminal";
import { getLang } from "@/lib/i18n-server";
import { tx } from "@/lib/i18n";

const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;

async function Sentiment({ symbol }: { symbol: string }) {
    const insight = await getStockSentimentInsights(symbol);
    if (!insight) return null;
    const lang = await getLang();
    return (
        <Panel title={tx(lang, 'stock.sentiment')} sub={tx(lang, 'stock.sentimentSub')}>
            <StockSentimentCard insight={insight} />
        </Panel>
    );
}

// Charts come straight from TradingView (live, no quota); only the header waits on Finnhub, and it streams.
export default async function StockDetails({ params, searchParams }: StockDetailsPageProps & { searchParams: Promise<{ tf?: string }> }) {
    const { symbol: rawSymbol } = await params;
    const { tf } = await searchParams;
    const symbol = decodeURIComponent(rawSymbol).toUpperCase();
    const tvSymbol = formatSymbolForTradingView(symbol);
    const tadawul = isTadawulSymbol(symbol);
    const lang = await getLang();
    const initialRange = isCandleRangeId(tf) ? tf : '1m';

    return (
        <>
            <Suspense fallback={<StockHeaderSkeleton />}>
                <StockHeader symbol={symbol} lang={lang} />
            </Suspense>

            <div className={`grid gap-3 xl:grid-cols-[minmax(0,${tadawul ? '2fr' : '1fr'})_minmax(320px,400px)]`}>
                <div className="flex min-w-0 flex-col gap-3">
                    {tadawul ? (
                        <Panel title={tx(lang, 'stock.chart')} sub={tx(lang, 'stock.chartTadawul')}>
                            <TadawulChart symbol={symbol} tvUrl={tradingViewSymbolUrl(tvSymbol)} lang={lang} initialRange={initialRange} />
                        </Panel>
                    ) : isChartEmbeddable(tvSymbol) ? (
                        <Panel title={tx(lang, 'stock.chart')} sub={tx(lang, 'stock.chartLive')}>
                            <TradingViewWidget
                                scriptUrl={`${scriptUrl}advanced-chart.js`}
                                config={CANDLE_CHART_WIDGET_CONFIG(tvSymbol)}
                                height={560}
                                allowExpand
                            />
                        </Panel>
                    ) : (
                        // TradingView refuses this exchange's chart in embeds; say so instead of showing its error
                        <Panel title={tx(lang, 'stock.chart')} sub="Only on TradingView for this exchange">
                            <div className="empty-state py-14">
                                <span className="empty-icon"><CandlestickChart className="size-5" /></span>
                                <h3>Chart not available here</h3>
                                <p className="max-w-80 text-[13px]">
                                    TradingView doesn’t license {tvSymbol.split(':')[0]} charts for other sites. Financials, technicals and the profile below still work.
                                </p>
                                <a href={tradingViewSymbolUrl(tvSymbol)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost mt-2">
                                    {tx(lang, 'stock.openTV')}
                                </a>
                            </div>
                        </Panel>
                    )}
                    <Panel title={tx(lang, 'stock.financials')} sub={tx(lang, 'stock.financialsSub')}>
                        <TradingViewWidget
                            scriptUrl={`${scriptUrl}financials.js`}
                            config={COMPANY_FINANCIALS_WIDGET_CONFIG(tvSymbol)}
                            height={500}
                        />
                    </Panel>
                </div>

                <div className="flex min-w-0 flex-col gap-3">
                    {tadawul && (
                        <>
                            <Panel title={symbol}>
                                <SaudiSymbolInfo symbol={symbol} lang={lang} />
                            </Panel>
                            <Panel title={tx(lang, 'dash.watchlist')} sub={tx(lang, 'dash.watchlistSub')}>
                                <SaudiTerminalWatchlist lang={lang} />
                            </Panel>
                        </>
                    )}
                    <Panel title={tx(lang, 'stock.technicals')} sub={tx(lang, 'stock.technicalsSub')}>
                        <TradingViewWidget
                            scriptUrl={`${scriptUrl}technical-analysis.js`}
                            config={TECHNICAL_ANALYSIS_WIDGET_CONFIG(tvSymbol)}
                            height={400}
                        />
                    </Panel>
                    <Suspense fallback={null}>
                        <Sentiment symbol={symbol} />
                    </Suspense>
                    <Panel title={tx(lang, 'stock.profile')} sub={tx(lang, 'stock.profileSub')}>
                        <TradingViewWidget
                            scriptUrl={`${scriptUrl}symbol-profile.js`}
                            config={COMPANY_PROFILE_WIDGET_CONFIG(tvSymbol)}
                            height={440}
                        />
                    </Panel>
                </div>
            </div>
        </>
    );
}
