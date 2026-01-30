'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import InputField from '@/components/forms/InputField';
import FooterLink from '@/components/forms/FooterLink';
import { signInWithEmail } from "@/lib/actions/auth.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import OpenDevSocietyBranding from "@/components/OpenDevSocietyBranding";
import React from "react";

/**
 * 登录页面组件
 */
const SignIn = () => {
    const router = useRouter()
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
                router.push('/');
                return;
            }
            // 登录失败提示
            toast.error('登录失败', {
                description: result.error ?? '邮箱或密码不正确。',
            });
        } catch (e) {
            console.error(e);
            toast.error('登录失败', {
                description: e instanceof Error ? e.message : '无法登录，请重试。'
            })
        }
    }

    return (
        <>
            <h1 className="form-title">欢迎回来</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                    placeholder="请输入您的密码"
                    type="password"
                    register={register}
                    error={errors.password}
                    validation={{ required: '请填写密码', minLength: { value: 8, message: '密码至少需要 8 个字符' } }}
                />

                <Button type="submit" disabled={isSubmitting} className="yellow-btn w-full mt-5">
                    {isSubmitting ? '正在登录...' : '登录'}
                </Button>

                <FooterLink text="还没有账号？" linkText="立即注册" href="/sign-up" />
                <OpenDevSocietyBranding outerClassName="mt-10 flex justify-center" />
            </form>
        </>
    );
};
export default SignIn;
