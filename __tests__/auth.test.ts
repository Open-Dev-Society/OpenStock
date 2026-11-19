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
