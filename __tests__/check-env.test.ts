import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const scriptPath = fileURLToPath(new URL('../scripts/check-env.mjs', import.meta.url));
const requiredEnvNames = [
    'MONGODB_URI',
    'BETTER_AUTH_SECRET',
    'BETTER_AUTH_URL',
    'FINNHUB_API_KEYS',
    'FINNHUB_API_KEY',
    'NEXT_PUBLIC_FINNHUB_API_KEY',
];
const requiredEnvNamesLowercase = new Set(requiredEnvNames.map((name) => name.toLowerCase()));
const regularRequiredEnv = {
    MONGODB_URI: 'mongodb://example.test/openstock',
    BETTER_AUTH_SECRET: 'test-secret',
    BETTER_AUTH_URL: 'http://localhost:3000',
};
const finnhubKeyNames = [
    'FINNHUB_API_KEYS',
    'FINNHUB_API_KEY',
    'NEXT_PUBLIC_FINNHUB_API_KEY',
] as const;

function clearRequiredEnvVars(env: Record<string, string | undefined>) {
    for (const name of Object.keys(env)) {
        if (requiredEnvNamesLowercase.has(name.toLowerCase())) delete env[name];
    }
}

describe('scripts/check-env.mjs', () => {
    let workingDirectory: string;

    beforeEach(() => {
        workingDirectory = mkdtempSync(path.join(tmpdir(), 'openstock-check-env-'));
    });

    afterEach(() => {
        rmSync(workingDirectory, { recursive: true, force: true });
    });

    function runChecker(overrides: Record<string, string> = {}) {
        const env = { ...process.env };
        clearRequiredEnvVars(env);
        Object.assign(env, overrides);
        // Keep dotenv from reading a .env file from the repository or the caller's cwd.
        env.DOTENV_CONFIG_PATH = path.join(workingDirectory, 'no-project-env');

        const result = spawnSync(process.execPath, [scriptPath], {
            cwd: workingDirectory,
            env,
            encoding: 'utf8',
        });

        expect(result.error).toBeUndefined();
        return result;
    }

    it('clears required environment variables regardless of case and keeps unrelated variables', () => {
        // Not ProcessEnv: that type requires NODE_ENV, and this test checks the exact keys left over
        const env: Record<string, string | undefined> = {
            mOnGoDb_UrI: 'inherited-mongodb-uri',
            better_auth_secret: 'inherited-auth-secret',
            Better_Auth_Url: 'inherited-auth-url',
            finnhub_api_keys: 'inherited-finnhub-keys',
            Finnhub_Api_Key: 'inherited-finnhub-key',
            next_public_finnhub_api_key: 'inherited-public-finnhub-key',
            UNRELATED_SETTING: 'keep-me',
        };

        clearRequiredEnvVars(env);

        expect(env).toEqual({ UNRELATED_SETTING: 'keep-me' });
    });

    it.each(finnhubKeyNames)('reports 4/4 when %s is set', (finnhubKeyName) => {
        const result = runChecker({
            ...regularRequiredEnv,
            [finnhubKeyName]: 'test-finnhub-key',
        });

        expect(result.stdout).toContain('Summary: 4/4 required variables present');
        expect(result.status).toBe(0);
    });

    it('reports 3/4 and lists Finnhub aliases when all Finnhub keys are missing', () => {
        const result = runChecker(regularRequiredEnv);

        expect(result.stdout).toContain('Summary: 3/4 required variables present');
        expect(result.stdout).toContain('FINNHUB_API_KEYS or FINNHUB_API_KEY or NEXT_PUBLIC_FINNHUB_API_KEY');
        expect(result.status).toBe(1);
    });

    it('reports 0/4 and lists all missing required checks', () => {
        const result = runChecker();

        expect(result.stdout).toContain('Summary: 0/4 required variables present');
        expect(result.stdout).toContain('MONGODB_URI');
        expect(result.stdout).toContain('BETTER_AUTH_SECRET');
        expect(result.stdout).toContain('BETTER_AUTH_URL');
        expect(result.stdout).toContain('FINNHUB_API_KEYS or FINNHUB_API_KEY or NEXT_PUBLIC_FINNHUB_API_KEY');
        expect(result.status).toBe(1);
    });
});
