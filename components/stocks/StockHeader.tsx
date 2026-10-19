import { Bell, CalendarClock, Gauge, Landmark, MoveVertical } from "lucide-react";
import WatchlistButton from "@/components/WatchlistButton";
import CreateAlertModal from "@/components/watchlist/CreateAlertModal";
import StockLivePrice from "@/components/stocks/StockLivePrice";
import { isStockInWatchlist } from "@/lib/actions/watchlist.actions";
import { getCompanyProfile, getLiveQuotes } from "@/lib/actions/finnhub.actions";
import { formatNumber, formatPrice, formatSymbolForTradingView } from "@/lib/utils";
import { hasFinnhubQuotes } from "@/lib/markets";
import { symbolInfoConfig } from "@/lib/constants";
import TradingViewWidget from "@/components/TradingViewWidget";

// Symbols Finnhub's free plan can't price (most non-US listings) use TradingView's quote panel instead.
async function TradingViewHeader({ symbol }: { symbol: string }) {
    const isInWatchlist = await isStockInWatchlist(symbol);
    const tvSymbol = formatSymbolForTradingView(symbol);
    return (
        <section className="hatch">
            <div className="card flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                    <h1 className="mono truncate text-xl font-bold tracking-[-0.02em]">{symbol}</h1>
                    <p className="text-[12.5px] text-faint">{tvSymbol.split(':')[0]} · quote via TradingView</p>
                </div>
                <div className="flex items-center gap-2">
                    <WatchlistButton symbol={symbol} company={symbol} isInWatchlist={isInWatchlist} />
                    <span className="pill h-9 px-3" title="Price alerts need a quote source we can check every 5 minutes">
                        <Bell /> Alerts: US stocks and crypto
                    </span>
                </div>
            </div>
            <div className="card mt-[3px] p-1">
                <TradingViewWidget scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js" config={symbolInfoConfig(tvSymbol)} height={180} />
            </div>
        </section>
    );
}

export default async function StockHeader({ symbol }: { symbol: string }) {
    if (!hasFinnhubQuotes(symbol)) return <TradingViewHeader symbol={symbol} />;

    const [isInWatchlist, quotes, profile] = await Promise.all([
        isStockInWatchlist(symbol),
        getLiveQuotes([symbol]),
        getCompanyProfile(symbol),
    ]);
    const quote = quotes[symbol];

    const currency = profile?.currency || 'USD';
    const company = profile?.name || symbol;
    const money = (value?: number) => (value ? formatPrice(value, currency) : '—');

    const stats = [
        { label: 'Open', icon: CalendarClock, value: money(quote?.o), hint: 'First trade of the session' },
        { label: 'Day range', icon: MoveVertical, value: quote?.l && quote?.h ? `${money(quote.l)} – ${money(quote.h)}` : '—', hint: 'Low to high' },
        { label: 'Prev close', icon: Gauge, value: money(quote?.pc), hint: 'Last session' },
        { label: 'Market cap', icon: Landmark, value: profile?.marketCapitalization ? formatNumber(profile.marketCapitalization) : '—', hint: currency },
    ];

    return (
        <section className="hatch">
            <div className="card flex flex-wrap items-center gap-x-6 gap-y-4 p-4">
                <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
                    {profile?.logo ? (
                        <span className="logo-well size-11"><img src={profile.logo} alt="" className="size-full object-contain p-1.5" /></span>
                    ) : (
                        <span className="logo-well is-empty size-11">{symbol[0]}</span>
                    )}
                    <div className="min-w-0">
                        <h1 className="truncate text-xl font-bold tracking-[-0.03em]">{company}</h1>
                        <p className="mono truncate text-[12.5px] text-faint">
                            {[symbol, profile?.exchange, profile?.finnhubIndustry].filter(Boolean).join(' · ')}
                        </p>
                    </div>
                </div>

                <StockLivePrice symbol={symbol} initial={quote} currency={currency} />

                <div className="flex items-center gap-2">
                    <WatchlistButton symbol={symbol} company={company} isInWatchlist={isInWatchlist} />
                    <CreateAlertModal symbol={symbol} currentPrice={quote?.c} currency={currency}>
                        <button type="button" className="btn btn-primary"><Bell /> Set alert</button>
                    </CreateAlertModal>
                </div>
            </div>

            <div className="bento mt-[3px]">
                {stats.map(({ label, icon: Icon, value, hint }) => (
                    <div key={label} className="bento-tile gap-2.5">
                        <div className="bento-head"><span className="bento-ico"><Icon /></span>{label}</div>
                        <p className="num truncate text-[17px] font-bold tracking-[-0.02em]">{value}</p>
                        <p className="text-[12px] text-faint">{hint}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

export function StockHeaderSkeleton() {
    return (
        <section className="hatch" aria-busy="true">
            <div className="card flex items-center gap-3 p-4">
                <span className="size-11 animate-pulse rounded-full bg-hover" />
                <span className="flex flex-col gap-2">
                    <span className="h-5 w-48 animate-pulse rounded-md bg-hover" />
                    <span className="h-3 w-32 animate-pulse rounded-md bg-hover" />
                </span>
                <span className="ml-auto h-8 w-36 animate-pulse rounded-md bg-hover" />
            </div>
            <div className="bento mt-[3px]">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="bento-tile h-[104px]"><span className="h-full animate-pulse rounded-lg bg-hover/60" /></div>
                ))}
            </div>
        </section>
    );
}
