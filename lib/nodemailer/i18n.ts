import { createTranslator, type Messages } from 'next-intl';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/i18n/config';
import { escapeHtml } from '@/lib/utils';

// Emails go out from Inngest jobs and auth callbacks, often with no user request to read a cookie from,
// so the caller passes the locale and the messages are loaded directly instead of through getTranslations.
export const getEmailTranslator = async (locale: unknown = DEFAULT_LOCALE) => {
    const lang: Locale = isLocale(locale) ? locale : DEFAULT_LOCALE;
    const messages = (await import(`../../messages/${lang}.json`)).default as Messages;
    return { lang, t: createTranslator({ locale: lang, messages, namespace: 'Emails' }) };
};

// One pass over {{key}} tokens, so a filled-in value (a name, AI text) can never expand another token
export const fillTemplate = (template: string, values: Record<string, string>) =>
    template.replace(/{{(\w+)}}/g, (token, key: string) => values[key] ?? token);

// Message copy is plain text; escape it before it goes into email HTML
export const escapeAll = (values: Record<string, string>) =>
    Object.fromEntries(Object.entries(values).map(([key, value]) => [key, escapeHtml(value)]));
