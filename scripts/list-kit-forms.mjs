
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const KIT_API_KEY = process.env.KIT_API_KEY;

async function listForms() {
    const url = `https://api.convertkit.com/v3/forms?api_key=${KIT_API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        console.log("\n📋 Available Kit Forms:");
        if (data.forms && data.forms.length > 0) {
            data.forms.forEach(f => {
                console.log(`- ID: ${f.id} | Name: ${f.name}`);
            });
        } else {
            console.log("No forms found.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

listForms();
