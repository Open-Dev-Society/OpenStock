'use server';

import { getCryptoAsset, type CryptoAsset } from '@/lib/markets/crypto-assets';
import {
    normalizeFinnhubCryptoQuote,
    type CryptoQuoteSnapshot,
    type FinnhubCryptoQuote,
} from '@/lib/markets/crypto-quotes';

const FINNHUB_BASE_URL = process.env.FINNHUB_BASE_URL ?? 'https://finnhub.io/api/v1';

export async function getCryptoQuote(symbol: string): Promise<CryptoQuoteSnapshot | null> {
    const asset = getCryptoAsset(symbol);
    if (!asset) return null;

    const token = process.env.FINNHUB_API_KEY ?? process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? '';
    if (!token) return null;

    const url = `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(asset.providerSymbol)}&token=${encodeURIComponent(token)}`;

    try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) return null;

        const quote = await response.json() as FinnhubCryptoQuote;
        return normalizeFinnhubCryptoQuote(asset, quote);
    } catch (error) {
        console.error('Error fetching crypto quote for', asset.symbol, error);
        return null;
    }
}

export async function getTopCryptoQuotes(): Promise<Array<{
    asset: CryptoAsset;
    quote: CryptoQuoteSnapshot | null;
}>> {
    const { CRYPTO_ASSETS } = await import('@/lib/markets/crypto-assets');
    const quotes = await Promise.all(CRYPTO_ASSETS.map(async (asset) => ({
        asset,
        quote: await getCryptoQuote(asset.symbol),
    })));

    return quotes;
}
