
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from 'dns';
dotenv.config({ path: '.env' });

// 1. Force Google DNS to resolve 'querySrv' errors
dns.setServers(['8.8.8.8']);

const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error("❌ MONGODB_URI is missing");
    process.exit(1);
}

async function run() {
    try {
        console.log("Connecting to MongoDB...");
        // 2. Force IPv4 ('family: 4') to avoid IPv6 timeouts
        await mongoose.connect(uri, { family: 4 });
        console.log("✅ Connected to DB");

        const email = "11aravipratapsingh@gmail.com";
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        console.log(`Creating/Updating inactive user: ${email}`);

        const db = mongoose.connection.db;
        const result = await db.collection('user').updateOne(
            { email: email },
            {
                $set: {
                    name: "Ravi Pratap Singh",
                    email: email,
                    createdAt: sixtyDaysAgo,
                    lastActiveAt: sixtyDaysAgo
                },
                $unset: {
                    lastReengagementSentAt: ""
                }
            },
            { upsert: true }
        );

        console.log("Result:", result);
        console.log("✅ User seeded as inactive. You can now run the Inngest function.");

    } catch (e) {
        console.error("❌ DB Error:", e);
    } finally {
        await mongoose.disconnect();
    }
}
run();
