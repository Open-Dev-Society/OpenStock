'use client';

import React, { createContext, useEffect, useState } from 'react';
import { type Locale, getDictionary } from '@/i18n';
import type { Dictionary } from '@/i18n/en';

interface LocaleContextType {
    locale: Locale;
    dictionary: Dictionary;
    setLocale: (locale: Locale) => void;
}

export const LocaleContext = createContext<LocaleContextType>({
    locale: 'en',
    dictionary: getDictionary('en'),
    setLocale: () => {},
});

interface LocaleProviderProps {
    children: React.ReactNode;
    locale: Locale;
    dictionary: Dictionary;
}

export function LocaleProvider({ children, locale: initialLocale, dictionary }: LocaleProviderProps) {
    const [locale, setLocale] = useState<Locale>(initialLocale);
    const [currentDictionary, setCurrentDictionary] = useState<Dictionary>(dictionary);

    useEffect(() => {
        setCurrentDictionary(getDictionary(locale));
    }, [locale]);

    const changeLocale = (newLocale: Locale) => {
        setLocale(newLocale);
        document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
    };

    return (
        <LocaleContext.Provider value={{ locale, dictionary: currentDictionary, setLocale: changeLocale }}>
            {children}
        </LocaleContext.Provider>
    );
}
