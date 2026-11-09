// Languages the signed-in app and auth pages ship in. The marketing site stays English
// (and static); only routes that already render per request read the locale cookie.
export const LOCALES = ['en', 'pl'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', pl: 'Polski' };

export const isLocale = (value: unknown): value is Locale => LOCALES.includes(value as Locale);

// Message keys for data titles that live in lib/ ("Consumer & health" -> "consumerHealth")
export const toMessageKey = (text: string) =>
    text.replace(/[^A-Za-z0-9]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : '')).replace(/^./, (c) => c.toLowerCase());
