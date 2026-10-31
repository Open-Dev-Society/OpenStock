'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { LOCALE_COOKIE, isLocale } from '@/i18n/config';

export async function setLocale(locale: string) {
    if (!isLocale(locale)) return { success: false };
    (await cookies()).set(LOCALE_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
    revalidatePath('/', 'layout');
    return { success: true };
}
