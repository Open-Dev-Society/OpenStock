
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from 'dns';
import fetch from 'node-fetch'; // Standard fetch might be available globally in node 20+, but just in case. Actually Node 18+ has fetch.

dotenv.config({ path: '.env' });

// FORCE IPv4 & Google DNS to avoid Connection Errors
dns.setServers(['8.8.8.8']);

const MONGODB_URI = process.env.MONGODB_URI;
const KIT_API_KEY = process.env.KIT_API_KEY;
const KIT_WELCOME_FORM_ID = process.env.KIT_WELCOME_FORM_ID;

if (!MONGODB_URI || !KIT_API_KEY || !KIT_WELCOME_FORM_ID) {
    console.error("❌ Missing required env vars: MONGODB_URI, KIT_API_KEY, or KIT_WELCOME_FORM_ID");
    process.exit(1);
}

// Standalone Kit Add Subscriber Function (Tag Based)
async function addSubscriberToKit(email, firstName) {
    const TAG_ID = "15119471"; // OpenStock Users
    const url = `https://api.convertkit.com/v3/tags/${TAG_ID}/subscribe`;

    // Auto-detect first name if missing
    if (!firstName) firstName = "Subscriber";

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: KIT_API_KEY,
                email: email,
                first_name: firstName,
            }),
        });

        if (!response.ok) {
            const err = await response.text();

            // Rate Limit Handling
            if (response.status === 429 || err.includes('Retry later')) {
                console.log("⚠️ Rate Limit Hit. Cooling down for 10s...");
                await new Promise(r => setTimeout(r, 10000));
                return false; // Will be retried next run since we don't update DB
            }
            throw new Error(`Kit API Error: ${err}`);
        }
        return true;
    } catch (e) {
        // If "already subscribed", treat as success
        if (e.message && e.message.includes('already')) return true;

        // Log valid errors but don't crash
        // console.error(`❌ Failed to add ${email}:`, e.message);
        process.stdout.write("x");
        return false;
    }
}

async function runMigration() {
    try {
        console.log("🔌 Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI, { family: 4 });
        console.log("✅ Connected.");

        const db = mongoose.connection.db;
        const collection = db.collection('user');

        let totalMigrated = 0;
        let hasMore = true;
        const BATCH_SIZE = 5; // Reduced from 10
        const DELAY_MS = 2000; // Increased delay

        while (hasMore) {
            // Find users who are NOT yet migrated
            // We use a flag 'kitMigratedAt' to track status
            const users = await collection.find({
                kitMigratedAt: { $exists: false },
                email: { $exists: true, $ne: null }
            })
                .limit(BATCH_SIZE)
                .toArray();

            if (users.length === 0) {
                console.log("🎉 No more users to migrate!");
                hasMore = false;
                break;
            }

            console.log(`Processing batch of ${users.length} users...`);

            // Process batch in parallel
            const promises = users.map(async (user) => {
                const success = await addSubscriberToKit(user.email, user.name);

                if (success) {
                    await collection.updateOne(
                        { _id: user._id },
                        { $set: { kitMigratedAt: new Date() } }
                    );
                    process.stdout.write("."); // Progress dot
                    return 1;
                }
                return 0;
            });

            const results = await Promise.all(promises);
            totalMigrated += results.reduce((a, b) => a + b, 0);

            // Rate Limit Protection: Wait 1 second between batches
            // 10 reqs / sec = 600 / min. Safe for Kit (limit is usually higher).
            await new Promise(r => setTimeout(r, DELAY_MS));
        }

        console.log(`\n\n✅ Migration Complete. Total migrated: ${totalMigrated}`);

    } catch (e) {
        console.error("\n❌ Fatal Error:", e);
    } finally {
        await mongoose.disconnect();
    }
}

runMigration();
