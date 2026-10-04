'use client';

import { useEffect, useState } from 'react';
import { LANG_COOKIE, isLang, type Lang } from '@/lib/i18n';

// AR ⇄ EN toggle. Persists in a cookie so server components render the same language.
export default function LangToggle({ initial }: { initial: Lang }) {
    const [lang, setLang] = useState<Lang>(initial);

    useEffect(() => {
        const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=([^;]*)`));
        if (isLang(m?.[1])) setLang(m[1]);
    }, []);

    const switchTo = (next: Lang) => {
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        window.location.reload();
    };

    return (
        <button
            type="button"
            onClick={() => switchTo(lang === 'ar' ? 'en' : 'ar')}
            title={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
            aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
            className="pill h-8"
        >
            {lang === 'ar' ? 'EN' : 'العربية'}
        </button>
    );
}

// Client pages (sign-in/up) read the same cookie without a server round-trip.
export function useLang(cookieLang?: Lang): Lang {
    const [lang, setLang] = useState<Lang>(cookieLang ?? 'en');
    useEffect(() => {
        const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=([^;]*)`));
        if (isLang(m?.[1])) setLang(m[1]);
    }, []);
    return lang;
}
