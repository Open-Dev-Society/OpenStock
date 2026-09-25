export const MARKET_FAMILIES = [
    {
        slug: 'overview',
        label: 'Overview',
        href: '/markets/overview',
        presentation: 'tradingview',
        dataOwnership: 'presentation',
    },
    {
        slug: 'indices',
        label: 'Major Indices',
        href: '/markets/indices',
        presentation: 'tradingview',
        dataOwnership: 'presentation',
    },
    {
        slug: 'stocks',
        label: 'Stocks',
        href: '/markets/stocks',
        presentation: 'tradingview',
        dataOwnership: 'mixed',
    },
    {
        slug: 'futures',
        label: 'Futures',
        href: '/markets/futures',
        presentation: 'tradingview',
        dataOwnership: 'presentation',
    },
    {
        slug: 'crypto',
        label: 'Crypto',
        href: '/markets/crypto',
        presentation: 'tradingview',
        dataOwnership: 'openstock',
    },
] as const;

export type MarketFamily = (typeof MARKET_FAMILIES)[number];
export type MarketFamilySlug = MarketFamily['slug'];

const MARKET_FAMILY_BY_SLUG = new Map(
    MARKET_FAMILIES.map((family) => [family.slug, family]),
);

export function getMarketFamily(slug: string): MarketFamily | undefined {
    return MARKET_FAMILY_BY_SLUG.get(slug as MarketFamilySlug);
}

export function isMarketFamilySlug(slug: string): slug is MarketFamilySlug {
    return MARKET_FAMILY_BY_SLUG.has(slug as MarketFamilySlug);
}
