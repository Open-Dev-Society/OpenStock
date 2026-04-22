'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import InputField from '@/components/forms/InputField';
import FooterLink from '@/components/forms/FooterLink';
import OpenDevSocietyBranding from '@/components/OpenDevSocietyBranding';
import { resetPasswordWithToken } from '@/lib/actions/auth.actions';

type ResetPasswordFormData = {
    newPassword: string;
    confirmPassword: string;
};

const ResetPasswordPage = () => {
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
            toast.error('Reset link is invalid or expired.');
        }
    }, [error]);

    const onSubmit = async (data: ResetPasswordFormData) => {
        if (!token) {
            toast.error('Reset link is invalid or expired.');
            return;
        }

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
    };

    return (
        <>
            <h1 className="form-title">Choose a new password</h1>
            <p className="text-sm text-gray-400 mb-6">
                Enter a new password for your account.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <InputField
                    name="newPassword"
                    label="New Password"
                    placeholder="Enter a new password"
                    type="password"
                    register={register}
                    error={errors.newPassword}
                    validation={{ required: 'New password is required', minLength: 8 }}
                />

                <InputField
                    name="confirmPassword"
                    label="Confirm Password"
                    placeholder="Confirm your new password"
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
                    {isSubmitting ? 'Resetting password' : 'Reset password'}
                </Button>

                <FooterLink text="Need a fresh link?" linkText="Request another one" href="/forgot-password" />
                <OpenDevSocietyBranding outerClassName="mt-10 flex justify-center" />
            </form>
        </>
    );
};

export default ResetPasswordPage;
