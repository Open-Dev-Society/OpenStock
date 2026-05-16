import { en, type Dictionary } from './en';
import { zhCN } from './zh-CN';

export const dictionaries = {
    en,
    'zh-CN': zhCN,
} as const;

export type Locale = keyof typeof dictionaries;

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
    'en': 'English',
    'zh-CN': '简体中文',
};

export function getDictionary(locale: Locale): Dictionary {
    return dictionaries[locale] ?? dictionaries[defaultLocale];
}
