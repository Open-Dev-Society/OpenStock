'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import FooterLink from '@/components/forms/FooterLink';
import InputField from '@/components/forms/InputField';
import PasswordRequirements from '@/components/forms/PasswordRequirements';
import OpenDevSocietyBranding from '@/components/OpenDevSocietyBranding';
import { Button } from '@/components/ui/button';
import { resetPasswordWithToken } from '@/lib/actions/auth.actions';
import { PASSWORD_VALIDATION } from '@/lib/constants';
import LangToggle, { useLang } from '@/components/LangToggle';
import { tx } from '@/lib/i18n';

type ResetPasswordFormData = {
    newPassword: string;
    confirmPassword: string;
};

const ResetPasswordForm = () => {
    const router = useRouter();
    const lang = useLang();
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
            toast.error('Reset link is invalid or expired.');
        }
    }, [error]);

    const onSubmit = async (data: ResetPasswordFormData) => {
        if (!token) {
            toast.error('Reset link is invalid or expired.');
            return;
        }

        try {
            const result = await resetPasswordWithToken({
                token,
                newPassword: data.newPassword,
            });

            if (result.success) {
                toast.success('Password updated. You can sign in now.');
                router.push('/sign-in');
                return;
            }

            toast.error('Password reset failed', {
                description: result.error ?? 'Unable to reset your password.',
            });
        } catch (error) {
            toast.error('Password reset failed', {
                description: error instanceof Error ? error.message : 'Unable to reset your password.',
            });
        }
    };

    return (
        <>
            <div className="mb-2 flex items-center justify-between">
                <h1 className="form-title">{tx(lang, 'auth.newTitle')}</h1>
                <LangToggle initial={lang} />
            </div>
            <p className="text-sm text-gray-400 mb-6">
                {tx(lang, 'auth.newSub')}
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <InputField
                    name="newPassword"
                    label={tx(lang, 'pw.new')}
                    placeholder={tx(lang, 'pw.new')}
                    type="password"
                    register={register}
                    error={errors.newPassword}
                    validation={PASSWORD_VALIDATION}
                />
                <PasswordRequirements password={newPassword ?? ''} />

                <InputField
                    name="confirmPassword"
                    label={tx(lang, 'auth.confirm')}
                    placeholder={tx(lang, 'auth.confirm')}
                    type="password"
                    register={register}
                    error={errors.confirmPassword}
                    validation={{
                        required: 'Please confirm your new password',
                        validate: (value: string) =>
                            value === newPassword || 'Passwords do not match',
                    }}
                />

                <Button type="submit" disabled={isSubmitting} className="yellow-btn w-full mt-5">
                    {isSubmitting ? tx(lang, 'auth.resetting') : tx(lang, 'auth.reset')}
                </Button>

                <FooterLink text={tx(lang, 'auth.freshLink')} linkText={tx(lang, 'auth.requestAnother')} href="/forgot-password" />
                <OpenDevSocietyBranding outerClassName="mt-10 flex justify-center" />
            </form>
        </>
    );
};

export default ResetPasswordForm;
