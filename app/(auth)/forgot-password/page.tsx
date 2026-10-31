'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import InputField from '@/components/forms/InputField';
import FooterLink from '@/components/forms/FooterLink';
import OpenDevSocietyBranding from '@/components/OpenDevSocietyBranding';
import LangToggle, { useLang } from '@/components/LangToggle';
import { tx } from '@/lib/i18n';
import { requestPasswordResetEmail } from '@/lib/actions/auth.actions';

type ForgotPasswordFormData = {
    email: string;
};

const ForgotPasswordPage = () => {
    const lang = useLang();
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ForgotPasswordFormData>({
        defaultValues: {
            email: '',
        },
        mode: 'onBlur',
    });

    const onSubmit = async (data: ForgotPasswordFormData) => {
        try {
            const result = await requestPasswordResetEmail(data);

            if (result.success) {
                toast.success(tx(lang, 'auth.resetSent'));
                return;
            }

            toast.error('Password reset unavailable', {
                description: result.error ?? 'Unable to start password reset.',
            });
        } catch (error) {
            toast.error('Password reset unavailable', {
                description: error instanceof Error ? error.message : 'Unable to start password reset.',
            });
        }
    };

    return (
        <>
            <div className="mb-2 flex items-center justify-between">
                <h1 className="form-title">{tx(lang, 'auth.forgotTitle')}</h1>
                <LangToggle initial={lang} />
            </div>
            <p className="text-sm text-gray-400 mb-6">
                {tx(lang, 'auth.forgotSub')}
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <InputField
                    name="email"
                    label={tx(lang, 'auth.email')}
                    placeholder="opendevsociety@cc.cc"
                    register={register}
                    error={errors.email}
                    validation={{
                        required: 'Email is required',
                        pattern: {
                            value: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
                            message: 'Please enter a valid email address',
                        },
                    }}
                />

                <Button type="submit" disabled={isSubmitting} className="yellow-btn w-full mt-5">
                    {isSubmitting ? tx(lang, 'auth.sendingLink') : tx(lang, 'auth.sendLink')}
                </Button>

                <FooterLink text={tx(lang, 'auth.remembered')} linkText={tx(lang, 'auth.signInLink')} href="/sign-in" />
                <OpenDevSocietyBranding outerClassName="mt-10 flex justify-center" />
            </form>
        </>
    );
};

export default ForgotPasswordPage;
