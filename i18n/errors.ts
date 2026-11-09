import { getTranslations } from 'next-intl/server';
import { createTranslator } from 'next-intl';
import en from '@/messages/en.json';

const english = () => createTranslator({ locale: 'en', messages: en, namespace: 'Errors' });

// Server-action errors in the user's language. Outside a request (tests, scripts) there is no
// locale to read, so the English messages are used.
export async function getErrorTranslator() {
    try {
        return (await getTranslations('Errors')) ?? english();
    } catch {
        return english();
    }
}
