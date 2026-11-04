import mongoose, { type Connection } from "mongoose";
import { requestConnection } from "@/database/request-connection";

const MONGODB_URI = process.env.MONGODB_URI;

// FIX: Set Google DNS and force IPv4 to avoid querySrv ECONNREFUSED
import dns from 'dns';
try {
    // This is often more effective than setServers for Node 17+
    if (dns.setDefaultResultOrder) {
        dns.setDefaultResultOrder('ipv4first');
    }
    dns.setServers(['8.8.8.8']);
    console.log('MongoDB: Custom DNS settings applied');
} catch (e) {
    console.error('Failed to set custom DNS:', e);
}

declare global {
    var mongooseCache: {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
    }
}

let cached = global.mongooseCache;

if (!cached) {
    cached = global.mongooseCache = { conn: null, promise: null };
}

// Workers isolates keep this module alive, but a socket opened for one request
// cannot be used by the next one (error 1101). Concurrent requests each get
// their own createConnection. Node and Vercel keep the cache below.
export function isWorkersRuntime(): boolean {
    return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
}

const workersConnections = new Map<string, Promise<Connection>>();

async function workersRequestKey(): Promise<string | undefined> {
    try {
        const { headers } = await import("next/headers");
        return (await headers()).get("cf-ray") || undefined;
    } catch {
        return undefined;
    }
}

async function openWorkersConnection(key: string | undefined): Promise<Connection> {
    const conn = mongoose.createConnection(MONGODB_URI!, { bufferCommands: false, family: 4 });
    try {
        await conn.asPromise();
    } catch (error) {
        await conn.close().catch(() => {});
        throw error;
    }

    const { after } = await import("next/server");
    after(async () => {
        if (key) workersConnections.delete(key);
        await conn.close();
    });
    console.log(`MongoDB Connected ${MONGODB_URI!.replace(/\/\/[^@]*@/, '//***@')} in ${process.env.NODE_ENV}`);
    return conn;
}

async function connectForThisRequest(): Promise<Connection> {
    const key = await workersRequestKey();
    if (key) {
        const existing = workersConnections.get(key);
        if (existing) return existing;
    }

    const ready = openWorkersConnection(key);
    if (key) {
        workersConnections.set(key, ready);
        ready.catch(() => {
            if (workersConnections.get(key) === ready) workersConnections.delete(key);
        });
    }
    return ready;
}

export const connectToDatabase = async () => {
    if (!MONGODB_URI) {
        throw new Error("MongoDB URI is missing");
    }

    if (isWorkersRuntime()) {
        const conn = await connectForThisRequest();
        requestConnection.enterWith(conn);
        return { connection: conn } as typeof mongoose;
    }

    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false, family: 4 });
    }

    try {
        cached.conn = await cached.promise;
    }
    catch (err) {
        cached.promise = null;
        throw err;
    }

    console.log(`MongoDB Connected ${MONGODB_URI.replace(/\/\/[^@]*@/, '//***@')} in ${process.env.NODE_ENV}`);
    return cached.conn;
}