'use client';

import { useContext } from 'react';
import { LocaleContext } from '@/components/LocaleProvider';
import type { Dictionary } from '@/i18n/en';

export function useDictionary(): Dictionary {
    const { dictionary } = useContext(LocaleContext);
    return dictionary;
}
