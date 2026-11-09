import { cookies, headers } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from '@/i18n/config';

// Saved choice first, then the browser's Accept-Language, then English
export async function resolveLocale(): Promise<Locale> {
    const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
    if (isLocale(saved)) return saved;

    const accept = (await headers()).get('accept-language') ?? '';
    for (const part of accept.split(',')) {
        const base = part.split(';')[0].trim().toLowerCase().split('-')[0];
        if (isLocale(base)) return base;
    }
    return DEFAULT_LOCALE;
}
