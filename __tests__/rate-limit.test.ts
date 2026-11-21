import { beforeEach, describe, expect, it, vi } from 'vitest';

type Counter = { count: number; expiresAt: Date };

// The two counter queries isRateLimited makes, over a Map instead of MongoDB
const counters = new Map<string, Counter>();
const collection = {
    createIndex: async () => 'expiresAt_1',
    findOneAndUpdate: async (
        filter: { _id: string; expiresAt: { $gt: Date } },
        update: { $inc: { count: number } },
    ) => {
        const counter = counters.get(filter._id);
        if (!counter || counter.expiresAt <= filter.expiresAt.$gt) return null;
        counter.count += update.$inc.count;
        return { _id: filter._id, ...counter };
    },
    updateOne: async (filter: { _id: string }, update: { $set: Counter }) => {
        counters.set(filter._id, { ...update.$set });
    },
};

vi.mock('@/database/mongoose', () => ({
    connectToDatabase: async () => ({ connection: { db: { collection: () => collection } } }),
    isWorkersRuntime: () => false,
}));

let requestHeaders = new Headers();
vi.mock('next/headers', () => ({
    headers: async () => requestHeaders,
}));

import { NO_IP_BUDGET_FACTOR, clientIp, isClientRateLimited, signUpLimitPerIp } from '@/lib/rate-limit';

const attempts = async (n: number) => {
    const results: boolean[] = [];
    for (let i = 0; i < n; i++) results.push(await isClientRateLimited('sign-up', 5, 60 * 60));
    return results;
};

describe('rate-limit', () => {
    beforeEach(() => {
        counters.clear();
        requestHeaders = new Headers();
    });

    it('reports no client address when no header names one', async () => {
        expect(await clientIp()).toBeNull();
    });

    it('takes the client from the first x-forwarded-for entry', async () => {
        requestHeaders = new Headers({ 'x-forwarded-for': '203.0.113.10, 10.0.0.1' });
        expect(await clientIp()).toBe('203.0.113.10');
    });

    it('accepts only an IP address as the client', async () => {
        requestHeaders = new Headers({ 'x-forwarded-for': '::ffff:192.168.1.20' }); // what `next start` fills in
        expect(await clientIp()).toBe('::ffff:192.168.1.20');
        requestHeaders = new Headers({ 'x-forwarded-for': 'attacker-123, 10.0.0.1' });
        expect(await clientIp()).toBeNull();
        requestHeaders = new Headers({ 'x-forwarded-for': '203.0.113.10:51234' });
        expect(await clientIp()).toBeNull();
        requestHeaders = new Headers({ 'x-forwarded-for': 'junk', 'x-real-ip': '198.51.100.7' });
        expect(await clientIp()).toBe('198.51.100.7');
    });

    it('does not give junk addresses a fresh budget each', async () => {
        for (let i = 0; i < 5 * NO_IP_BUDGET_FACTOR; i++) {
            requestHeaders = new Headers({ 'x-forwarded-for': `junk-${i}` });
            await isClientRateLimited('sign-up', 5, 60 * 60);
        }
        requestHeaders = new Headers({ 'x-forwarded-for': 'junk-last' });
        expect(await isClientRateLimited('sign-up', 5, 60 * 60)).toBe(true);
    });

    it('keeps the sign-up cap tight on Vercel and roomier where clients can share an address', () => {
        vi.stubEnv('VERCEL', '1');
        expect(signUpLimitPerIp()).toBe(5);
        vi.stubEnv('VERCEL', '');
        expect(signUpLimitPerIp()).toBe(30);
        vi.unstubAllEnvs();
    });

    it('limits a known client after its own budget', async () => {
        requestHeaders = new Headers({ 'x-forwarded-for': '203.0.113.10' });
        expect(await attempts(6)).toEqual([false, false, false, false, false, true]);
    });

    it('counts each known client separately', async () => {
        requestHeaders = new Headers({ 'x-forwarded-for': '203.0.113.10' });
        await attempts(5);
        requestHeaders = new Headers({ 'x-forwarded-for': '203.0.113.11' });
        expect(await isClientRateLimited('sign-up', 5, 60 * 60)).toBe(false);
    });

    it('does not refuse the sixth visitor when no request names its client', async () => {
        expect((await attempts(6)).every((limited) => !limited)).toBe(true);
    });

    it('still caps requests without a client address with a larger instance-wide budget', async () => {
        const budget = 5 * NO_IP_BUDGET_FACTOR;
        const results = await attempts(budget + 1);
        expect(results.slice(0, budget).every((limited) => !limited)).toBe(true);
        expect(results[budget]).toBe(true);
    });
});
