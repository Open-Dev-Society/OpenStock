import { describe, expect, it, vi } from 'vitest';
import {
    CRYPTO_ASSETS,
    getCryptoAsset,
    searchCryptoAssets,
} from '@/lib/markets/crypto-assets';
import {
    getCryptoQuote,
} from '@/lib/actions/crypto.actions';
import { normalizeFinnhubCryptoQuote } from '@/lib/markets/crypto-quotes';
import { getAlertInstrumentKey } from '@/lib/markets/alert-routing';

describe('crypto asset registry', () => {
    it('contains the initial twenty-asset market universe', () => {
        expect(CRYPTO_ASSETS).toHaveLength(20);
        expect(CRYPTO_ASSETS.slice(0, 5).map((asset) => asset.symbol)).toEqual([
            'BTC',
            'ETH',
            'BNB',
            'XRP',
            'SOL',
        ]);
    });

    it('resolves a crypto asset by its display symbol or provider symbol', () => {
        expect(getCryptoAsset('btc')?.name).toBe('Bitcoin');
        expect(getCryptoAsset('BINANCE:ETHUSDT')?.symbol).toBe('ETH');
    });

    it('searches the app-owned universe by symbol or name', () => {
        expect(searchCryptoAssets('doge').map((asset) => asset.symbol)).toEqual(['DOGE']);
        expect(searchCryptoAssets('chain').map((asset) => asset.symbol)).toEqual(['LINK']);
    });

    it('returns the complete universe for an empty search', () => {
        expect(searchCryptoAssets('')).toEqual([...CRYPTO_ASSETS]);
    });
});

describe('Finnhub crypto quote adapter', () => {
    it('normalizes a Finnhub quote into an app-owned snapshot', () => {
        const asset = getCryptoAsset('BTC');
        expect(asset).toBeDefined();

        expect(normalizeFinnhubCryptoQuote(asset!, {
            c: 60000,
            d: 1200,
            dp: 2.03,
            h: 61000,
            l: 58000,
            t: 1700000000,
        }, 1700000010000)).toEqual({
            instrumentId: 'crypto:BINANCE:BTCUSDT',
            symbol: 'BTC',
            name: 'Bitcoin',
            provider: 'finnhub',
            providerSymbol: 'BINANCE:BTCUSDT',
            currency: 'USDT',
            price: 60000,
            change: 1200,
            changePercent: 2.03,
            high: 61000,
            low: 58000,
            providerTimestamp: 1700000000000,
            receivedAt: 1700000010000,
            freshness: 'live',
        });
    });

    it('fetches a supported crypto quote through Finnhub', async () => {
        process.env.FINNHUB_API_KEY = 'test-key';
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ c: 60000, dp: 1.5 }), { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        const result = await getCryptoQuote('BTC');

        expect(result?.price).toBe(60000);
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('symbol=BINANCE%3ABTCUSDT'),
            expect.objectContaining({ cache: 'no-store' }),
        );
    });

    it('rejects unsupported crypto symbols before making a provider request', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        await expect(getCryptoQuote('NOT_A_COIN')).resolves.toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

describe('asset-aware alert routing', () => {
    it('keeps crypto identities separate from stock symbols', () => {
        expect(getAlertInstrumentKey({ symbol: 'BTC', assetClass: 'equity' })).toBe('equity:BTC');
        expect(getAlertInstrumentKey({
            symbol: 'BTC',
            assetClass: 'crypto',
            instrumentId: 'crypto:BINANCE:BTCUSDT',
        })).toBe('crypto:BINANCE:BTCUSDT');
    });
});
