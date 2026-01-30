'use server';

import { connectToDatabase } from "@/database/mongoose";

/**
 * 获取所有需要发送新闻邮件的用户
 * 该函数用于定时任务，获取所有已注册且有完整信息的活跃用户
 */
export const getAllUsersForNewsEmail = async () => {
    try {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;
        if (!db) throw new Error('Mongoose 未连接到数据库');

        // Better Auth 将用户信息存储在 "user" 集合中
        const users = await db.collection('user').find(
            { email: { $exists: true, $ne: null } },
            { projection: { _id: 1, id: 1, email: 1, name: 1, country: 1 } }
        ).toArray();

        return users.filter((user) => user.email && user.name).map((user) => ({
            id: user.id || user._id?.toString() || '',
            email: user.email,
            name: user.name
        }))
    } catch (e) {
        console.error('获取邮件发送用户列表失败:', e)
        return []
    }
}