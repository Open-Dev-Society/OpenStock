'use client';

import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import InputField from "@/components/forms/InputField";
import PasswordRequirements from "@/components/forms/PasswordRequirements";
import { passwordValidation } from "@/lib/constants";
import { changePassword } from "@/lib/actions/profile.actions";

type PasswordInput = { currentPassword: string; newPassword: string };

export default function PasswordForm() {
    const t = useTranslations('PasswordForm');
    const tPassword = useTranslations('Password');
    const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<PasswordInput>({
        defaultValues: { currentPassword: '', newPassword: '' },
        mode: 'onBlur',
    });

    const onSubmit = async (values: PasswordInput) => {
        const result = await changePassword(values);
        if (!result.success) {
            toast.error(t('notChanged'), { description: result.error });
            return;
        }
        toast.success(t('changed'), { description: t('otherDevicesSignedOut') });
        reset();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-4">
            <InputField
                name="currentPassword"
                label={t('currentLabel')}
                placeholder={t('currentPlaceholder')}
                type="password"
                register={register}
                error={errors.currentPassword}
                validation={{ required: t('currentRequired') }}
            />
            <div className="flex flex-col gap-2">
                <InputField
                    name="newPassword"
                    label={t('newLabel')}
                    placeholder={t('newPlaceholder')}
                    type="password"
                    register={register}
                    error={errors.newPassword}
                    validation={passwordValidation({ required: tPassword('required'), minLength: tPassword('minLength'), pattern: tPassword('pattern') })}
                />
                <PasswordRequirements password={watch('newPassword') ?? ''} />
            </div>
            <button type="submit" disabled={isSubmitting} className="btn btn-ghost self-start">
                {isSubmitting ? t('submitting') : t('submit')}
            </button>
        </form>
    );
}
