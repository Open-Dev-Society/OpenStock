import { describe, expect, it } from 'vitest';
import { formatNumber, formatPrice } from '@/lib/utils';

describe('formatPrice', () => {
    it('keeps the formatter output for currencies without a local override', () => {
        expect(formatPrice(25.92, 'USD', 'en')).toBe('$25.92');
        expect(formatPrice(1234.5, 'EUR', 'en')).toBe('€1,234.50');
    });

    it('spells the riyal the way the Arabic press writes it', () => {
        expect(formatPrice(25.92, 'SAR', 'en')).toBe('SAR 25.92');
        expect(formatPrice(25.92, 'SAR', 'ar')).toBe('\u2066ر.س ٢٥.٩٢\u2069');
    });

    it('keeps the separators and the sign in place', () => {
        expect(formatPrice(-1234.5, 'USD', 'en')).toBe('-$1,234.50');
        expect(formatPrice(0, 'USD', 'en')).toBe('$0.00');
    });
});

describe('formatNumber', () => {
    it('scales market cap with a suffix', () => {
        expect(formatNumber(2_000_000, 'en')).toBe('2.00T'); // Finnhub sends millions
        expect(formatNumber(1_500, 'en')).toBe('1.50B');
    });

    it('uses Arabic-Indic digits in Arabic and keeps the suffix', () => {
        expect(formatNumber(2_000_000, 'ar')).toBe('\u2066٢.٠٠\u2069T');
    });

    it('answers N/A instead of NaN', () => {
        expect(formatNumber(undefined, 'en')).toBe('N/A');
        expect(formatNumber(Number.NaN, 'ar')).toBe('N/A');
    });
});
