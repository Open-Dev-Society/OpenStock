import { cookies } from 'next/headers';
import { LANG_COOKIE, isLang, type Lang } from '@/lib/i18n';

export async function getLang(): Promise<Lang> {
    const saved = (await cookies()).get(LANG_COOKIE)?.value;
    return isLang(saved) ? saved : 'en';
}
