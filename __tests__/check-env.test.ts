import { describe, expect, it } from 'vitest';
import { execFileSync } from 'child_process';
import path from 'path';

interface RunResult {
    status: number;
    stdout: string;
    stderr: string;
}

const scriptPath = path.resolve(__dirname, '../scripts/check-env.mjs');

function runCheckEnv(envOverrides: Record<string, string | undefined>): RunResult {
    const baseEnv: NodeJS.ProcessEnv = {
        NODE_ENV: 'test',
        PATH: process.env.PATH || '',
        SystemRoot: process.env.SystemRoot || '',
        COMSPEC: process.env.COMSPEC || '',
        TEMP: process.env.TEMP || '',
        TMP: process.env.TMP || '',
        // Prevent dotenv/config from loading the workspace .env file if one exists
        DOTENV_CONFIG_PATH: process.platform === 'win32' ? 'NUL' : '/dev/null',
    };

    for (const [key, value] of Object.entries(envOverrides)) {
        if (value !== undefined) {
            baseEnv[key] = value;
        }
    }

    try {
        const stdout = execFileSync(process.execPath, [scriptPath], {
            env: baseEnv,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        return { status: 0, stdout, stderr: '' };
    } catch (error: unknown) {
        const execError = error as { status?: number; stdout?: string; stderr?: string };
        return {
            status: execError.status ?? 1,
            stdout: execError.stdout ?? '',
            stderr: execError.stderr ?? '',
        };
    }
}

const validRequiredEnv = {
    MONGODB_URI: 'mongodb://localhost:27017/openstock_test',
    BETTER_AUTH_SECRET: '0123456789abcdef0123456789abcdef',
    BETTER_AUTH_URL: 'http://localhost:3000',
    FINNHUB_API_KEY: 'test_finnhub_key_12345',
};

describe('check-env script (issue #160)', () => {
    it('reports 4/4 and exits 0 when all four required checks pass', () => {
        const result = runCheckEnv(validRequiredEnv);

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('Summary: 4/4 required variables present');
        expect(result.stdout).toContain('✅ All required environment variables are set!');
        expect(result.stdout).not.toContain('❌ Missing Required Variables:');
        expect(result.stdout).not.toContain('critical variable(s) are missing');
    });

    it('reports 3/4 and exits 1 when the Finnhub key is missing', () => {
        const result = runCheckEnv({
            MONGODB_URI: validRequiredEnv.MONGODB_URI,
            BETTER_AUTH_SECRET: validRequiredEnv.BETTER_AUTH_SECRET,
            BETTER_AUTH_URL: validRequiredEnv.BETTER_AUTH_URL,
        });

        expect(result.status).toBe(1);
        expect(result.stdout).toContain('Summary: 3/4 required variables present');
        expect(result.stdout).toContain('⚠️  1 critical variable(s) are missing.');
        expect(result.stdout).toContain('❌ Missing Required Variables:');
        expect(result.stdout).toContain('FINNHUB_API_KEYS or FINNHUB_API_KEY or NEXT_PUBLIC_FINNHUB_API_KEY');
        expect(result.stdout).not.toContain('✅ All required environment variables are set!');
    });

    it('reports 0/4 and exits 1 when all required variables are missing', () => {
        const result = runCheckEnv({});

        expect(result.status).toBe(1);
        expect(result.stdout).toContain('Summary: 0/4 required variables present');
        expect(result.stdout).toContain('⚠️  4 critical variable(s) are missing.');
        expect(result.stdout).toContain('❌ Missing Required Variables:');
        expect(result.stdout).toContain('MONGODB_URI');
        expect(result.stdout).toContain('BETTER_AUTH_SECRET');
        expect(result.stdout).toContain('BETTER_AUTH_URL');
        expect(result.stdout).toContain('FINNHUB_API_KEYS or FINNHUB_API_KEY or NEXT_PUBLIC_FINNHUB_API_KEY');
    });

    describe('accepts Finnhub key under each supported name', () => {
        it('accepts FINNHUB_API_KEYS', () => {
            const result = runCheckEnv({
                MONGODB_URI: validRequiredEnv.MONGODB_URI,
                BETTER_AUTH_SECRET: validRequiredEnv.BETTER_AUTH_SECRET,
                BETTER_AUTH_URL: validRequiredEnv.BETTER_AUTH_URL,
                FINNHUB_API_KEYS: 'key_one,key_two',
            });

            expect(result.status).toBe(0);
            expect(result.stdout).toContain('Summary: 4/4 required variables present');
            expect(result.stdout).toContain('✓ FINNHUB_API_KEYS');
            expect(result.stdout).toContain('✅ All required environment variables are set!');
        });

        it('accepts FINNHUB_API_KEY', () => {
            const result = runCheckEnv({
                MONGODB_URI: validRequiredEnv.MONGODB_URI,
                BETTER_AUTH_SECRET: validRequiredEnv.BETTER_AUTH_SECRET,
                BETTER_AUTH_URL: validRequiredEnv.BETTER_AUTH_URL,
                FINNHUB_API_KEY: 'single_key',
            });

            expect(result.status).toBe(0);
            expect(result.stdout).toContain('Summary: 4/4 required variables present');
            expect(result.stdout).toContain('✓ FINNHUB_API_KEY');
            expect(result.stdout).toContain('✅ All required environment variables are set!');
        });

        it('accepts NEXT_PUBLIC_FINNHUB_API_KEY', () => {
            const result = runCheckEnv({
                MONGODB_URI: validRequiredEnv.MONGODB_URI,
                BETTER_AUTH_SECRET: validRequiredEnv.BETTER_AUTH_SECRET,
                BETTER_AUTH_URL: validRequiredEnv.BETTER_AUTH_URL,
                NEXT_PUBLIC_FINNHUB_API_KEY: 'public_key',
            });

            expect(result.status).toBe(0);
            expect(result.stdout).toContain('Summary: 4/4 required variables present');
            expect(result.stdout).toContain('✓ NEXT_PUBLIC_FINNHUB_API_KEY');
            expect(result.stdout).toContain('✅ All required environment variables are set!');
        });

        it('does not allow numerator to exceed denominator when multiple Finnhub keys are set', () => {
            const result = runCheckEnv({
                ...validRequiredEnv,
                FINNHUB_API_KEYS: 'multi_key',
                FINNHUB_API_KEY: 'single_key',
                NEXT_PUBLIC_FINNHUB_API_KEY: 'public_key',
            });

            expect(result.status).toBe(0);
            expect(result.stdout).toContain('Summary: 4/4 required variables present');
            expect(result.stdout).not.toMatch(/Summary: [5-9]\/4/);
        });
    });

    describe('optional variables isolation', () => {
        it('does not alter required count when optional variables are enabled', () => {
            const result = runCheckEnv({
                ...validRequiredEnv,
                GEMINI_API_KEY: 'gemini_test_key',
                NODEMAILER_EMAIL: 'user@example.com',
            });

            expect(result.status).toBe(0);
            expect(result.stdout).toContain('Summary: 4/4 required variables present');
            expect(result.stdout).toContain('Optional variables: 2/22 enabled');
            expect(result.stdout).toContain('✓ GEMINI_API_KEY');
            expect(result.stdout).toContain('✓ NODEMAILER_EMAIL');
        });

        it('does not satisfy missing required variables with optional variables', () => {
            const result = runCheckEnv({
                GEMINI_API_KEY: 'gemini_test_key',
                NODEMAILER_EMAIL: 'user@example.com',
            });

            expect(result.status).toBe(1);
            expect(result.stdout).toContain('Summary: 0/4 required variables present');
            expect(result.stdout).toContain('Optional variables: 2/22 enabled');
            expect(result.stdout).toContain('⚠️  4 critical variable(s) are missing.');
        });
    });

    describe('handles empty and whitespace-only values', () => {
        it('treats empty string values as missing', () => {
            const result = runCheckEnv({
                MONGODB_URI: '',
                BETTER_AUTH_SECRET: validRequiredEnv.BETTER_AUTH_SECRET,
                BETTER_AUTH_URL: validRequiredEnv.BETTER_AUTH_URL,
                FINNHUB_API_KEY: '',
            });

            expect(result.status).toBe(1);
            expect(result.stdout).toContain('Summary: 2/4 required variables present');
            expect(result.stdout).toContain('⚠️  2 critical variable(s) are missing.');
            expect(result.stdout).toContain('✗ MONGODB_URI');
            expect(result.stdout).toContain('✗ FINNHUB_API_KEYS or FINNHUB_API_KEY or NEXT_PUBLIC_FINNHUB_API_KEY');
        });

        it('treats whitespace-only values as missing', () => {
            const result = runCheckEnv({
                MONGODB_URI: '   ',
                BETTER_AUTH_SECRET: validRequiredEnv.BETTER_AUTH_SECRET,
                BETTER_AUTH_URL: '  \t  ',
                FINNHUB_API_KEY: validRequiredEnv.FINNHUB_API_KEY,
            });

            expect(result.status).toBe(1);
            expect(result.stdout).toContain('Summary: 2/4 required variables present');
            expect(result.stdout).toContain('⚠️  2 critical variable(s) are missing.');
            expect(result.stdout).toContain('✗ MONGODB_URI');
            expect(result.stdout).toContain('✗ BETTER_AUTH_URL');
        });
    });

    describe('masks sensitive values in output', () => {
        it('masks long and short secrets in present variables', () => {
            const result = runCheckEnv(validRequiredEnv);

            expect(result.stdout).toContain('Value: 0123***cdef');
            expect(result.stdout).not.toContain(validRequiredEnv.BETTER_AUTH_SECRET);
        });
    });

    describe('maintains consistency between missing-variable count and summary', () => {
        it('accurately counts exactly 1 missing when only MONGODB_URI is absent', () => {
            const result = runCheckEnv({
                BETTER_AUTH_SECRET: validRequiredEnv.BETTER_AUTH_SECRET,
                BETTER_AUTH_URL: validRequiredEnv.BETTER_AUTH_URL,
                FINNHUB_API_KEY: validRequiredEnv.FINNHUB_API_KEY,
            });

            expect(result.status).toBe(1);
            expect(result.stdout).toContain('Summary: 3/4 required variables present');
            expect(result.stdout).toContain('⚠️  1 critical variable(s) are missing.');
            expect(result.stdout).toContain('✗ MONGODB_URI');
        });

        it('accurately counts exactly 2 missing when two required variables are absent', () => {
            const result = runCheckEnv({
                BETTER_AUTH_SECRET: validRequiredEnv.BETTER_AUTH_SECRET,
                BETTER_AUTH_URL: validRequiredEnv.BETTER_AUTH_URL,
            });

            expect(result.status).toBe(1);
            expect(result.stdout).toContain('Summary: 2/4 required variables present');
            expect(result.stdout).toContain('⚠️  2 critical variable(s) are missing.');
        });
    });
});
