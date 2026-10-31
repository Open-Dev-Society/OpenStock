import { describe, expect, it } from 'vitest';
import { SAUDI_SYMBOLS, searchSaudiSymbols, normalizeArabic } from '@/lib/saudi-symbols';

// Arabic users type company names in Arabic script. Finnhub's index is Latin-only, so a local
// table answers those queries. These tests pin the normalisation and the ranking.

describe('normalizeArabic', () => {
    it('folds the alef, ya and ta-marbuta variants so one spelling matches them all', () => {
        expect(normalizeArabic('أرامكو')).toBe(normalizeArabic('ارامكو'));
        expect(normalizeArabic('مصرف الراجحى')).toBe(normalizeArabic('مصرف الراجحي'));
        expect(normalizeArabic('الشركة')).toBe(normalizeArabic('الشركه'));
    });

    it('drops diacritics, tatweel and punctuation', () => {
        expect(normalizeArabic('أَرَامْكُو')).toBe('ارامكو');
        expect(normalizeArabic('ســـابك')).toBe('سابك');
        expect(normalizeArabic('  سابك!  ')).toBe('سابك');
    });
});

describe('searchSaudiSymbols', () => {
    it('finds Aramco from any of its Arabic spellings', () => {
        for (const query of ['أرامكو', 'ارامكو', 'أرامكو السعودية']) {
            expect(searchSaudiSymbols(query)[0]?.symbol).toBe('2222.SR');
        }
    });

    it('finds the big names a reader would type', () => {
        expect(searchSaudiSymbols('الراجحي')[0]?.symbol).toBe('1120.SR');
        expect(searchSaudiSymbols('سابك')[0]?.symbol).toBe('2010.SR');
        expect(searchSaudiSymbols('المراعي')[0]?.symbol).toBe('2280.SR');
        expect(searchSaudiSymbols('معادن')[0]?.symbol).toBe('1211.SR');
        expect(searchSaudiSymbols('الاتصالات السعودية')[0]?.symbol).toBe('7010.SR');
        expect(searchSaudiSymbols('الحبيب')[0]?.symbol).toBe('4013.SR');
    });

    it('lets a longer phrase narrow the field by name', () => {
        expect(searchSaudiSymbols('شركة الاتصالات السعودية')[0]?.symbol).toBe('7010.SR');
        expect(searchSaudiSymbols('مصرف الراجحي')[0]?.symbol).toBe('1120.SR');
    });

    it('prefers an exact name over a name that merely contains the query', () => {
        // "الرياض" is the bank's name, and also the start of "الرياض للتعمير".
        expect(searchSaudiSymbols('الرياض')[0]?.symbol).toBe('1010.SR');
    });

    it('returns nothing for a Latin query, which Finnhub already covers', () => {
        expect(searchSaudiSymbols('aramco')).toEqual([]);
        expect(searchSaudiSymbols('sabic')).toEqual([]);
    });

    it('does not fire on a single character', () => {
        expect(searchSaudiSymbols('س')).toEqual([]);
        expect(searchSaudiSymbols('')).toEqual([]);
    });

    it('caps the list', () => {
        expect(searchSaudiSymbols('ال', 3).length).toBeLessThanOrEqual(3);
    });
});

describe('the Saudi table itself', () => {
    it('holds both markets, with a unique ticker each', () => {
        expect(SAUDI_SYMBOLS.length).toBeGreaterThanOrEqual(388);
        expect(new Set(SAUDI_SYMBOLS.map((entry) => entry.symbol)).size).toBe(SAUDI_SYMBOLS.length);
        expect(SAUDI_SYMBOLS.every((entry) => /^\d{4}\.SR$/.test(entry.symbol))).toBe(true);
        // Main market and the parallel market (Nomu, 9xxx) are both covered.
        expect(SAUDI_SYMBOLS.filter((entry) => entry.symbol.startsWith('9')).length).toBeGreaterThanOrEqual(110);
        expect(SAUDI_SYMBOLS.filter((entry) => !entry.symbol.startsWith('9')).length).toBeGreaterThanOrEqual(270);
    });

    it('gives every company at least one Arabic name', () => {
        const noArabic = SAUDI_SYMBOLS.filter(
            (entry) => !entry.aliases.some((alias) => /[\u0600-\u06FF]/.test(alias))
        );
        expect(noArabic).toEqual([]);
    });

    it('finds listings that postdate the published list', () => {
        expect(searchSaudiSymbols('فلاي ناس')[0]?.symbol).toBe('4264.SR');
        expect(searchSaudiSymbols('جاهز')[0]?.symbol).toBe('6017.SR');
        expect(searchSaudiSymbols('علم')[0]?.symbol).toBe('7203.SR');
        expect(searchSaudiSymbols('أديس')[0]?.symbol).toBe('2382.SR');
        expect(searchSaudiSymbols('كابلات الرياض')[0]?.symbol).toBe('4142.SR');
    });

    it('finds parallel-market (Nomu) companies too', () => {
        expect(searchSaudiSymbols('فش فاش')[0]?.symbol).toBe('9515.SR');
        expect(searchSaudiSymbols('إنمار')[0]?.symbol).toBe('9521.SR');
        expect(searchSaudiSymbols('الناقول')[0]?.symbol).toBe('9514.SR');
    });
});
