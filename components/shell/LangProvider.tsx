'use client';

import { createContext, useContext, useLayoutEffect, useSyncExternalStore, type ReactNode } from 'react';
import { LANG_COOKIE, isLang, type Lang } from '@/lib/i18n';

/**
 * The language the server already resolved from the cookie, handed to client components so their
 * first render is already in the reader's language instead of committing English and flipping a
 * tick later.
 */
const LangContext = createContext<Lang>('en');

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
    return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export const useLang = (): Lang => useContext(LangContext);

const dirOf = (lang: Lang) => (lang === 'ar' ? 'rtl' : 'ltr');

/**
 * Sets <html lang/dir>. The root layout stays static so public pages can be served from the CDN, so
 * the layouts that already read the cookie set the document language here: an inline script for the
 * first paint, and a layout effect for client navigations and the toggle's refresh.
 */
export function HtmlLang({ lang }: { lang: Lang }) {
    useLayoutEffect(() => {
        const html = document.documentElement;
        html.lang = lang;
        html.dir = dirOf(lang);
        // Leaving for the English-only public pages puts the document back the way they render it
        return () => {
            html.lang = 'en';
            html.removeAttribute('dir');
        };
    }, [lang]);
    if (lang === 'en') return null;
    return (
        <script
            dangerouslySetInnerHTML={{
                __html: `document.documentElement.lang=${JSON.stringify(lang)};document.documentElement.dir=${JSON.stringify(dirOf(lang))};`,
            }}
        />
    );
}

const readCookieLang = (): Lang => {
    const value = document.cookie.match(new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=([^;]*)`))?.[1];
    return isLang(value) ? value : 'en';
};

/** For pages outside the cookie-reading layouts (the 404, which ISR pages render): English on the server, the cookie after hydration. */
export const useCookieLang = (): Lang => useSyncExternalStore(() => () => {}, readCookieLang, () => 'en');
