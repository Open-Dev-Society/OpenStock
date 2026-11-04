import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const connect = vi.fn();
const disconnect = vi.fn();
const nodeConnection = { connection: { db: { databaseName: 'openstock' } } };
let readyState = 0;
let ray: string | null = 'ray-1';

vi.mock('mongoose', () => ({
    default: {
        connect: (...args: unknown[]) => connect(...args),
        disconnect: () => disconnect(),
        connection: {
            get readyState() {
                return readyState;
            },
        },
    },
}));

vi.mock('next/headers', () => ({
    headers: async () => ({
        get: (name: string) => (name === 'cf-ray' ? ray : null),
    }),
}));

describe('connectToDatabase', () => {
    beforeEach(() => {
        vi.resetModules();
        readyState = 0;
        ray = 'ray-1';
        connect.mockReset();
        disconnect.mockReset();
        connect.mockImplementation(async () => {
            readyState = 1;
            return nodeConnection;
        });
        disconnect.mockImplementation(async () => {
            readyState = 0;
        });
        delete (global as { mongooseCache?: unknown }).mongooseCache;
        process.env.MONGODB_URI = 'mongodb://user:pass@a.example.net:27017,b.example.net:27017,c.example.net:27017/openstock';
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        delete process.env.MONGODB_URI;
    });

    it('reuses one connection per Workers request and opens a new one for the next', async () => {
        vi.stubGlobal('navigator', { userAgent: 'Cloudflare-Workers' });
        const { connectToDatabase } = await import('@/database/mongoose');

        await connectToDatabase();
        await connectToDatabase();
        expect(connect).toHaveBeenCalledTimes(1);
        expect(disconnect).not.toHaveBeenCalled();

        ray = 'ray-2';
        readyState = 1;
        await connectToDatabase();
        expect(disconnect).toHaveBeenCalledTimes(1);
        expect(connect).toHaveBeenCalledTimes(2);
        expect(connect).toHaveBeenLastCalledWith(process.env.MONGODB_URI, { bufferCommands: false, family: 4 });
    });

    it('retries a Workers connect after a failure on the same request', async () => {
        vi.stubGlobal('navigator', { userAgent: 'Cloudflare-Workers' });
        connect.mockRejectedValueOnce(new Error('down'));
        const { connectToDatabase } = await import('@/database/mongoose');

        await expect(connectToDatabase()).rejects.toThrow('down');
        await connectToDatabase();
        expect(connect).toHaveBeenCalledTimes(2);
        expect(disconnect).not.toHaveBeenCalled();
    });

    it('keeps the Node connection cached across calls', async () => {
        const { connectToDatabase } = await import('@/database/mongoose');

        const first = await connectToDatabase();
        const second = await connectToDatabase();
        expect(second).toBe(first);
        expect(connect).toHaveBeenCalledTimes(1);
        expect(disconnect).not.toHaveBeenCalled();
        expect(connect).toHaveBeenCalledWith(process.env.MONGODB_URI, { bufferCommands: false, family: 4 });
    });
});
