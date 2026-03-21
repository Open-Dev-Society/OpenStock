
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function checkSchema() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("No MONGODB_URI");
        return;
    }
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db();
        const user = await db.collection('user').findOne({});
        console.log("User Sample:", JSON.stringify(user, null, 2));

        // Also check 'session' collection if it exists, as it might hold login activity
        const session = await db.collection('session').findOne({});
        console.log("Session Sample:", JSON.stringify(session, null, 2));

    } finally {
        await client.close();
    }
}
checkSchema();
