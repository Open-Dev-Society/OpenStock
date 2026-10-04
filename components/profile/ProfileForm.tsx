'use client';

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import InputField from "@/components/forms/InputField";
import ChoiceChips from "@/components/forms/ChoiceChips";
import { CountrySelectField } from "@/components/forms/CountrySelectField";
import { INVESTMENT_GOALS, PREFERRED_INDUSTRIES, RISK_TOLERANCE_OPTIONS } from "@/lib/constants";
import { updateProfile, type ProfileInput } from "@/lib/actions/profile.actions";
import { tx, type Lang } from "@/lib/i18n";

export default function ProfileForm({ initial, lang }: { initial: ProfileInput; lang: Lang }) {
    const router = useRouter();
    const { register, control, handleSubmit, formState: { errors, isSubmitting, isDirty }, reset } = useForm<ProfileInput>({
        defaultValues: initial,
        mode: 'onBlur',
    });

    const onSubmit = async (values: ProfileInput) => {
        const result = await updateProfile(values);
        if (!result.success) {
            toast.error(tx(lang, 'profile.saveFail'), { description: result.error });
            return;
        }
        toast.success(tx(lang, 'profile.saved'));
        reset(values);
        router.refresh();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 p-4">
            <InputField
                name="name"
                label={tx(lang, 'profile.name')}
                placeholder={tx(lang, 'profile.namePh')}
                register={register}
                error={errors.name}
                validation={{ required: 'Name is required', minLength: { value: 2, message: 'At least 2 characters' } }}
            />
            <CountrySelectField name="country" label={tx(lang, 'profile.country')} control={control} error={errors.country} required />
            <ChoiceChips name="investmentGoals" label={tx(lang, 'profile.goal')} options={INVESTMENT_GOALS} control={control} />
            <ChoiceChips name="riskTolerance" label={tx(lang, 'profile.risk')} options={RISK_TOLERANCE_OPTIONS} control={control} />
            <ChoiceChips name="preferredIndustry" label={tx(lang, 'profile.industry')} options={PREFERRED_INDUSTRIES} control={control} />
            <div className="flex items-center gap-3 pt-1">
                <button type="submit" disabled={isSubmitting || !isDirty} className="btn btn-primary">
                    {isSubmitting ? tx(lang, 'profile.saving') : tx(lang, 'profile.save')}
                </button>
                {!isDirty && <span className="text-[13px] text-faint">{tx(lang, 'profile.upToDate')}</span>}
            </div>
        </form>
    );
}
