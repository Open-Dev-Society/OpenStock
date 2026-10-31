'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { LANG_COOKIE, isLang, tx, type Lang } from '@/lib/i18n';

// Keeps the shell (and the navigation the user was in) alive when a page throws, and answers in the
// interface language. The boundary is a client component, so the language comes from the cookie the
// server already wrote instead of a round trip.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    const [lang, setLang] = useState<Lang>('en');

    useEffect(() => {
        const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=([^;]*)`));
        if (isLang(match?.[1])) setLang(match[1]);
    }, []);

    return (
        <div className="card hatch p-6 text-center">
            <span className="empty-icon mx-auto"><AlertTriangle className="size-5" /></span>
            <h1 className="mt-3 text-xl font-bold tracking-[-0.02em] text-foreground">{tx(lang, 'error.title')}</h1>
            <p className="mt-1.5 text-[13.5px] text-muted-foreground">{tx(lang, 'error.sub')}</p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <button type="button" onClick={reset} className="btn btn-primary h-10">
                    {tx(lang, 'common.retry')}
                </button>
                <Link href="/dashboard" className="btn h-10">
                    {tx(lang, 'error.home')}
                </Link>
            </div>
        </div>
    );
}
