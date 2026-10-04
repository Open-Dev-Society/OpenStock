'use client';

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import InputField from "@/components/forms/InputField";
import ChoiceChips from "@/components/forms/ChoiceChips";
import PasswordRequirements from "@/components/forms/PasswordRequirements";
import { INVESTMENT_GOALS, PASSWORD_VALIDATION, PREFERRED_INDUSTRIES, RISK_TOLERANCE_OPTIONS } from "@/lib/constants";
import { CountrySelectField } from "@/components/forms/CountrySelectField";
import FooterLink from "@/components/forms/FooterLink";
import { signUpWithEmail } from "@/lib/actions/auth.actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import OpenDevSocietyBranding from "@/components/OpenDevSocietyBranding";
import SocialAuthButtons from "@/components/forms/SocialAuthButtons";
import LangToggle, { useLang } from "@/components/LangToggle";
import { tx } from "@/lib/i18n";
import React from "react";

const SignUp = () => {
    const router = useRouter()
    const lang = useLang();
    const {
        register,
        handleSubmit,
        control,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<SignUpFormData>({
        defaultValues: {
            fullName: '',
            email: '',
            password: '',
            country: 'SA',
            investmentGoals: 'Growth',
            riskTolerance: 'Medium',
            preferredIndustry: 'Technology'
        },
        mode: 'onBlur'
    },);

    const passwordValue = watch('password');

    const onSubmit = async (data: SignUpFormData) => {
        try {
            const result = await signUpWithEmail(data);
            if (result.success) {
                router.push('/dashboard');
                return;
            }
            toast.error('Sign up failed', {
                description: result.error ?? 'We could not create your account.',
            });
        } catch (e) {
            console.error(e);
            toast.error('Sign up failed', {
                description: e instanceof Error ? e.message : 'Failed to create an account.'
            })
        }
    }

    return (
        <>
            <div className="mb-2 flex items-center justify-between">
                <h1 className="form-title">{tx(lang, 'auth.create')}</h1>
                <LangToggle initial={lang} />
            </div>
            <p className="mb-8 text-faint">{tx(lang, 'auth.createSub')}</p>

            <SocialAuthButtons />

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
                <section className="flex flex-col gap-4" aria-label="Account">
                    <InputField
                        name="fullName"
                        label={tx(lang, 'auth.fullName')}
                        placeholder={tx(lang, 'auth.fullName')}
                        register={register}
                        error={errors.fullName}
                        validation={{ required: 'Full name is required', minLength: 2 }}
                    />
                    <InputField
                        name="email"
                        label={tx(lang, 'auth.email')}
                        placeholder="you@example.com"
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
                    <div className="flex flex-col gap-2">
                        <InputField
                            name="password"
                            label={tx(lang, 'auth.password')}
                            placeholder={tx(lang, 'auth.password')}
                            type="password"
                            register={register}
                            error={errors.password}
                            validation={PASSWORD_VALIDATION}
                        />
                        <PasswordRequirements password={passwordValue ?? ''} />
                    </div>
                </section>

                <section className="flex flex-col gap-5 border-t border-line pt-6" aria-labelledby="personalize">
                    <div>
                        <p id="personalize" className="kicker text-brand-ink">{tx(lang, 'auth.personalize')}</p>
                        <p className="mt-1 text-[13px] text-faint">{tx(lang, 'auth.personalizeSub')}</p>
                    </div>
                    <CountrySelectField
                        name="country"
                        label={tx(lang, 'profile.country')}
                        control={control}
                        error={errors.country}
                        required
                    />
                    <ChoiceChips name="investmentGoals" label={tx(lang, 'profile.goal')} options={INVESTMENT_GOALS} control={control} />
                    <ChoiceChips name="riskTolerance" label={tx(lang, 'profile.risk')} options={RISK_TOLERANCE_OPTIONS} control={control} />
                    <ChoiceChips name="preferredIndustry" label={tx(lang, 'profile.industry')} options={PREFERRED_INDUSTRIES} control={control} />
                </section>

                <div className="flex flex-col gap-4">
                    <Button type="submit" disabled={isSubmitting} className="yellow-btn w-full">
                        {isSubmitting ? tx(lang, 'auth.submitting') : tx(lang, 'auth.submit')}
                    </Button>
                    <FooterLink text={tx(lang, 'auth.haveAccount')} linkText={tx(lang, 'auth.signInLink')} href="/sign-in" />
                </div>

                <OpenDevSocietyBranding outerClassName="flex justify-center" />
            </form>
        </>
    )
}
export default SignUp;
