'use client';

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import InputField from "@/components/forms/InputField";
import SelectField from "@/components/forms/SelectField";
import { INVESTMENT_GOALS, PREFERRED_INDUSTRIES, RISK_TOLERANCE_OPTIONS } from "@/lib/constants";
import { CountrySelectField } from "@/components/forms/CountrySelectField";
import FooterLink from "@/components/forms/FooterLink";
import { signUpWithEmail } from "@/lib/actions/auth.actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import OpenDevSocietyBranding from "@/components/OpenDevSocietyBranding";
import React from "react";

/**
 * 注册与个性化设置页面组件
 */
const SignUp = () => {
    const router = useRouter()
    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
    } = useForm<SignUpFormData>({
        defaultValues: {
            fullName: '',
            email: '',
            password: '',
            country: 'CN',
            investmentGoals: 'Growth',
            riskTolerance: 'Medium',
            preferredIndustry: 'Technology'
        },
        mode: 'onBlur'
    },);

    const onSubmit = async (data: SignUpFormData) => {
        try {
            const result = await signUpWithEmail(data);
            if (result.success) {
                router.push('/');
                return;
            }
            // 注册失败提示
            toast.error('注册失败', {
                description: result.error ?? '无法为您创建账号，请稍后重试。',
            });
        } catch (e) {
            console.error(e);
            toast.error('注册失败', {
                description: e instanceof Error ? e.message : '创建账号失败。'
            })
        }
    }

    return (
        <>
            <h1 className="form-title">注册并个性化您的设置</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <InputField
                    name="fullName"
                    label="全名"
                    placeholder="请输入您的姓名"
                    register={register}
                    error={errors.fullName}
                    validation={{ required: '请填写姓名', minLength: { value: 2, message: '姓名至少需要 2 个字符' } }}
                />

                <InputField
                    name="email"
                    label="电子邮箱"
                    placeholder="example@mail.com"
                    register={register}
                    error={errors.email}
                    validation={{
                        required: '请填写电子邮箱',
                        pattern: {
                            value: /^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/,
                            message: '请输入有效的电子邮箱地址'
                        }
                    }}
                />

                <InputField
                    name="password"
                    label="密码"
                    placeholder="请输入强密码"
                    type="password"
                    register={register}
                    error={errors.password}
                    validation={{ required: '请填写密码', minLength: { value: 8, message: '密码至少需要 8 个字符' } }}
                />

                <CountrySelectField
                    name="country"
                    label="国家/地区"
                    control={control}
                    error={errors.country}
                    required
                />

                <SelectField
                    name="investmentGoals"
                    label="投资目标"
                    placeholder="请选择您的投资目标"
                    options={INVESTMENT_GOALS}
                    control={control}
                    error={errors.investmentGoals}
                    required
                />

                <SelectField
                    name="riskTolerance"
                    label="风险承受能力"
                    placeholder="请选择您的风险等级"
                    options={RISK_TOLERANCE_OPTIONS}
                    control={control}
                    error={errors.riskTolerance}
                    required
                />

                <SelectField
                    name="preferredIndustry"
                    label="偏好行业"
                    placeholder="请选择您偏好的行业"
                    options={PREFERRED_INDUSTRIES}
                    control={control}
                    error={errors.preferredIndustry}
                    required
                />

                <Button type="submit" disabled={isSubmitting} className="yellow-btn w-full mt-5">
                    {isSubmitting ? '正在创建账号...' : '开启您的投资之旅'}
                </Button>

                <FooterLink text="已经有账号了？" linkText="立即登录" href="/sign-in" />

                <OpenDevSocietyBranding outerClassName="mt-10 flex justify-center" />
            </form>
        </>
    )
}
export default SignUp;
