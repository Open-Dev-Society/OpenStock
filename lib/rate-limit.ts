import { headers } from "next/headers";
import { connectToDatabase, isWorkersRuntime } from "@/database/mongoose";

type Counter = { _id: string; count: number; expiresAt: Date };
let ttlIndex: Promise<unknown> | null = null;

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
// forged, which is why every IP limit is paired with a per-account one. On Workers the client's own x-forwarded-for
// comes first, so trust only cf-connecting-ip there (Cloudflare overwrites it). Null when no header names the client.
export async function clientIp(): Promise<string | null> {
    const h = await headers();
    if (isWorkersRuntime()) return h.get('cf-connecting-ip') || null;
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null;
}

/** How many times the per-client budget all clients without a known address share. */
export const NO_IP_BUDGET_FACTOR = 10;

// Self-hosted with nothing in front of Next.js (the shipped docker-compose.yml), no request names its client. Counting
// them all as one client refused the sixth honest sign-up of the hour (#161), so they share a larger instance-wide
// budget instead: it still caps abuse (emails, AI calls) without passing for a per-client limit.
export async function isClientRateLimited(scope: string, max: number, windowSeconds: number): Promise<boolean> {
    const ip = await clientIp();
    if (ip) return isRateLimited(`${scope}:ip:${ip}`, max, windowSeconds);
    return isRateLimited(`${scope}:no-ip`, max * NO_IP_BUDGET_FACTOR, windowSeconds);
}
