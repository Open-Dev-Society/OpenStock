import { describe, it, expect } from 'vitest';
import { STRINGS, tx, type Lang } from '@/lib/i18n';

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
