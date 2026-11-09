'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import InputField from '@/components/forms/InputField';
import FooterLink from '@/components/forms/FooterLink';
import { signInWithEmail } from "@/lib/actions/auth.actions";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import OpenDevSocietyBranding from "@/components/OpenDevSocietyBranding";
import SocialAuthButtons from "@/components/forms/SocialAuthButtons";
import React from "react";

const SignIn = () => {
    const t = useTranslations('SignIn');
    const tFields = useTranslations('AuthFields');
    const tPassword = useTranslations('Password');
    const tBrand = useTranslations('OpenDevSocietyBranding');
    const router = useRouter()
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignInFormData>({
        defaultValues: {
            email: '',
            password: '',
        },
        mode: 'onBlur',
    });

    const onSubmit = async (data: SignInFormData) => {
        try {
            const result = await signInWithEmail(data);
            if (result.success) {
                router.push('/dashboard');
                return;
            }
            toast.error(t('failed'), {
                description: result.error ?? t('invalidCredentials'),
            });
        } catch (e) {
            console.error(e);
            toast.error(t('failed'), {
                description: e instanceof Error ? e.message : t('failedGeneric')
            })
        }
    }

    return (
        <>
            <h1 className="form-title mb-2">{t('title')}</h1>
            <p className="mb-8 text-faint">{t('subtitle')}</p>

            <SocialAuthButtons />

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
                            message: tFields('emailInvalid')
                        }
                    }}
                />

                <InputField
                    name="password"
                    label={t('passwordLabel')}
                    placeholder={t('passwordPlaceholder')}
                    type="password"
                    register={register}
                    error={errors.password}
                    validation={{ required: tPassword('required'), minLength: 8 }}
                />

                <div className="flex justify-end">
                    <Link href="/forgot-password" className="footer-link text-sm">
                        {t('forgotPassword')}
                    </Link>
                </div>

                <Button type="submit" disabled={isSubmitting} className="yellow-btn w-full mt-5">
                    {isSubmitting ? t('submitting') : t('submit')}
                </Button>

                <FooterLink text={t('noAccount')} linkText={t('createAccount')} href="/sign-up" />
                <OpenDevSocietyBranding outerClassName="mt-10 flex justify-center" text={tBrand('initiativeBy')} />
            </form>
        </>
    );
};
export default SignIn;
