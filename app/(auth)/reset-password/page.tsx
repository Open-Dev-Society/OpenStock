'use client';

import { Suspense } from 'react';
import { useLang } from '@/components/LangToggle';
import { tx } from '@/lib/i18n';

import ResetPasswordForm from './ResetPasswordForm';

const ResetPasswordPage = () => {
    const lang = useLang();
    return (
        <Suspense fallback={<div className="text-sm text-gray-400">{tx(lang, 'auth.loadingReset')}</div>}>
            <ResetPasswordForm />
        </Suspense>
    );
};

export default ResetPasswordPage;
