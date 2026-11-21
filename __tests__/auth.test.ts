import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/database/mongoose', () => ({
    connectToDatabase: vi.fn().mockResolvedValue({
        connection: { db: {} },
    }),
    isWorkersRuntime: () => false,
}));

vi.mock('@/lib/nodemailer/reset-password', () => ({
    sendPasswordResetEmail: vi.fn(),
}));

vi.mock('@/i18n/locale', () => ({
    resolveLocale: vi.fn().mockResolvedValue('en'),
}));

vi.mock('next/server', async (importOriginal) => ({
    ...(await importOriginal<typeof import('next/server')>()),
    after: vi.fn(),
}));

vi.mock('next/headers', () => ({
    headers: vi.fn().mockResolvedValue(new Headers({ cookie: 'better-auth.session_token=t' })),
}));

describe('Better Auth secret resolution and production guard', () => {
    const originalEnv = { ...process.env };
    const setNodeEnv = (val: string) => {
        (process.env as Record<string, string | undefined>).NODE_ENV = val;
    };

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it('uses BETTER_AUTH_SECRET when only BETTER_AUTH_SECRET is configured', async () => {
        setNodeEnv('production');
        process.env.BETTER_AUTH_SECRET = 'better-auth-secret-32-chars-long-12345';
        delete process.env.AUTH_SECRET;

        const { getAuth } = await import('@/lib/better-auth/auth');
        const auth = await getAuth();

        expect(auth.options.secret).toBe('better-auth-secret-32-chars-long-12345');
    });

    it('falls back to AUTH_SECRET when only AUTH_SECRET is configured', async () => {
        setNodeEnv('production');
        delete process.env.BETTER_AUTH_SECRET;
        process.env.AUTH_SECRET = 'auth-secret-fallback-32-chars-long-12345';

        const { getAuth } = await import('@/lib/better-auth/auth');
        const auth = await getAuth();

        expect(auth.options.secret).toBe('auth-secret-fallback-32-chars-long-12345');
    });

    it('prefers BETTER_AUTH_SECRET over AUTH_SECRET when both are configured', async () => {
        setNodeEnv('production');
        process.env.BETTER_AUTH_SECRET = 'preferred-better-auth-secret-32-chars';
        process.env.AUTH_SECRET = 'secondary-auth-secret-32-chars-long';

        const { getAuth } = await import('@/lib/better-auth/auth');
        const auth = await getAuth();

        expect(auth.options.secret).toBe('preferred-better-auth-secret-32-chars');
    });

    it('rejects in production when neither secret is configured', async () => {
        setNodeEnv('production');
        delete process.env.BETTER_AUTH_SECRET;
        delete process.env.AUTH_SECRET;

        const { getAuth } = await import('@/lib/better-auth/auth');
        await expect(getAuth()).rejects.toThrow('BETTER_AUTH_SECRET must be set in production');
    });

    it('preserves existing behaviour in development without either variable', async () => {
        setNodeEnv('development');
        delete process.env.BETTER_AUTH_SECRET;
        delete process.env.AUTH_SECRET;

        const { getAuth } = await import('@/lib/better-auth/auth');
        const auth = await getAuth();

        expect(auth).toBeDefined();
        expect(auth.options.secret).toBeUndefined();
    });
});

describe('sendResetPassword callback', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    const loadCallback = async () => {
        const { getAuth } = await import('@/lib/better-auth/auth');
        const { sendPasswordResetEmail } = await import('@/lib/nodemailer/reset-password');
        const auth = await getAuth();
        const callback = auth.options.emailAndPassword?.sendResetPassword;
        if (!callback) throw new Error('sendResetPassword is not configured');
        return { callback, send: vi.mocked(sendPasswordResetEmail) };
    };

    const user = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        emailVerified: false,
        createdAt: new Date(0),
        updatedAt: new Date(0),
    };
    const url = 'http://localhost:3000/api/auth/reset-password/token-1?callbackURL=';

    it('resolves only after the reset email has been sent', async () => {
        const { callback, send } = await loadCallback();
        let finishSend: () => void = () => {};
        send.mockReturnValue(new Promise<void>((resolve) => {
            finishSend = resolve;
        }));

        let settled = false;
        const done = callback({ user, url, token: 'token-1' }).then(() => {
            settled = true;
        });

        await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(settled).toBe(false);

        finishSend();
        await done;
        expect(settled).toBe(true);
        expect(send).toHaveBeenCalledWith({ email: user.email, name: user.name, resetUrl: url, locale: 'en' });
    });

    it('rejects when the email fails, so Better Auth logs the failure', async () => {
        const { callback, send } = await loadCallback();
        send.mockRejectedValue(new Error('SMTP refused'));

        await expect(callback({ user, url, token: 'token-1' })).rejects.toThrow('SMTP refused');
    });
});

describe('background tasks', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    const loadHandler = async () => {
        const { getAuth } = await import('@/lib/better-auth/auth');
        const { after } = await import('next/server');
        const auth = await getAuth();
        const handler = auth.options.advanced?.backgroundTasks?.handler;
        if (!handler) throw new Error('backgroundTasks.handler is not configured');
        return { handler, after: vi.mocked(after) };
    };

    it('hands the reset email to after() instead of making the response wait for it', async () => {
        const { handler, after } = await loadHandler();
        const send = new Promise<void>(() => {});

        handler(send);

        expect(after).toHaveBeenCalledWith(send);
    });

    it('makes Better Auth return without waiting for a task that is still running', async () => {
        const { getAuth } = await import('@/lib/better-auth/auth');
        const context = await (await getAuth()).$context;
        const neverSettles = new Promise<void>(() => {});

        await expect(context.runInBackgroundOrAwait(neverSettles)).resolves.toBeUndefined();
    });

    it('lets the task run when there is no request to extend', async () => {
        const { handler, after } = await loadHandler();
        after.mockImplementation(() => {
            throw new Error('`after` was called outside a request scope');
        });

        expect(() => handler(Promise.resolve())).not.toThrow();
    });
});

describe('session checks for reads and writes', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    const load = async (session: unknown) => {
        const authModule = await import('@/lib/better-auth/auth');
        const instance = await authModule.getAuth();
        const getSession = vi.spyOn(instance.api, 'getSession').mockResolvedValue(session as never);
        return { ...authModule, getSession };
    };
    const signedIn = { user: { id: 'user-1' }, session: { id: 's1' } };

    it('checks writes against the database, so a revoked session cannot write', async () => {
        const { requireUserId, getSession } = await load(signedIn);

        await expect(requireUserId()).resolves.toBe('user-1');
        expect(getSession).toHaveBeenCalledWith(expect.objectContaining({ query: { disableCookieCache: true } }));
    });

    it('rejects a write once the session is gone from the database', async () => {
        const { requireUserId } = await load(null);

        await expect(requireUserId()).rejects.toThrow('Unauthorized');
    });

    it('serves reads from the cookie cache, without a database round trip', async () => {
        const { requireUserIdForRead, getSession } = await load(signedIn);

        await expect(requireUserIdForRead()).resolves.toBe('user-1');
        expect(getSession.mock.calls[0][0]).not.toHaveProperty('query');
    });
});
