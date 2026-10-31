'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LANG_COOKIE, isLang, type Lang } from '@/lib/i18n';

// The server layouts already read the cookie, so they hand the language down here and the
// first paint is in the right language. Client pages read it with useLang() instead of
// waiting for a round trip of their own.
const LangContext = createContext<Lang>('en');

export const LangProvider = ({ lang, children }: { lang: Lang; children: React.ReactNode }) => (
    <LangContext.Provider value={lang}>{children}</LangContext.Provider>
);

export const useLang = (): Lang => useContext(LangContext);

// AR ⇄ EN toggle. Persists in a cookie so server components render the same language.
export default function LangToggle({ initial }: { initial: Lang }) {
    const router = useRouter();
    const [lang, setLang] = useState<Lang>(initial);

    useEffect(() => {
        const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=([^;]*)`));
        if (isLang(m?.[1])) setLang(m[1]);
    }, []);

    const switchTo = (next: Lang) => {
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        setLang(next);
        // Refresh rather than reload: the server components re-render in the new language and
        // anything typed into a form on screen survives the switch.
        router.refresh();
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
