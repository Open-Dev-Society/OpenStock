import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

// FIX: Only override DNS when connecting to Atlas SRV clusters to preserve local/container DNS
import dns from 'dns';
if (MONGODB_URI && MONGODB_URI.startsWith('mongodb+srv://')) {
    try {
        if (dns.setDefaultResultOrder) {
            dns.setDefaultResultOrder('ipv4first');
        }
        dns.setServers(['8.8.8.8']);
        console.log('MongoDB: Custom DNS settings applied for Atlas SRV');
    } catch (e) {
        console.error('Failed to set custom DNS:', e);
    }
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

export const connectToDatabase = async () => {
    if (!MONGODB_URI) {
        throw new Error("MongoDB URI is missing");
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

    console.log(`MongoDB Connected ${MONGODB_URI} in ${process.env.NODE_ENV}`);
    return cached.conn;
}