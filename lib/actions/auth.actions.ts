'use server';

import { auth } from "@/lib/better-auth/auth";
import { inngest } from "@/lib/inngest/client";
import { headers } from "next/headers";
import { INVESTMENT_GOALS, PREFERRED_INDUSTRIES, RISK_TOLERANCE_OPTIONS } from "@/lib/constants";
import countryList from "react-select-country-list";
import { clientIp, isRateLimited, TOO_MANY_ATTEMPTS } from "@/lib/rate-limit";

const isOption = (options: readonly { value: string }[], value: unknown) => options.some((o) => o.value === value);
const COUNTRY_CODES = new Set(countryList().getValues()); // the same list the sign-up country picker shows

export const signUpWithEmail = async ({ email, password, fullName, country, investmentGoals, riskTolerance, preferredIndustry }: SignUpFormData) => {
    // These fields go into the AI prompt for the welcome email, so only accept the form's own values
    if (typeof fullName !== 'string' || !fullName.trim() || fullName.length > 80
        || typeof country !== 'string' || !COUNTRY_CODES.has(country)
        || !isOption(INVESTMENT_GOALS, investmentGoals)
        || !isOption(RISK_TOLERANCE_OPTIONS, riskTolerance)
        || !isOption(PREFERRED_INDUSTRIES, preferredIndustry)) {
        return { success: false, error: 'Sign up failed' };
    }
    // Each sign-up sends a welcome email from our Gmail and an AI call
    if (await isRateLimited(`sign-up:ip:${await clientIp()}`, 5, 60 * 60)) {
        return { success: false, error: TOO_MANY_ATTEMPTS };
    }
    try {
        const response = await auth.api.signUpEmail({ body: { email, password, name: fullName, country, investmentGoals, riskTolerance, preferredIndustry } })

        if (response) {
            try {
                console.log('📤 Sending Inngest event: app/user.created for', email);
                await inngest.send({
                    name: 'app/user.created',
                    data: { email, name: fullName, country, investmentGoals, riskTolerance, preferredIndustry }
                });
                console.log('✅ Inngest event sent successfully');
            } catch (error) {
                console.error('❌ Failed to send Inngest event:', error);
                // Don't fail signup if email fails
            }
        }

        return { success: true, data: response }
    } catch (e) {
        console.log('Sign up failed', e)
        return { success: false, error: 'Sign up failed' }
    }
}

export const signInWithEmail = async ({ email, password }: SignInFormData) => {
    // Per IP against credential stuffing, per account against guessing one password from many IPs
    if (await isRateLimited(`sign-in:ip:${await clientIp()}`, 20, 10 * 60)
        || await isRateLimited(`sign-in:email:${String(email).trim().toLowerCase()}`, 10, 10 * 60)) {
        return { success: false, error: TOO_MANY_ATTEMPTS };
    }
    try {
        const response = await auth.api.signInEmail({ body: { email, password } })

        // Update lastActiveAt
        if (response) {
            try {
                // Dynamic import or ensure path is correct
                const { connectToDatabase } = await import("@/database/mongoose");
                const mongoose = await connectToDatabase();
                const db = mongoose.connection.db;
                if (db) {
                    await db.collection('user').updateOne(
                        { email },
                        { $set: { lastActiveAt: new Date() } }
                    );
                }
            } catch (err) {
                console.error("Failed to update lastActiveAt", err);
            }
        }

        return { success: true, data: response }
    } catch (e) {
        console.log('Sign in failed', e)
        return { success: false, error: 'Sign in failed' }
    }
}

export const signInWithSocial = async (provider: 'google' | 'github') => {
    try {
        const { url } = await auth.api.signInSocial({
            body: { provider, callbackURL: '/dashboard', errorCallbackURL: '/sign-in' },
        });
        return { success: true, url }
    } catch (e) {
        console.log('Social sign in failed', e)
        return { success: false, error: `${provider === 'google' ? 'Google' : 'GitHub'} sign in is not available right now.` }
    }
}

export const requestPasswordResetEmail =async ({ email }: { email: string }) => {
    if (!process.env.NODEMAILER_EMAIL || !process.env.NODEMAILER_PASSWORD) {
        return { success: false, error: 'Password reset email is not configured.' }
    }
    // Every request sends a real email from our Gmail; unlimited requests could exhaust its daily quota
    if (await isRateLimited(`reset:email:${String(email).trim().toLowerCase()}`, 3, 60 * 60)
        || await isRateLimited(`reset:ip:${await clientIp()}`, 10, 60 * 60)) {
        return { success: false, error: TOO_MANY_ATTEMPTS };
    }

    try {
        const configuredBaseUrl = process.env.BETTER_AUTH_URL;
        const baseUrl = configuredBaseUrl || (
            process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : null
        );

        if (!baseUrl) {
            return {
                success: false,
                error: 'BETTER_AUTH_URL must be configured before password reset emails can be sent.',
            }
        }

        await auth.api.requestPasswordReset({
            body: {
                email,
                redirectTo: `${baseUrl}/reset-password`,
            },
        });

        return { success: true }
    } catch (e) {
        console.log('Password reset request failed', e)
        return { success: false, error: 'Unable to send password reset email.' }
    }
}

export const resetPasswordWithToken = async (
    { token, newPassword }: { token: string; newPassword: string }
) => {
    try {
        await auth.api.resetPassword({
            body: {
                token,
                newPassword,
            },
        });

        return { success: true }
    } catch (e) {
        console.log('Password reset failed', e)
        return { success: false, error: 'Reset link is invalid or expired.' }
    }
}

export const signOut = async () => {
    try {
        await auth.api.signOut({ headers: await headers() });
    } catch (e) {
        console.log('Sign out failed', e)
        return { success: false, error: 'Sign out failed' }
    }
}

