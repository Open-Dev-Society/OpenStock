import { getRequestConfig } from 'next-intl/server';
import { isLocale } from '@/i18n/config';
import { resolveLocale } from '@/i18n/locale';

export default getRequestConfig(async ({ requestLocale }) => {
    // getTranslations({ locale }) passes one in (emails sent outside a request); otherwise read the cookie
    const requested = await requestLocale;
    const locale = isLocale(requested) ? requested : await resolveLocale();
    return {
        locale,
        messages: (await import(`../messages/${locale}.json`)).default,
    };
});
