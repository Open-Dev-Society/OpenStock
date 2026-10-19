import { Suspense } from "react";
import { CandlestickChart } from "lucide-react";
import TradingViewWidget from "@/components/TradingViewWidget";
import StockHeader, { StockHeaderSkeleton } from "@/components/stocks/StockHeader";
import StockSentimentCard from "@/components/stocks/StockSentimentCard";
import StockChart from "@/components/stocks/StockChart";
import Panel from "@/components/Panel";
import {
    TECHNICAL_ANALYSIS_WIDGET_CONFIG,
    COMPANY_PROFILE_WIDGET_CONFIG,
    COMPANY_FINANCIALS_WIDGET_CONFIG,
} from "@/lib/constants";
<<<<<<< HEAD

import { isStockInWatchlist } from '@/lib/actions/watchlist.actions';
import { getStockSentimentInsights } from '@/lib/actions/adanos.actions';
import { getStockMetrics } from '@/lib/actions/finnhub.actions';
import { formatSymbolForTradingView } from '@/lib/utils';
import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';

export default async function StockDetails({ params }: StockDetailsPageProps) {
    const { symbol } = await params;
    const tvSymbol = formatSymbolForTradingView(symbol);
    const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;

    const session = await auth.api.getSession({
        headers: await headers()
    });
    const userId = session?.user?.id;
    const [isInWatchlist, sentimentInsights, dividendYield] = await Promise.all([
        userId ? isStockInWatchlist(userId, symbol) : Promise.resolve(false),
        getStockSentimentInsights(symbol),
        getStockMetrics(symbol),
    ]);
=======
import { getStockSentimentInsights } from '@/lib/actions/adanos.actions';
import { formatSymbolForTradingView, isChartEmbeddable, tradingViewSymbolUrl } from '@/lib/utils';

const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;
>>>>>>> upstream/main

async function Sentiment({ symbol }: { symbol: string }) {
    const insight = await getStockSentimentInsights(symbol);
    if (!insight) return null;
    return (
        <Panel title="Sentiment" sub="Reddit, X.com, news and Polymarket">
            <StockSentimentCard insight={insight} />
        </Panel>
    );
}

// Charts come straight from TradingView (live, no quota); only the header waits on Finnhub, and it streams.
export default async function StockDetails({ params }: StockDetailsPageProps) {
    const { symbol: rawSymbol } = await params;
    const symbol = decodeURIComponent(rawSymbol).toUpperCase();
    const tvSymbol = formatSymbolForTradingView(symbol);

    return (
        <>
            <Suspense fallback={<StockHeaderSkeleton />}>
                <StockHeader symbol={symbol} />
            </Suspense>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
                <div className="flex min-w-0 flex-col gap-3">
                    {isChartEmbeddable(tvSymbol) ? (
                        <StockChart tvSymbol={tvSymbol} scriptUrl={`${scriptUrl}advanced-chart.js`} />
                    ) : (
                        // TradingView refuses this exchange's chart in embeds; say so instead of showing its error
                        <Panel title="Chart" sub="Only on TradingView for this exchange">
                            <div className="empty-state py-14">
                                <span className="empty-icon"><CandlestickChart className="size-5" /></span>
                                <h3>Chart not available here</h3>
                                <p className="max-w-80 text-[13px]">
                                    TradingView doesn’t license {tvSymbol.split(':')[0]} charts for other sites. Financials, technicals and the profile below still work.
                                </p>
                                <a href={tradingViewSymbolUrl(tvSymbol)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost mt-2">
                                    Open chart on TradingView
                                </a>
                            </div>
                        </Panel>
                    )}
                    <Panel title="Financials" sub="Income statement, balance sheet and ratios">
                        <TradingViewWidget
                            scriptUrl={`${scriptUrl}financials.js`}
                            config={COMPANY_FINANCIALS_WIDGET_CONFIG(tvSymbol)}
                            height={500}
                        />
                    </Panel>
                </div>

                <div className="flex min-w-0 flex-col gap-3">
                    <Panel title="Technicals" sub="Oscillators and moving averages, 1h">
                        <TradingViewWidget
                            scriptUrl={`${scriptUrl}technical-analysis.js`}
                            config={TECHNICAL_ANALYSIS_WIDGET_CONFIG(tvSymbol)}
                            height={400}
                        />
<<<<<<< HEAD
                    </div>
<div className="w-fit min-w-[160px] rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] px-5 py-4 flex flex-col gap-1.5 transition-all hover:border-white/20 hover:bg-white/[0.06]">
    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Dividend Yield
    </span>
    <span className="text-2xl font-semibold text-white leading-tight">
        {dividendYield !== null ? `${dividendYield.toFixed(2)}%` : "—"}
    </span>
</div>

                    <StockSentimentCard insight={sentimentInsights} />

                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}technical-analysis.js`}
                        config={TECHNICAL_ANALYSIS_WIDGET_CONFIG(tvSymbol)}
                        height={400}
                    />

                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}company-profile.js`}
                        config={COMPANY_PROFILE_WIDGET_CONFIG(tvSymbol)}
                        height={440}
                    />

                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}financials.js`}
                        config={COMPANY_FINANCIALS_WIDGET_CONFIG(tvSymbol)}
                        height={800}
                    />
=======
                    </Panel>
                    <Suspense fallback={null}>
                        <Sentiment symbol={symbol} />
                    </Suspense>
                    <Panel title="Profile" sub="What the company does">
                        <TradingViewWidget
                            scriptUrl={`${scriptUrl}symbol-profile.js`}
                            config={COMPANY_PROFILE_WIDGET_CONFIG(tvSymbol)}
                            height={440}
                        />
                    </Panel>
>>>>>>> upstream/main
                </div>
            </div>
        </>
    );
}
