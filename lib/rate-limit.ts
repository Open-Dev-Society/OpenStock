import { headers } from "next/headers";
import { connectToDatabase } from "@/database/mongoose";

type Counter = { _id: string; count: number; expiresAt: Date };
let ttlIndex: Promise<unknown> | null = null;

export const TOO_MANY_ATTEMPTS = 'Too many attempts. Please wait a few minutes and try again.';

// Fixed-window counters in MongoDB, shared by every server instance (an in-memory limit resets per serverless
// instance). better-auth's own limiter only runs on its /api/auth routes, not on auth.api calls from server actions.
// ponytail: two first hits in the same instant can both start at 1; fine for abuse limits.
export async function isRateLimited(key: string, max: number, windowSeconds: number, cost = 1): Promise<boolean> {
    const db = (await connectToDatabase()).connection.db;
    if (!db) return false;
    const counters = db.collection<Counter>('rate_limits');
    ttlIndex ??= counters.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => null);

    const now = new Date();
    const counter = await counters.findOneAndUpdate(
        { _id: key, expiresAt: { $gt: now } },
        { $inc: { count: cost } },
        { returnDocument: 'after' },
    );
    if (counter) return counter.count > max;

    await counters.updateOne(
        { _id: key },
        { $set: { count: cost, expiresAt: new Date(now.getTime() + windowSeconds * 1000) } },
        { upsert: true },
    );
    return cost > max;
}

// Vercel and most proxies put the client first in x-forwarded-for. Self-hosted without a proxy the header can be
// forged, which is why every IP limit is paired with a per-account one.
export async function clientIp(): Promise<string> {
    const h = await headers();
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}
