'use client';

import { useContext } from 'react';
import { LocaleContext } from '@/components/LocaleProvider';
import type { Locale } from '@/i18n';

export function useLocale(): Locale {
    const { locale } = useContext(LocaleContext);
    return locale;
}
