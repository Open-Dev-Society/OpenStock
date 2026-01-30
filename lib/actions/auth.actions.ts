'use server';

import { auth } from "@/lib/better-auth/auth";
import { inngest } from "@/lib/inngest/client";
import { headers } from "next/headers";

/**
 * 使用邮箱注册用户
 */
export const signUpWithEmail = async ({ email, password, fullName, country, investmentGoals, riskTolerance, preferredIndustry }: SignUpFormData) => {
    try {
        const response = await auth.api.signUpEmail({ body: { email, password, name: fullName } })

        if (response) {
            try {
                console.log('📤 正在发送 Inngest 事件: app/user.created，用户:', email);
                await inngest.send({
                    name: 'app/user.created',
                    data: { email, name: fullName, country, investmentGoals, riskTolerance, preferredIndustry }
                });
                console.log('✅ Inngest 事件发送成功');
            } catch (error) {
                console.error('❌ 发送 Inngest 事件失败:', error);
                // 即使邮件发送失败，也不应导致注册失败
            }
        }

        return { success: true, data: response }
    } catch (e) {
        console.log('注册失败', e)
        return { success: false, error: '注册失败' }
    }
}

/**
 * 使用邮箱登录
 */
export const signInWithEmail = async ({ email, password }: SignInFormData) => {
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
        console.log('登录失败', e)
        return { success: false, error: '登录失败' }
    }
}

/**
 * 退出登录
 */
export const signOut = async () => {
    try {
        await auth.api.signOut({ headers: await headers() });
    } catch (e) {
        console.log('退出登录失败', e)
        return { success: false, error: '退出登录失败' }
    }
}

