'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import InputField from '@/components/forms/InputField';
import FooterLink from '@/components/forms/FooterLink';
import { signInWithEmail } from "@/lib/actions/auth.actions";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import OpenDevSocietyBranding from "@/components/OpenDevSocietyBranding";
import SocialAuthButtons from "@/components/forms/SocialAuthButtons";
import LangToggle, { useLang } from "@/components/LangToggle";
import { tx } from "@/lib/i18n";
import React from "react";

const SignIn = () => {
    const router = useRouter()
    const lang = useLang();
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
            toast.error('Sign in failed', {
                description: result.error ?? 'Invalid email or password.',
            });
        } catch (e) {
            console.error(e);
            toast.error('Sign in failed', {
                description: e instanceof Error ? e.message : 'Failed to sign in.'
            })
        }
    }

    return (
        <>
            <div className="mb-2 flex items-center justify-between">
                <h1 className="form-title">{tx(lang, 'auth.welcome')}</h1>
                <LangToggle initial={lang} />
            </div>
            <p className="mb-8 text-faint">{tx(lang, 'auth.welcomeSub')}</p>

            <SocialAuthButtons />

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
                            message: 'Please enter a valid email address'
                        }
                    }}
                />

                <InputField
                    name="password"
                    label={tx(lang, 'auth.password')}
                    placeholder={tx(lang, 'auth.password')}
                    type="password"
                    register={register}
                    error={errors.password}
                    validation={{ required: 'Password is required', minLength: 8 }}
                />

                <div className="flex justify-end">
                    <Link href="/forgot-password" className="footer-link text-sm">
                        {tx(lang, 'auth.forgot')}
                    </Link>
                </div>

                <Button type="submit" disabled={isSubmitting} className="yellow-btn w-full mt-5">
                    {isSubmitting ? tx(lang, 'auth.submittingIn') : tx(lang, 'auth.submitIn')}
                </Button>

                <FooterLink text={tx(lang, 'auth.noAccount')} linkText={tx(lang, 'auth.signUpLink')} href="/sign-up" />
                <OpenDevSocietyBranding outerClassName="mt-10 flex justify-center" />
            </form>
        </>
    );
};
export default SignIn;
