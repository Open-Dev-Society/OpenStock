// Reset a user's Better Auth credential password directly in MongoDB.
// Use when the sign-in email is lost/unreachable (no SMTP configured locally
// for the forgot-password flow). Uses the same scrypt hashing Better Auth uses.
// Usage: node scripts/reset-password.mjs <email> <new-password>
import 'dotenv/config';
import mongoose from 'mongoose';
import { hashPassword } from 'better-auth/crypto';

const [email, newPassword] = process.argv.slice(2);
if (!email || !newPassword) {
    console.error('usage: node scripts/reset-password.mjs <email> <new-password>');
    process.exit(1);
}

const conn = await mongoose.createConnection(process.env.MONGODB_URI).asPromise();
try {
    const db = conn.db;
    if (!db) throw new Error('no DB connection');

    const user = await db.collection('user').findOne({ email: email.toLowerCase() });
    if (!user) {
        console.error(`❌ no user with email ${email}`);
        process.exit(2);
    }
    // Raw Mongo docs key accounts by the user's _id string (no top-level `id` field).
    const accountId = String(user._id);

    const hash = await hashPassword(newPassword);
    const res = await db.collection('account').updateOne(
        { accountId, providerId: 'credential' },
        { $set: { password: hash } },
    );

    if (res.matchedCount === 0) {
        await db.collection('account').insertOne({
            accountId,
            userId: accountId,
            providerId: 'credential',
            password: hash,
            createdAt: new Date(),
        });
        console.log('✅ user found; credential account created with the new password');
    } else {
        console.log('✅ password updated');
    }
    console.log(`   email: ${user.email}`);
} finally {
    await conn.close();
}
