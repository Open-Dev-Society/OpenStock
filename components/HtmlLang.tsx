'use client';

import { useEffect } from 'react';

// The root layout stays static (marketing pages are prerendered in English), so the
// per-request layouts set <html lang> once the locale is known.
export default function HtmlLang({ locale }: { locale: string }) {
    useEffect(() => {
        document.documentElement.lang = locale;
    }, [locale]);
    return null;
}
