'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Lang } from '@/lib/i18n';

/**
 * The language the server already resolved from the cookie, handed to client components that sit
 * outside a page (the error boundary) so their first render is already in the reader's language
 * instead of committing English and flipping a tick later.
 */
const LangContext = createContext<Lang>('en');

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
    return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export const useLang = (): Lang => useContext(LangContext);
