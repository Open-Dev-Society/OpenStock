import { betterAuth } from "better-auth";
import {mongodbAdapter} from "better-auth/adapters/mongodb";
import {connectToDatabase, isWorkersRuntime} from "@/database/mongoose";
import {nextCookies} from "better-auth/next-js";
import { headers } from "next/headers";
import { after } from "next/server";
import { cache } from "react";
import { sendPasswordResetEmail } from "@/lib/nodemailer/reset-password";
import { resolveLocale } from "@/i18n/locale";


type MongoDb = Parameters<typeof mongodbAdapter>[0];

const resolveAuthSecret = () => process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET;

// Next's after() keeps the task running once the response is sent (waitUntil on Vercel and Workers, the process on
// Node). Outside a request (scripts, jobs) it throws; the task has already started and still runs, as before.
const keepAfterResponse =(task: Promise<unknown>) => {
    try {
        after(task);
    } catch {
        // no request scope to extend
    }
};

// Typed from the real config, so additional user fields (country, ...) show up in session types
const createAuth = (database: MongoDb, secret: string | undefined = resolveAuthSecret()) => betterAuth({
        database: mongodbAdapter(database),
        secret,
        baseURL: process.env.BETTER_AUTH_URL,
        // Onboarding answers live on the user so the profile page can show and edit them
        user: {
            additionalFields: {
                country: { type: "string", required: false },
                investmentGoals: { type: "string", required: false },
                riskTolerance: { type: "string", required: false },
                preferredIndustry: { type: "string", required: false },
            },
        },
        emailAndPassword: {
            enabled: true,
            disableSignUp: false,
            requireEmailVerification: false,
            minPasswordLength: 8,
            maxPasswordLength: 128,
            autoSignIn: true,
            // A reset is how a victim takes an account back: sign out every other session (off by default)
            revokeSessionsOnPasswordReset: true,
            sendResetPassword: async ({ user, url }) => {
                // Read the cookie now, while the user's request is still in scope
                const locale = await resolveLocale().catch(() => undefined);
                // Awaited, not detached, so this promise tracks the send: Better Auth hands it to backgroundTasks
                // below, which keeps it alive past the response and logs a failure.
                await sendPasswordResetEmail({
                    email: user.email,
                    name: user.name,
                    resetUrl: url,
                    locale,
                });
            },
        },
        // Signed session cookie for 5 min: pages stop paying a MongoDB round trip per request.
        // Trade-off: a revoked session can still read pages for up to 5 minutes. Writes re-check the database
        // (requireUserId below), and Better Auth's own sensitive endpoints (password, email, delete) always do.
        session: {
            cookieCache: { enabled: true, maxAge: 5 * 60 },
        },
        // No account linking. Sign-up doesn't verify emails, so linking a Google/GitHub identity to an
        // existing account with the same email would let someone pre-register a victim's address and
        // later capture their social sign-in. This switch also blocks explicit linking (still true in 1.7);
        // when social sign-in ships, `disableImplicitLinking: true` keeps explicit linking and drops only the email match.
        account: {
            accountLinking: { enabled: false },
        },
        // Providers stay disabled until their env vars are set
        socialProviders: {
            google: {
                enabled: !!process.env.GOOGLE_CLIENT_ID,
                clientId: process.env.GOOGLE_CLIENT_ID as string,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            },
            github: {
                enabled: !!process.env.GITHUB_CLIENT_ID,
                clientId: process.env.GITHUB_CLIENT_ID as string,
                clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
            },
        },
        // Only Cloudflare overwrites cf-connecting-ip; anywhere else a client can send its own and dodge the
        // rate limiter. On Workers x-forwarded-for keeps whatever the client sent first, so it is not trusted there.
        advanced: {
            ipAddress: {
                ipAddressHeaders: isWorkersRuntime() ? ["cf-connecting-ip"] : ["x-forwarded-for"],
            },
            // Without a handler Better Auth awaits the reset email, so a request for a known address would answer
            // only after SMTP while an unknown one answers at once: the delay would tell who has an account.
            backgroundTasks: { handler: keepAfterResponse },
        },
        plugins: [nextCookies()],
});

let authInstance: ReturnType<typeof createAuth> | null = null;

export const getAuth = async () => {
    // Better Auth keeps the Db it was given. On Workers that Db is this request's
    // createConnection; caching the instance would point a later request at dead sockets.
    if (!isWorkersRuntime() && authInstance) return authInstance;

    const secret = resolveAuthSecret();

    // Without a secret better-auth falls back to a public default anyone could forge sessions with (1.7 refuses it in
    // production too); fail here first, before connecting. Checked on first use, not at import, so `next build` needs no secrets.
    if (process.env.NODE_ENV === 'production' && !secret) {
        throw new Error('BETTER_AUTH_SECRET must be set in production');
    }

    const mongoose = await connectToDatabase();
    const database = mongoose.connection.db;
    if (!database) {
        throw new Error("MongoDB connection not found!");
    }

    const instance = createAuth(database, secret);
    if (!isWorkersRuntime()) authInstance = instance;
    return instance;
}

type Auth = ReturnType<typeof createAuth>;

// Connects on first use, not at import: `next build` imports this module while collecting page data, and a
// top-level `await getAuth()` made every build (Docker, Railway, CI) need a reachable MongoDB.
export const auth = {
    api: new Proxy({} as Auth['api'], {
        get: (_, method) => async (...args: unknown[]) => {
            const { api } = await getAuth();
            return (api[method as keyof Auth['api']] as (...a: unknown[]) => unknown)(...args);
        },
    }),
    handler: async (request: Request) => (await getAuth()).handler(request),
};

// One session lookup per request, shared by layouts, pages and actions. Served from the 5-minute cookie cache,
// so a session revoked elsewhere (a password change signs out every other device) can still read pages for up
// to 5 minutes. Writes don't trust it: see requireUserId.
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

// Re-reads the session from MongoDB, skipping the cookie cache. A revoked session gets null here, and Better Auth
// clears its cookies, so the device is signed out on its next write. Costs one session lookup per action.
const getAuthoritativeSession = cache(async () =>
    auth.api.getSession({ headers: await headers(), query: { disableCookieCache: true } })
);

// Server actions are public endpoints: never trust a userId sent from the client.
// For anything that changes data. Checked against the database, so a revoked session can't write.
export const requireUserId = async () => {
    const session = await getAuthoritativeSession();
    if (!session?.user) throw new Error("Unauthorized");
    return session.user.id;
}

// For reads only (the layout reads the watchlist on every page): served from the cookie cache, no database
// round trip. A revoked session can keep reading its own data until the cache expires (5 minutes at most).
export const requireUserIdForRead = async () => {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");
    return session.user.id;
}
