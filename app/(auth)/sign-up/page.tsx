'use client';

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import InputField from "@/components/forms/InputField";
import ChoiceChips from "@/components/forms/ChoiceChips";
import PasswordRequirements from "@/components/forms/PasswordRequirements";
import { INVESTMENT_GOALS, passwordValidation, PREFERRED_INDUSTRIES, RISK_TOLERANCE_OPTIONS } from "@/lib/constants";
import { CountrySelectField } from "@/components/forms/CountrySelectField";
import FooterLink from "@/components/forms/FooterLink";
import { signUpWithEmail } from "@/lib/actions/auth.actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import OpenDevSocietyBranding from "@/components/OpenDevSocietyBranding";
import SocialAuthButtons from "@/components/forms/SocialAuthButtons";
import React from "react";

const SignUp = () => {
    const t = useTranslations('SignUp');
    const tFields = useTranslations('AuthFields');
    const tPrefs = useTranslations('PreferenceFields');
    const tPassword = useTranslations('Password');
    const tBrand = useTranslations('OpenDevSocietyBranding');
    const router = useRouter()
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
            country: 'IN',
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
            toast.error(t('failed'), {
                description: result.error ?? t('couldNotCreate'),
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

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
                <section className="flex flex-col gap-4" aria-label={t('accountSection')}>
                    <InputField
                        name="fullName"
                        label={t('fullNameLabel')}
                        placeholder={t('fullNamePlaceholder')}
                        register={register}
                        error={errors.fullName}
                        validation={{ required: t('fullNameRequired'), minLength: 2 }}
                    />
                    <InputField
                        name="email"
                        label={tFields('email')}
                        placeholder="you@example.com"
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
                    <div className="flex flex-col gap-2">
                        <InputField
                            name="password"
                            label={t('passwordLabel')}
                            placeholder={t('passwordPlaceholder')}
                            type="password"
                            register={register}
                            error={errors.password}
                            validation={passwordValidation({ required: tPassword('required'), minLength: tPassword('minLength'), pattern: tPassword('pattern') })}
                        />
                        <PasswordRequirements password={passwordValue ?? ''} />
                    </div>
                </section>

                <section className="flex flex-col gap-5 border-t border-line pt-6" aria-labelledby="personalize">
                    <div>
                        <p id="personalize" className="kicker text-brand-ink">{t('personalize')}</p>
                        <p className="mt-1 text-[13px] text-faint">{t('personalizeHint')}</p>
                    </div>
                    <CountrySelectField
                        name="country"
                        label={tPrefs('country')}
                        control={control}
                        error={errors.country}
                        required
                    />
                    <ChoiceChips name="investmentGoals" label={tPrefs('investmentGoal')} options={INVESTMENT_GOALS} optionGroup="investmentGoals" control={control} />
                    <ChoiceChips name="riskTolerance" label={tPrefs('riskTolerance')} options={RISK_TOLERANCE_OPTIONS} optionGroup="riskTolerance" control={control} />
                    <ChoiceChips name="preferredIndustry" label={tPrefs('preferredIndustry')} options={PREFERRED_INDUSTRIES} optionGroup="industries" control={control} />
                </section>

                <div className="flex flex-col gap-4">
                    <Button type="submit" disabled={isSubmitting} className="yellow-btn w-full">
                        {isSubmitting ? t('submitting') : t('submit')}
                    </Button>
                    <FooterLink text={t('haveAccount')} linkText={t('signIn')} href="/sign-in" />
                </div>

                <OpenDevSocietyBranding outerClassName="flex justify-center" text={tBrand('initiativeBy')} />
            </form>
        </>
    )
}
export default SignUp;
