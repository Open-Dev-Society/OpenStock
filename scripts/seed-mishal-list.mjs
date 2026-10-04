import 'dotenv/config';
import mongoose from 'mongoose';
import { readFileSync } from 'fs';

const NUMS = ['1120', '1210', '2010', '2084', '2120', '2140', '2160', '2190', '2382', '4031', '4250', '4270', '4290', '4321', '6018', '6050', '7010'];
const SQ = String.fromCharCode(39);

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const user = await db.collection('user').findOne({});
    const userId = String(user._id);
    console.log('seeding for:', user.email);

    const src = readFileSync('lib/tadawul-companies.ts', 'utf8');
    const dir = new Map();
    const re = new RegExp(`symbol: '(\\d+\\.SR)', name: '((?:[^'\\\\]|\\\\.)*)'(, ar: '((?:[^'\\\\]|\\\\.)*)')?`, 'g');
    for (const m of src.matchAll(re)) {
        const unesc = (t) => t.replace(/\\'/g, SQ);
        dir.set(m[1], m[4] ? `${unesc(m[2])} · ${unesc(m[4])}` : unesc(m[2]));
    }

    const equities = NUMS.map((n) => ({
        symbol: `${n}.SR`,
        company: dir.get(`${n}.SR`) || `${n}.SR`,
        addedAt: new Date(),
    }));

    await db.collection('watchlists').deleteMany({ userId });
    await db.collection('watchlists').insertMany(equities.map((e) => ({ userId, ...e })));

    await db.collection('watchlistlists').deleteMany({ userId, name: 'mishal watch list' });
    await db.collection('watchlistlists').insertOne({
        userId,
        name: 'mishal watch list',
        symbols: [{ symbol: 'TADAWUL:TASI', company: 'TASI Index · تاسي', addedAt: new Date() }, ...equities],
        createdAt: new Date(),
    });

    console.log('default watchlist:', await db.collection('watchlists').countDocuments({ userId }));
    console.log('named lists:', (await db.collection('watchlistlists').find({ userId }).project({ name: 1 }).toArray()).map((d) => d.name));
    await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
