import TradingViewWidget from '@/components/TradingViewWidget';
import MarketFamilySwitcher from '@/components/markets/MarketFamilySwitcher';
import {
    HEATMAP_WIDGET_CONFIG,
    MARKET_DATA_WIDGET_CONFIG,
    MARKET_OVERVIEW_WIDGET_CONFIG,
} from '@/lib/constants';
import {
    getMarketFamily,
    type MarketFamilySlug,
} from '@/lib/markets/market-families';
import { notFound } from 'next/navigation';

const SCRIPT_URL = 'https://s3.tradingview.com/external-embedding/embed-widget-';

const MARKET_COPY: Record<MarketFamilySlug, string> = {
    overview: 'A single view across the market families OpenStock is bringing together.',
    indices: 'Major index context presented through the existing TradingView market surface.',
    stocks: 'Existing stock-market coverage, now reachable from the shared Markets surface.',
    futures: 'Read-only futures previews while app-owned futures data remains a future decision.',
    crypto: 'Crypto presentation preview now; normalized Luno-backed quotes are the next data slice.',
};

const CRYPTO_WIDGET_CONFIG = {
    ...MARKET_DATA_WIDGET_CONFIG,
    title: 'Crypto preview',
    symbolsGroups: [
        {
            name: 'Crypto',
            symbols: [
                { name: 'BINANCE:BTCUSDT', displayName: 'Bitcoin / USDT' },
                { name: 'BINANCE:ETHUSDT', displayName: 'Ethereum / USDT' },
                { name: 'COINBASE:SOLUSD', displayName: 'Solana / USD' },
            ],
        },
    ],
};

const INDEX_WIDGET_CONFIG = {
    ...MARKET_DATA_WIDGET_CONFIG,
    title: 'Major indices',
    symbolsGroups: [
        {
            name: 'Major indices',
            symbols: [
                { name: 'SP:SPX', displayName: 'S&P 500' },
                { name: 'NASDAQ:NDX', displayName: 'Nasdaq 100' },
                { name: 'TVC:DJI', displayName: 'Dow Jones' },
            ],
        },
    ],
};

const FUTURES_WIDGET_CONFIG = {
    ...MARKET_DATA_WIDGET_CONFIG,
    title: 'Futures preview',
    symbolsGroups: [
        {
            name: 'Futures',
            symbols: [
                { name: 'NYMEX:CL1!', displayName: 'Crude Oil' },
                { name: 'COMEX:GC1!', displayName: 'Gold' },
                { name: 'CME_MINI:ES1!', displayName: 'S&P 500 E-mini' },
            ],
        },
    ],
};

const MARKET_WIDGETS: Record<
    MarketFamilySlug,
    { title: string; script: string; config: Record<string, unknown> }
> = {
    overview: {
        title: 'Market overview',
        script: 'market-overview.js',
        config: MARKET_OVERVIEW_WIDGET_CONFIG,
    },
    indices: {
        title: 'Major indices',
        script: 'market-quotes.js',
        config: INDEX_WIDGET_CONFIG,
    },
    stocks: {
        title: 'Stocks',
        script: 'market-quotes.js',
        config: MARKET_DATA_WIDGET_CONFIG,
    },
    futures: {
        title: 'Futures',
        script: 'market-quotes.js',
        config: FUTURES_WIDGET_CONFIG,
    },
    crypto: {
        title: 'Crypto preview',
        script: 'market-quotes.js',
        config: CRYPTO_WIDGET_CONFIG,
    },
};

export default async function MarketPage({
    params,
}: {
    params: Promise<{ market: string }>;
}) {
    const { market } = await params;
    const family = getMarketFamily(market);

    if (!family) notFound();

    const widget = MARKET_WIDGETS[family.slug];
    const isCryptoPreview = family.slug === 'crypto';

    return (
        <div className="flex min-h-screen flex-col gap-8">
            <MarketFamilySwitcher />

            <header className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-400">
                        Markets
                    </p>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-500">
                        {family.dataOwnership === 'presentation'
                            ? 'Presentation preview'
                            : family.dataOwnership === 'mixed'
                                ? 'OpenStock + TradingView'
                                : 'OpenStock data path'}
                    </span>
                </div>
                <h1 className="text-3xl font-semibold text-gray-100">{family.label}</h1>
                <p className="max-w-3xl text-gray-400">{MARKET_COPY[family.slug]}</p>
                {isCryptoPreview && (
                    <p className="max-w-3xl rounded-lg border border-teal-400/20 bg-teal-400/5 px-4 py-3 text-sm text-teal-100">
                        This preview does not power OpenStock watchlists or alerts yet. Those will use a normalized provider adapter, with Luno evaluated for the South Africa/ZAR slice.
                    </p>
                )}
            </header>

            <section aria-labelledby={`${family.slug}-market-widget`} className="grid gap-8">
                <h2 id={`${family.slug}-market-widget`} className="sr-only">
                    {widget.title}
                </h2>
                <TradingViewWidget
                    title={widget.title}
                    scriptUrl={`${SCRIPT_URL}${widget.script}`}
                    config={widget.config}
                    className="custom-chart"
                    height={600}
                />
                {family.slug === 'overview' && (
                    <TradingViewWidget
                        title="Market heatmap"
                        scriptUrl={`${SCRIPT_URL}stock-heatmap.js`}
                        config={HEATMAP_WIDGET_CONFIG}
                        height={600}
                    />
                )}
            </section>
        </div>
    );
}
