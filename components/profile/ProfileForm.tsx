'use client';

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import InputField from "@/components/forms/InputField";
import ChoiceChips from "@/components/forms/ChoiceChips";
import { CountrySelectField } from "@/components/forms/CountrySelectField";
import { INVESTMENT_GOALS, PREFERRED_INDUSTRIES, RISK_TOLERANCE_OPTIONS } from "@/lib/constants";
import { updateProfile, type ProfileInput } from "@/lib/actions/profile.actions";

export default function ProfileForm({ initial }: { initial: ProfileInput }) {
    const t = useTranslations('ProfileForm');
    const tPrefs = useTranslations('PreferenceFields');
    const router = useRouter();
    const { register, control, handleSubmit, formState: { errors, isSubmitting, isDirty }, reset } = useForm<ProfileInput>({
        defaultValues: initial,
        mode: 'onBlur',
    });

    const onSubmit = async (values: ProfileInput) => {
        const result = await updateProfile(values);
        if (!result.success) {
            toast.error(t('saveFailed'), { description: result.error });
            return;
        }
        toast.success(t('saved'));
        reset(values);
        router.refresh();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 p-4">
            <InputField
                name="name"
                label={t('nameLabel')}
                placeholder={t('namePlaceholder')}
                register={register}
                error={errors.name}
                validation={{ required: t('nameRequired'), minLength: { value: 2, message: t('nameMinLength') } }}
            />
            <CountrySelectField name="country" label={tPrefs('country')} control={control} error={errors.country} required />
            <ChoiceChips name="investmentGoals" label={tPrefs('investmentGoal')} options={INVESTMENT_GOALS} optionGroup="investmentGoals" control={control} />
            <ChoiceChips name="riskTolerance" label={tPrefs('riskTolerance')} options={RISK_TOLERANCE_OPTIONS} optionGroup="riskTolerance" control={control} />
            <ChoiceChips name="preferredIndustry" label={tPrefs('preferredIndustry')} options={PREFERRED_INDUSTRIES} optionGroup="industries" control={control} />
            <div className="flex items-center gap-3 pt-1">
                <button type="submit" disabled={isSubmitting || !isDirty} className="btn btn-primary">
                    {isSubmitting ? t('submitting') : t('submit')}
                </button>
                {!isDirty && <span className="text-[13px] text-faint">{t('upToDate')}</span>}
            </div>
        </form>
    );
}
