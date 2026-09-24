import { betterAuth } from "better-auth";
import {mongodbAdapter} from "better-auth/adapters/mongodb";
import {connectToDatabase} from "@/database/mongoose";
import {nextCookies} from "better-auth/next-js";
import { sendPasswordResetEmail } from "@/lib/nodemailer/reset-password";


let authInstance: ReturnType<typeof betterAuth> | null = null;


export const getAuth = async () => {
    if(authInstance) {
        return authInstance;
    }

    try {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection;
        const database = db.db;

        if (!db || !database) {
            throw new Error("MongoDB connection not found!");
        }

        authInstance = betterAuth({
            database: mongodbAdapter(database),
            secret: process.env.BETTER_AUTH_SECRET,
            baseURL: process.env.BETTER_AUTH_URL,
            emailAndPassword: {
                enabled: true,
                disableSignUp: false,
                requireEmailVerification: false,
                minPasswordLength: 8,
                maxPasswordLength: 128,
                autoSignIn: true,
                sendResetPassword: async ({ user, url }) => {
                    void sendPasswordResetEmail({
                        email: user.email,
                        name: user.name,
                        resetUrl: url,
                    }).catch((error) => {
                        console.error('Failed to queue password reset email:', error);
                    });
                },
            },
            plugins: [nextCookies()],
        });
    } catch (err) {
        console.warn("⚠️ [Auth] Build-time DB connection deferred:", (err as any)?.message);
        authInstance = betterAuth({
            secret: process.env.BETTER_AUTH_SECRET || "build_dummy_secret_32_characters_min",
            baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
            plugins: [nextCookies()],
        });
    }

    return authInstance;
}

export const auth = await getAuth();
