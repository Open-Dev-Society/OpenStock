import { betterAuth } from "better-auth";
import {mongodbAdapter} from "better-auth/adapters/mongodb";
import {connectToDatabase} from "@/database/mongoose";
import {nextCookies} from "better-auth/next-js";
import { sendPasswordResetEmail } from "@/lib/nodemailer/reset-password";


let authInstance: ReturnType<typeof betterAuth> | null = null;
let authInitFailed = false;

const createMockAuth = () => {
    // Return a minimal mock so the module can load without MongoDB
    // All auth operations will fail gracefully at runtime
    return null as any;
};

export const getAuth = async () => {
    if(authInstance) {
        return authInstance;
    }

    if (authInitFailed) {
        return createMockAuth();
    }

    try {
        const mongoose = await connectToDatabase();
        if (!mongoose) {
            throw new Error("MongoDB connection returned null");
        }
        const db = mongoose.connection;
        const database = db.db;

        if (!db || !database) {
            throw new Error("MongoDB database not available");
        }

        authInstance = betterAuth({
            database: mongodbAdapter(database),
            secret: process.env.BETTER_AUTH_SECRET || "dev-secret-change-in-production",
            baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
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

        return authInstance;
    } catch (err) {
        console.warn("[Auth] MongoDB not available, using mock auth:", err);
        authInitFailed = true;
        return createMockAuth();
    }
}

export const auth = await getAuth();
