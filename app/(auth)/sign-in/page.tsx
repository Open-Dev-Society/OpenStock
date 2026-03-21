'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import InputField from '@/components/forms/InputField';
import FooterLink from '@/components/forms/FooterLink';
import OpenDevSocietyBranding from "@/components/OpenDevSocietyBranding";
import React from "react";

const SignIn = () => {
    const {
        register,
        handleSubmit,
        formState: {errors, isSubmitting},
    } = useForm<SignInFormData>({
        defaultValues: {
            email: '',
            password: '',
        },
        mode: 'onBlur'
    });
    const onSubmit = async(data: SignInFormData) => {
        try{
            console.log(data)
        } catch(e){
            console.log(e);
        }
    }
    return (
        <>
            <h1 className="form-title">Sign In</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">


                <InputField
                    name="email"
                    label="Email"
                    placeholder="Your email"
                    register={register}
                    error={errors.email}
                    validation={{required: 'Email is required', pattern: /^\w+@\w+$/, message: 'Email is required' }}
                />

                <InputField
                    name="password"
                    label="Password"
                    placeholder="Enter password"
                    type="password"
                    register={register}
                    error={errors.password}
                    validation={{required: 'Password is required', minLength: 8}}
                />


                <Button type="submit" disabled={isSubmitting} className="yellow-btn w-full mt-5">
                    {isSubmitting ? 'Signing In...' : 'Sign In'}
                </Button>

                <FooterLink
                    text="Don't have an account?"
                    linkText="Sign up"
                    href="/sign-up"
                />
            </form>

            <OpenDevSocietyBranding outerClassName="mt-10 flex justify-center"/>
        </>
    )
}
export default SignIn
