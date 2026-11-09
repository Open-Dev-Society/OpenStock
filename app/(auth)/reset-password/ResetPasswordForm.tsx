'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import FooterLink from '@/components/forms/FooterLink';
import InputField from '@/components/forms/InputField';
import PasswordRequirements from '@/components/forms/PasswordRequirements';
import OpenDevSocietyBranding from '@/components/OpenDevSocietyBranding';
import { Button } from '@/components/ui/button';
import { resetPasswordWithToken } from '@/lib/actions/auth.actions';
import { passwordValidation } from '@/lib/constants';

type ResetPasswordFormData = {
    newPassword: string;
    confirmPassword: string;
};

const ResetPasswordForm = () => {
    const t = useTranslations('ResetPassword');
    const tPassword = useTranslations('Password');
    const tBrand = useTranslations('OpenDevSocietyBranding');
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token') ?? '';
    const error = searchParams.get('error');

    const {
        register,
        watch,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ResetPasswordFormData>({
        defaultValues: {
            newPassword: '',
            confirmPassword: '',
        },
        mode: 'onBlur',
    });

    const newPassword = watch('newPassword');

    useEffect(() => {
        if (error === 'INVALID_TOKEN') {
            toast.error(t('invalidLink'));
        }
    }, [error, t]);

    const onSubmit = async (data: ResetPasswordFormData) => {
        if (!token) {
            toast.error(t('invalidLink'));
            return;
        }

        try {
            const result = await resetPasswordWithToken({
                token,
                newPassword: data.newPassword,
            });

            if (result.success) {
                toast.success(t('updated'));
                router.push('/sign-in');
                return;
            }

            toast.error(t('failed'), {
                description: result.error ?? t('unableToReset'),
            });
        } catch (error) {
            toast.error(t('failed'), {
                description: error instanceof Error ? error.message : t('unableToReset'),
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
                    name="newPassword"
                    label={t('newPasswordLabel')}
                    placeholder={t('newPasswordPlaceholder')}
                    type="password"
                    register={register}
                    error={errors.newPassword}
                    validation={passwordValidation({ required: tPassword('required'), minLength: tPassword('minLength'), pattern: tPassword('pattern') })}
                />
                <PasswordRequirements password={newPassword ?? ''} />

                <InputField
                    name="confirmPassword"
                    label={t('confirmPasswordLabel')}
                    placeholder={t('confirmPasswordPlaceholder')}
                    type="password"
                    register={register}
                    error={errors.confirmPassword}
                    validation={{
                        required: t('confirmRequired'),
                        validate: (value: string) =>
                            value === newPassword || t('mismatch'),
                    }}
                />

                <Button type="submit" disabled={isSubmitting} className="yellow-btn w-full mt-5">
                    {isSubmitting ? t('submitting') : t('submit')}
                </Button>

                <FooterLink text={t('needFreshLink')} linkText={t('requestAnother')} href="/forgot-password" />
                <OpenDevSocietyBranding outerClassName="mt-10 flex justify-center" text={tBrand('initiativeBy')} />
            </form>
        </>
    );
};

export default ResetPasswordForm;
