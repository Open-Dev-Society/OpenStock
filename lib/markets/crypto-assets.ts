export type CryptoAsset = {
    symbol: string;
    name: string;
    provider: 'finnhub';
    providerSymbol: string;
    tradingViewSymbol: string;
    quoteCurrency: 'USDT';
    iconUrl: string;
};

// Deliberately bounded for the first app-owned crypto release. This is a
// curated top-market-cap universe; it is not a dynamic ranking feed.
export const CRYPTO_ASSETS = [
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'BNB', name: 'BNB' },
    { symbol: 'XRP', name: 'XRP' },
    { symbol: 'SOL', name: 'Solana' },
    { symbol: 'TRX', name: 'TRON' },
    { symbol: 'DOGE', name: 'Dogecoin' },
    { symbol: 'ADA', name: 'Cardano' },
    { symbol: 'LINK', name: 'Chainlink' },
    { symbol: 'AVAX', name: 'Avalanche' },
    { symbol: 'SHIB', name: 'Shiba Inu' },
    { symbol: 'DOT', name: 'Polkadot' },
    { symbol: 'LTC', name: 'Litecoin' },
    { symbol: 'BCH', name: 'Bitcoin Cash' },
    { symbol: 'UNI', name: 'Uniswap' },
    { symbol: 'XLM', name: 'Stellar' },
    { symbol: 'TON', name: 'Toncoin' },
    { symbol: 'NEAR', name: 'NEAR Protocol' },
    { symbol: 'ATOM', name: 'Cosmos' },
    { symbol: 'FIL', name: 'Filecoin' },
].map((asset) => {
    const providerSymbol = `BINANCE:${asset.symbol}USDT`;

    return {
        ...asset,
        provider: 'finnhub' as const,
        providerSymbol,
        tradingViewSymbol: providerSymbol,
        quoteCurrency: 'USDT' as const,
        iconUrl: `https://assets.coincap.io/assets/icons/${asset.symbol.toLowerCase()}@2x.png`,
    };
}) satisfies readonly CryptoAsset[];

const ASSET_BY_KEY = new Map(
    CRYPTO_ASSETS.flatMap((asset) => [
        [asset.symbol, asset],
        [asset.providerSymbol, asset],
    ] as const),
);

export function getCryptoAsset(value: string): CryptoAsset | undefined {
    return ASSET_BY_KEY.get(value.trim().toUpperCase());
}

export function searchCryptoAssets(query = ''): CryptoAsset[] {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return [...CRYPTO_ASSETS];

    return CRYPTO_ASSETS.filter((asset) =>
        [asset.symbol, asset.name, asset.providerSymbol]
            .some((field) => field.toLowerCase().includes(normalized)),
    );
}
