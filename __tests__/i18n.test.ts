import { describe, it, expect } from 'vitest';
import { STRINGS, alignmentLabel, arDigits, arNumberDigits, choiceLabel, feedWord, marketName, trendLabel, tx, typeLabel, type Lang } from '@/lib/i18n';

describe('i18n dictionaries', () => {
    const langs: Lang[] = ['en', 'ar'];

    it('share exactly the same keys', () => {
        expect(Object.keys(STRINGS.ar).sort()).toEqual(Object.keys(STRINGS.en).sort());
    });

    it('has no empty strings', () => {
        for (const lang of langs) {
            for (const [key, value] of Object.entries(STRINGS[lang])) {
                expect(value.trim().length, `${lang}:${key}`).toBeGreaterThan(0);
            }
        }
    });

    it('resolves both languages', () => {
        expect(tx('en', 'nav.watchlist')).toBe('Watchlist');
        expect(tx('ar', 'nav.watchlist')).toBe('قائمة المتابعة');
    });

    it('falls back to English on unexpected values', () => {
        expect(tx(undefined as unknown as Lang, 'nav.watchlist')).toBe('Watchlist');
        expect(tx('fr' as unknown as Lang, 'nav.watchlist')).toBe('Watchlist');
    });
});

// The helpers translate values that arrive as data (market ids, option values, the sentiment
// service's vocabulary), so they deserve their own checks: the fallback must never be lost.
describe('value lookups', () => {
    it('translates market ids in both languages', () => {
        expect(marketName('en', 'sa')).toBe('Saudi Arabia');
        expect(marketName('ar', 'sa')).toBe('السعودية');
        expect(marketName('ar', 'crypto')).toBe('العملات الرقمية');
    });

    it('keeps the feed adjective natural in a sentence', () => {
        expect(feedWord('en', 'Live')).toBe('Live');
        expect(feedWord('ar', 'Live')).toBe('مباشرة');
        expect(feedWord('ar', 'End of day')).toBe('عند الإغلاق');
    });

    it('translates choice values and falls back to the English label', () => {
        expect(choiceLabel('ar', 'Growth', 'Growth')).toBe('نمو');
        expect(choiceLabel('en', 'Consumer Goods', 'Consumer Goods')).toBe('Consumer Goods');
        expect(choiceLabel('ar', 'Unknown', 'Unknown')).toBe('Unknown');
    });

    it('translates the sentiment vocabulary and passes unknown values through', () => {
        expect(trendLabel('ar', 'rising')).toBe('صاعد');
        expect(trendLabel('ar', null)).toBe('لا اتجاه');
        expect(trendLabel('ar', 'sideways')).toBe('sideways');
        expect(alignmentLabel('ar', 'Mixed')).toBe('مختلط');
        expect(alignmentLabel('ar', 'Bullish alignment')).toBe('توافق صعودي');
        expect(alignmentLabel('ar', 'Bearish alignment')).toBe('توافق هبوطي');
        expect(alignmentLabel('ar', 'Wide divergence')).toBe('تباين واسع');
        expect(alignmentLabel('en', 'Wide divergence')).toBe('Wide divergence');
        expect(alignmentLabel('ar', 'Something new')).toBe('Something new');
    });

    it('translates the security types the feeds send in English', () => {
        expect(typeLabel('ar', 'Common Stock')).toBe('سهم عادي');
        expect(typeLabel('ar', 'ETF')).toBe('صندوق مؤشر (ETF)');
        expect(typeLabel('ar', 'REIT')).toBe('صندوق عقاري (ريت)');
        expect(typeLabel('en', 'Common Stock')).toBe('Common Stock');
        // A type we have never seen is shown exactly as it arrived, never blanked.
        expect(typeLabel('ar', 'Carbon Credit')).toBe('Carbon Credit');
        expect(typeLabel('ar', null)).toBe('');
    });
});

describe('Arabic digits', () => {
    it('leaves English output untouched', () => {
        expect(arDigits('1,234.50', 'en')).toBe('1,234.50');
        expect(arNumberDigits('12.5', 'en')).toBe('12.5');
    });

    it('swaps the digits but keeps the separators', () => {
        expect(arNumberDigits('1,234.50', 'ar')).toBe('١,٢٣٤.٥٠');
    });

    it('isolates a formatted amount so the RTL paragraph cannot reorder it', () => {
        // U+2066 LRI … U+2069 PDI: without the pair "25.92" can render as "92.25"-looking text.
        expect(arDigits('25.92', 'ar')).toBe('\u2066٢٥.٩٢\u2069');
    });
});
