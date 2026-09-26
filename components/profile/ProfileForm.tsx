'use client';

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import InputField from "@/components/forms/InputField";
import ChoiceChips from "@/components/forms/ChoiceChips";
import { CountrySelectField } from "@/components/forms/CountrySelectField";
import { INVESTMENT_GOALS, PREFERRED_INDUSTRIES, RISK_TOLERANCE_OPTIONS } from "@/lib/constants";
import { updateProfile, type ProfileInput } from "@/lib/actions/profile.actions";

export default function ProfileForm({ initial }: { initial: ProfileInput }) {
    const router = useRouter();
    const { register, control, handleSubmit, formState: { errors, isSubmitting, isDirty }, reset } = useForm<ProfileInput>({
        defaultValues: initial,
        mode: 'onBlur',
    });

    const onSubmit = async (values: ProfileInput) => {
        const result = await updateProfile(values);
        if (!result.success) {
            toast.error('Couldn’t save', { description: result.error });
            return;
        }
        toast.success('Profile saved');
        reset(values);
        router.refresh();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 p-4">
            <InputField
                name="name"
                label="Name"
                placeholder="Your name"
                register={register}
                error={errors.name}
                validation={{ required: 'Name is required', minLength: { value: 2, message: 'At least 2 characters' } }}
            />
            <CountrySelectField name="country" label="Country" control={control} error={errors.country} required />
            <ChoiceChips name="investmentGoals" label="Investment goal" options={INVESTMENT_GOALS} control={control} />
            <ChoiceChips name="riskTolerance" label="Risk tolerance" options={RISK_TOLERANCE_OPTIONS} control={control} />
            <ChoiceChips name="preferredIndustry" label="Preferred industry" options={PREFERRED_INDUSTRIES} control={control} />
            <div className="flex items-center gap-3 pt-1">
                <button type="submit" disabled={isSubmitting || !isDirty} className="btn btn-primary">
                    {isSubmitting ? 'Saving' : 'Save changes'}
                </button>
                {!isDirty && <span className="text-[13px] text-faint">Up to date</span>}
            </div>
        </form>
    );
}
