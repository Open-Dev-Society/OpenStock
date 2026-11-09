'use server';

import { cookies } from 'next/headers';
import { LOCALE_COOKIE, isLocale } from '@/i18n/config';

// No revalidatePath: it would purge the static/ISR cache of every public page on each switch. The pages
// that read the locale render per request, and the switcher calls router.refresh() after this.
export async function setLocale(locale: string) {
    if (!isLocale(locale)) return { success: false };
    (await cookies()).set(LOCALE_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
    return { success: true };
}
