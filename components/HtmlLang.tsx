'use client';

import { useLayoutEffect } from 'react';
import { localeDir } from '@/i18n/config';

// The root layout stays static (marketing pages are prerendered in English), so the
// per-request layouts set <html lang dir> once the locale is known. For a right-to-left
// language an inline script sets them before the first paint, so the page never flashes
// left to right; the layout effect covers client navigation and the language switch.
export default function HtmlLang({ locale }: { locale: string }) {
    const dir = localeDir(locale);
    useLayoutEffect(() => {
        const html = document.documentElement;
        html.lang = locale;
        if (dir === 'rtl') html.dir = dir;
        else html.removeAttribute('dir');
        // Leaving for the English-only public pages puts <html> back the way they render it
        return () => {
            html.lang = 'en';
            html.removeAttribute('dir');
        };
    }, [locale, dir]);
    if (dir === 'ltr') return null;
    return (
        <script
            dangerouslySetInnerHTML={{
                __html: `document.documentElement.lang=${JSON.stringify(locale)};document.documentElement.dir=${JSON.stringify(dir)};`,
            }}
        />
    );
}
