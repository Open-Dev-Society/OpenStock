
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const KIT_API_KEY = process.env.KIT_API_KEY;

async function createTag() {
    const url = `https://api.convertkit.com/v3/tags`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: KIT_API_KEY,
                tag: { name: "OpenStock Users" }
            })
        });

        const data = await response.json();
        console.log("Creation Response:", JSON.stringify(data, null, 2));

        if (data.id || (data.tag && data.tag.id)) {
            const tagId = data.id || data.tag.id;
            console.log(`✅ Created Tag ID: ${tagId}`);
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

createTag();
