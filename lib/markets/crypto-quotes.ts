import type { CryptoAsset } from '@/lib/markets/crypto-assets';

export type FinnhubCryptoQuote = {
    c?: number;
    d?: number;
    dp?: number;
    h?: number;
    l?: number;
    t?: number;
};

export type CryptoQuoteSnapshot = {
    instrumentId: string;
    symbol: string;
    name: string;
    provider: 'finnhub';
    providerSymbol: string;
    currency: string;
    price: number;
    change: number | null;
    changePercent: number | null;
    high: number | null;
    low: number | null;
    providerTimestamp: number | null;
    receivedAt: number;
    freshness: 'live';
};

function finiteOrNull(value: number | undefined): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function normalizeFinnhubCryptoQuote(
    asset: CryptoAsset,
    quote: FinnhubCryptoQuote,
    receivedAt = Date.now(),
): CryptoQuoteSnapshot | null {
    if (typeof quote.c !== 'number' || !Number.isFinite(quote.c) || quote.c <= 0) {
        return null;
    }

    return {
        instrumentId: `crypto:${asset.providerSymbol}`,
        symbol: asset.symbol,
        name: asset.name,
        provider: asset.provider,
        providerSymbol: asset.providerSymbol,
        currency: asset.quoteCurrency,
        price: quote.c,
        change: finiteOrNull(quote.d),
        changePercent: finiteOrNull(quote.dp),
        high: finiteOrNull(quote.h),
        low: finiteOrNull(quote.l),
        providerTimestamp: typeof quote.t === 'number' && Number.isFinite(quote.t)
            ? quote.t * 1000
            : null,
        receivedAt,
        freshness: 'live',
    };
}
