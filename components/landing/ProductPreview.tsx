import { Suspense } from "react";
import { Plus } from "lucide-react";
import IndexPulse, { PulseSkeleton } from "@/components/IndexPulse";
import DataFreshness from "@/components/DataFreshness";
import TradingViewWidget from "@/components/TradingViewWidget";
import { cn } from "@/lib/utils";

const MINI_CHART = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
const miniChart = (symbol: string) => ({
    symbol, locale: 'en', dateRange: '1M', colorTheme: 'dark', isTransparent: true, autosize: true,
    trendLineColor: '#47d9bb', underLineColor: 'rgba(71, 217, 187, 0.14)', underLineBottomColor: 'rgba(71, 217, 187, 0)',
});

// The real app chrome with the same live data a signed-in user sees. Used on the landing and auth pages,
// so marketing never shows a stale screenshot.
export default function ProductPreview() {
    return (
        <div className="overflow-hidden rounded-[18px] bg-side p-[3px] shadow-[0_0_0_1px_oklch(1_0_0/0.05),0_30px_80px_oklch(0_0_0/0.55)]">
            <div className="flex items-end gap-1 px-3 pt-2" aria-hidden>
                {[['Overview', true], ['AAPL', false], ['NVDA', false]].map(([label, active]) => (
                    <span
                        key={label as string}
                        className={cn('flex h-9 min-w-[104px] items-center rounded-t-xl px-4 font-semibold', active ? 'bg-canvas text-foreground' : 'text-faint', label !== 'Overview' && 'mono text-[13px]')}
                    >
                        {label}
                    </span>
                ))}
                <span className="chrome-btn"><Plus /></span>
            </div>
            <div className="flex flex-col gap-3 rounded-[15px] bg-canvas p-3 md:p-4">
                <section className="hatch">
                    <div className="section-head">
                        <div>
                            <h3 className="section-title">Index pulse</h3>
                            <p className="section-sub">Tracking ETFs via Finnhub</p>
                        </div>
                        <DataFreshness />
                    </div>
                    <Suspense fallback={<PulseSkeleton />}>
                        <IndexPulse />
                    </Suspense>
                </section>
                <div className="grid gap-3 md:grid-cols-2">
                    {['AMEX:SPY', 'NASDAQ:QQQ'].map((symbol) => (
                        <section key={symbol} className="hatch">
                            <div className="card overflow-hidden">
                                <TradingViewWidget scriptUrl={MINI_CHART} config={miniChart(symbol)} height={220} />
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}
