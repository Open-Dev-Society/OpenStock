import mongoose from "mongoose";

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
// cannot be used by the next one (error 1101). Node and Vercel keep the cache.
export function isWorkersRuntime(): boolean {
    return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
}

// ponytail: one default mongoose connection per isolate. Overlapping requests can
// disconnect each other. Per-request createConnection if that shows up.
let workersRequest: { key: string; promise: Promise<typeof mongoose> } | null = null;

async function workersRequestKey(): Promise<string | undefined> {
    try {
        const { headers } = await import("next/headers");
        return (await headers()).get("cf-ray") || undefined;
    } catch {
        return undefined;
    }
}

async function connectForThisRequest(): Promise<typeof mongoose> {
    const key = await workersRequestKey();
    if (key && workersRequest?.key === key) return workersRequest.promise;

    const promise = (async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        await mongoose.connect(MONGODB_URI!, { bufferCommands: false, family: 4 });
        console.log(`MongoDB Connected ${MONGODB_URI!.replace(/\/\/[^@]*@/, '//***@')} in ${process.env.NODE_ENV}`);
        return mongoose;
    })();

    if (key) workersRequest = { key, promise };
    promise.catch(() => {
        if (workersRequest?.promise === promise) workersRequest = null;
    });
    return promise;
}

export const connectToDatabase = async () => {
    if (!MONGODB_URI) {
        throw new Error("MongoDB URI is missing");
    }

    if (isWorkersRuntime()) return connectForThisRequest();

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