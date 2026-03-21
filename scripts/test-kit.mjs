
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const KIT_API_KEY = process.env.KIT_API_KEY;
const KIT_API_SECRET = process.env.KIT_API_SECRET;

console.log("Checking keys...");
if (!KIT_API_KEY || !KIT_API_SECRET) {
    console.error("❌ Missing KIT_API_KEY or KIT_API_SECRET");
    process.exit(1);
} else {
    console.log("✅ Keys found.");
}

async function runTest() {
    console.log("🚀 Sending Test Broadcast via Kit API...");

    const url = `https://api.convertkit.com/v3/broadcasts`;
    const payload = {
        api_key: KIT_API_KEY,
        api_secret: KIT_API_SECRET,
        subject: "OpenStock Manual Test " + new Date().toISOString(),
        content: "<h1>Test Email</h1><p>If you see this, the API connection is working.</p>",
        public: true
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("👉 API Response Status:", response.status);
        console.log("👉 Full Response Body:", JSON.stringify(data, null, 2));

    } catch (e) {
        console.error("❌ Request Failed:", e);
    }
}

runTest();
