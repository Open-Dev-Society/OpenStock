'use client';

import { useForm } from "react-hook-form";
import { toast } from "sonner";
import InputField from "@/components/forms/InputField";
import PasswordRequirements from "@/components/forms/PasswordRequirements";
import { PASSWORD_VALIDATION } from "@/lib/constants";
import { changePassword } from "@/lib/actions/profile.actions";
import { tx, type Lang } from "@/lib/i18n";

type PasswordInput = { currentPassword: string; newPassword: string };

export default function PasswordForm({ lang }: { lang: Lang }) {
    const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<PasswordInput>({
        defaultValues: { currentPassword: '', newPassword: '' },
        mode: 'onBlur',
    });

    const onSubmit = async (values: PasswordInput) => {
        const result = await changePassword(values);
        if (!result.success) {
            toast.error(tx(lang, 'pw.failed'), { description: result.error });
            return;
        }
        toast.success(tx(lang, 'pw.changed'), { description: tx(lang, 'pw.changedSub') });
        reset();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-4">
            <InputField
                name="currentPassword"
                label={tx(lang, 'pw.current')}
                placeholder={tx(lang, 'pw.current')}
                type="password"
                register={register}
                error={errors.currentPassword}
                validation={{ required: 'Enter your current password' }}
            />
            <div className="flex flex-col gap-2">
                <InputField
                    name="newPassword"
                    label={tx(lang, 'pw.new')}
                    placeholder={tx(lang, 'pw.new')}
                    type="password"
                    register={register}
                    error={errors.newPassword}
                    validation={PASSWORD_VALIDATION}
                />
                <PasswordRequirements password={watch('newPassword') ?? ''} lang={lang} />
            </div>
            <button type="submit" disabled={isSubmitting} className="btn btn-ghost self-start">
                {isSubmitting ? tx(lang, 'pw.changing') : tx(lang, 'pw.change')}
            </button>
        </form>
    );
}
