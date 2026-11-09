'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import InputField from '@/components/forms/InputField';
import FooterLink from '@/components/forms/FooterLink';
import OpenDevSocietyBranding from '@/components/OpenDevSocietyBranding';
import { requestPasswordResetEmail } from '@/lib/actions/auth.actions';

type ForgotPasswordFormData = {
    email: string;
};

const ForgotPasswordPage = () => {
    const t = useTranslations('ForgotPassword');
    const tFields = useTranslations('AuthFields');
    const tBrand = useTranslations('OpenDevSocietyBranding');
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
                toast.success(t('sent'));
                return;
            }

            toast.error(t('unavailable'), {
                description: result.error ?? t('unableToStart'),
            });
        } catch (error) {
            toast.error(t('unavailable'), {
                description: error instanceof Error ? error.message : t('unableToStart'),
            });
        }
    };

    return (
        <>
            <h1 className="form-title">{t('title')}</h1>
            <p className="text-sm text-gray-400 mb-6">
                {t('subtitle')}
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <InputField
                    name="email"
                    label={tFields('email')}
                    placeholder="opendevsociety@cc.cc"
                    register={register}
                    error={errors.email}
                    validation={{
                        required: tFields('emailRequired'),
                        pattern: {
                            value: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
                            message: tFields('emailInvalid'),
                        },
                    }}
                />

                <Button type="submit" disabled={isSubmitting} className="yellow-btn w-full mt-5">
                    {isSubmitting ? t('submitting') : t('submit')}
                </Button>

                <FooterLink text={t('remembered')} linkText={t('signIn')} href="/sign-in" />
                <OpenDevSocietyBranding outerClassName="mt-10 flex justify-center" text={tBrand('initiativeBy')} />
            </form>
        </>
    );
};

export default ForgotPasswordPage;
