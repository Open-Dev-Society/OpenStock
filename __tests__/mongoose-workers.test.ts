import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Connection, Model, Schema } from 'mongoose';

const connect = vi.fn();
const createConnection = vi.fn();
const scheduled: Array<() => Promise<unknown> | unknown> = [];
let ray: string | null = 'ray-1';
const rays: string[] = [];

vi.mock('mongoose', () => ({
    default: {
        connect: (...args: unknown[]) => connect(...args),
        createConnection: (...args: unknown[]) => createConnection(...args),
        connection: { readyState: 0 },
    },
}));

vi.mock('next/headers', () => ({
    headers: async () => ({
        get: (name: string) => {
            if (name !== 'cf-ray') return null;
            return rays.length ? rays.shift()! : ray;
        },
    }),
}));

vi.mock('next/server', () => ({
    after: (task: () => unknown) => {
        scheduled.push(task);
    },
}));

interface FakeConn {
    db: { id: number };
    models: Record<string, unknown>;
    model: ReturnType<typeof vi.fn>;
    asPromise: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
}

function fakeConnection(id: number): FakeConn {
    const conn: FakeConn = {
        db: { id },
        models: {},
        model: vi.fn((name: string) => {
            const compiled = { name, find: vi.fn() };
            conn.models[name] = compiled;
            return compiled;
        }),
        asPromise: vi.fn(async () => conn),
        close: vi.fn(async () => {}),
    };
    return conn;
}

const nodeConnection = { connection: { db: { databaseName: 'openstock' } } };

describe('connectToDatabase', () => {
    beforeEach(() => {
        vi.resetModules();
        ray = 'ray-1';
        rays.length = 0;
        scheduled.length = 0;
        connect.mockReset();
        createConnection.mockReset();
        let nextId = 0;
        connect.mockImplementation(async () => nodeConnection);
        createConnection.mockImplementation(() => fakeConnection(++nextId));
        delete (global as { mongooseCache?: unknown }).mongooseCache;
        process.env.MONGODB_URI = 'mongodb://user:pass@a.example.net:27017,b.example.net:27017,c.example.net:27017/openstock';
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        delete process.env.MONGODB_URI;
    });

    it('reuses one Workers connection per request and closes it when the response finishes', async () => {
        vi.stubGlobal('navigator', { userAgent: 'Cloudflare-Workers' });
        const { connectToDatabase } = await import('@/database/mongoose');

        const first = await connectToDatabase();
        const second = await connectToDatabase();
        expect(second.connection).toBe(first.connection);
        expect(createConnection).toHaveBeenCalledTimes(1);
        expect(createConnection).toHaveBeenCalledWith(process.env.MONGODB_URI, { bufferCommands: false, family: 4 });
        expect(connect).not.toHaveBeenCalled();
        expect(scheduled).toHaveLength(1);

        const close = (first.connection as unknown as FakeConn).close;
        expect(close).not.toHaveBeenCalled();
        await scheduled[0]!();
        expect(close).toHaveBeenCalledTimes(1);
    });

    it('gives concurrent Workers requests separate connections', async () => {
        vi.stubGlobal('navigator', { userAgent: 'Cloudflare-Workers' });
        rays.push('ray-1', 'ray-2');
        const { connectToDatabase } = await import('@/database/mongoose');

        const [first, second] = await Promise.all([connectToDatabase(), connectToDatabase()]);
        expect(first.connection).not.toBe(second.connection);
        expect(createConnection).toHaveBeenCalledTimes(2);
        expect(scheduled).toHaveLength(2);

        await scheduled[0]!();
        expect((first.connection as unknown as FakeConn).close).toHaveBeenCalledTimes(1);
        expect((second.connection as unknown as FakeConn).close).not.toHaveBeenCalled();
    });

    it('retries a Workers connect after a failure on the same request', async () => {
        vi.stubGlobal('navigator', { userAgent: 'Cloudflare-Workers' });
        createConnection.mockImplementationOnce(() => {
            const conn = fakeConnection(1);
            conn.asPromise.mockRejectedValueOnce(new Error('down'));
            return conn;
        });
        const { connectToDatabase } = await import('@/database/mongoose');

        await expect(connectToDatabase()).rejects.toThrow('down');
        const connected = await connectToDatabase();
        expect(createConnection).toHaveBeenCalledTimes(2);
        expect(connected.connection.db).toBeTruthy();
        expect(scheduled).toHaveLength(1);
    });

    it('keeps the Node connection cached across calls', async () => {
        const { connectToDatabase } = await import('@/database/mongoose');

        const first = await connectToDatabase();
        const second = await connectToDatabase();
        expect(second).toBe(first);
        expect(connect).toHaveBeenCalledTimes(1);
        expect(connect).toHaveBeenCalledWith(process.env.MONGODB_URI, { bufferCommands: false, family: 4 });
        expect(createConnection).not.toHaveBeenCalled();
        expect(scheduled).toHaveLength(0);
    });
});

describe('modelOn', () => {
    function handle(bound: { find: () => string }) {
        const models: Record<string, unknown> = {};
        const connection = {
            models,
            model: vi.fn((name: string) => {
                models[name] = bound;
                return bound;
            }),
        };
        return { connection, models };
    }

    it('binds the model to the given Workers connection and reuses it', async () => {
        vi.stubGlobal('navigator', { userAgent: 'Cloudflare-Workers' });
        vi.resetModules();
        const { modelOn } = await import('@/database/request-connection');
        const fallback = { find: () => 'default' } as unknown as Model<unknown>;
        const firstBound = { find: () => 'one' };
        const secondBound = { find: () => 'two' };
        const first = handle(firstBound);
        const second = handle(secondBound);

        const a = modelOn({ connection: first.connection as unknown as Connection }, 'Alert', {} as Schema, fallback);
        const again = modelOn({ connection: first.connection as unknown as Connection }, 'Alert', {} as Schema, fallback);
        const b = modelOn({ connection: second.connection as unknown as Connection }, 'Alert', {} as Schema, fallback);

        expect(a).toBe(firstBound);
        expect(again).toBe(firstBound);
        expect(b).toBe(secondBound);
        expect(first.connection.model).toHaveBeenCalledTimes(1);
        expect(second.connection.model).toHaveBeenCalledTimes(1);
        vi.unstubAllGlobals();
    });

    it('returns the default model on Node', async () => {
        vi.resetModules();
        const { modelOn } = await import('@/database/request-connection');
        const fallback = { find: () => 'default' } as unknown as Model<unknown>;
        const db = handle({ find: () => 'request' });
        expect(modelOn({ connection: db.connection as unknown as Connection }, 'Alert', {} as Schema, fallback)).toBe(fallback);
        expect(db.connection.model).not.toHaveBeenCalled();
    });
});
