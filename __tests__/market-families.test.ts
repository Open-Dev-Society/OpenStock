import { describe, expect, it } from 'vitest';
import { NAV_ITEMS } from '@/lib/constants';
import {
    MARKET_FAMILIES,
    getMarketFamily,
    isMarketFamilySlug,
} from '@/lib/markets/market-families';

describe('market families', () => {
    it('exposes the five initial market families in product order', () => {
        expect(MARKET_FAMILIES.map((family) => family.slug)).toEqual([
            'overview',
            'indices',
            'stocks',
            'futures',
            'crypto',
        ]);
    });

    it('describes crypto as an app-owned market with a stable route', () => {
        expect(getMarketFamily('crypto')).toMatchObject({
            slug: 'crypto',
            label: 'Crypto',
            href: '/markets/crypto',
            presentation: 'tradingview',
            dataOwnership: 'openstock',
        });
    });

    it('rejects unknown slugs without silently falling back to a market', () => {
        expect(getMarketFamily('commodities')).toBeUndefined();
        expect(isMarketFamilySlug('commodities')).toBe(false);
    });

    it('recognizes only configured market-family slugs', () => {
        expect(isMarketFamilySlug('overview')).toBe(true);
        expect(isMarketFamilySlug('crypto')).toBe(true);
        expect(isMarketFamilySlug('Crypto')).toBe(false);
    });

    it('exposes Markets in the primary navigation', () => {
        expect(NAV_ITEMS).toContainEqual({
            href: '/markets',
            label: 'Markets',
        });
    });
});
