'use client';

import { useForm } from "react-hook-form";
import { toast } from "sonner";
import InputField from "@/components/forms/InputField";
import PasswordRequirements from "@/components/forms/PasswordRequirements";
import { PASSWORD_VALIDATION } from "@/lib/constants";
import { changePassword } from "@/lib/actions/profile.actions";

type PasswordInput = { currentPassword: string; newPassword: string };

export default function PasswordForm() {
    const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<PasswordInput>({
        defaultValues: { currentPassword: '', newPassword: '' },
        mode: 'onBlur',
    });

    const onSubmit = async (values: PasswordInput) => {
        const result = await changePassword(values);
        if (!result.success) {
            toast.error('Password not changed', { description: result.error });
            return;
        }
        toast.success('Password changed', { description: 'Other devices were signed out.' });
        reset();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-4">
            <InputField
                name="currentPassword"
                label="Current password"
                placeholder="Your current password"
                type="password"
                register={register}
                error={errors.currentPassword}
                validation={{ required: 'Enter your current password' }}
            />
            <div className="flex flex-col gap-2">
                <InputField
                    name="newPassword"
                    label="New password"
                    placeholder="At least 8 characters"
                    type="password"
                    register={register}
                    error={errors.newPassword}
                    validation={PASSWORD_VALIDATION}
                />
                <PasswordRequirements password={watch('newPassword') ?? ''} />
            </div>
            <button type="submit" disabled={isSubmitting} className="btn btn-ghost self-start">
                {isSubmitting ? 'Changing' : 'Change password'}
            </button>
        </form>
    );
}
