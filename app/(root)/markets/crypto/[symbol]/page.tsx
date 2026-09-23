import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/better-auth/auth';
import { Button } from '@/components/ui/button';
import WatchlistButton from '@/components/WatchlistButton';
import CreateAlertModal from '@/components/watchlist/CreateAlertModal';
import { getCryptoQuote } from '@/lib/actions/crypto.actions';
import { isInstrumentInWatchlist } from '@/lib/actions/watchlist.actions';
import { getCryptoAsset } from '@/lib/markets/crypto-assets';
import CryptoAssetIcon from '@/components/markets/CryptoAssetIcon';

export default async function CryptoDetails({
    params,
}: {
    params: Promise<{ symbol: string }>;
}) {
    const { symbol } = await params;
    const asset = getCryptoAsset(symbol);

    if (!asset) notFound();

    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;
    const instrumentId = `crypto:${asset.providerSymbol}`;
    const [quote, isInWatchlist] = await Promise.all([
        getCryptoQuote(asset.symbol),
        userId ? isInstrumentInWatchlist(userId, instrumentId) : Promise.resolve(false),
    ]);

    return (
        <div className="flex min-h-screen flex-col gap-8">
            <header className="flex flex-col gap-3">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-400">Crypto</p>
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <CryptoAssetIcon asset={asset} size="lg" />
                        <div>
                            <h1 className="text-3xl font-semibold text-gray-100">{asset.name} <span className="text-gray-500">({asset.symbol})</span></h1>
                            <p className="mt-2 text-gray-400">Finnhub app-owned quote · {asset.providerSymbol}</p>
                        </div>
                    </div>
                    {userId && (
                        <div className="flex items-center gap-2">
                            <WatchlistButton
                                symbol={asset.symbol}
                                company={asset.name}
                                isInWatchlist={isInWatchlist}
                                userId={userId}
                                assetClass="crypto"
                                instrumentId={instrumentId}
                                provider={asset.provider}
                                providerSymbol={asset.providerSymbol}
                                quoteCurrency={asset.quoteCurrency}
                                venue="BINANCE"
                            />
                            {quote && (
                                <CreateAlertModal
                                    userId={userId}
                                    symbol={asset.symbol}
                                    companyName={asset.name}
                                    currentPrice={quote.price}
                                    assetClass="crypto"
                                    instrumentId={instrumentId}
                                    provider={asset.provider}
                                    providerSymbol={asset.providerSymbol}
                                    currency={asset.quoteCurrency}
                                >
                                    <Button type="button" variant="outline" className="border-gray-700 text-gray-200 hover:bg-white/10">
                                        Create alert
                                    </Button>
                                </CreateAlertModal>
                            )}
                        </div>
                    )}
                </div>
            </header>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-5 sm:col-span-2">
                    <p className="text-sm text-gray-500">Current price</p>
                    <p className="mt-2 text-4xl font-semibold text-gray-100">
                        {quote ? `${quote.price.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${quote.currency}` : 'Unavailable'}
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                        {quote ? `As of ${new Date(quote.receivedAt).toLocaleString()}` : 'Finnhub did not return a usable quote.'}
                    </p>
                </div>
                <QuoteMetric label="Change" value={quote?.change} suffix={quote ? ` ${quote.currency}` : ''} />
                <QuoteMetric label="Change %" value={quote?.changePercent} suffix="%" />
                <QuoteMetric label="24h high" value={quote?.high} suffix={quote ? ` ${quote.currency}` : ''} />
                <QuoteMetric label="24h low" value={quote?.low} suffix={quote ? ` ${quote.currency}` : ''} />
            </section>
        </div>
    );
}

function QuoteMetric({ label, value, suffix = '' }: { label: string; value: number | null | undefined; suffix?: string }) {
    return (
        <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-5">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-2 text-xl font-medium text-gray-200">
                {typeof value === 'number' ? `${value.toLocaleString(undefined, { maximumFractionDigits: 8 })}${suffix}` : '—'}
            </p>
        </div>
    );
}
