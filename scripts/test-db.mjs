import 'dotenv/config';
import mongoose from 'mongoose';
import dns from 'dns';

try {
    dns.setServers(['8.8.8.8']);
    console.log('Set DNS servers to 8.8.8.8');
} catch (e) {
    console.warn('Could not set DNS servers:', e);
}

dns.resolveSrv('_mongodb._tcp.cluster0.scwvh5g.mongodb.net', (err, addresses) => {
    if (err) console.error('DNS SRV Error:', err);
    else console.log('DNS SRV Records:', addresses);
});

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('ERROR: MONGODB_URI must be set in .env');
        process.exit(1);
    }

    try {
        const startedAt = Date.now();
        await mongoose.connect(uri, { bufferCommands: false, family: 4 });
        const elapsed = Date.now() - startedAt;

        const dbName = mongoose.connection?.name || '(unknown)';
        const host = mongoose.connection?.host || '(unknown)';

        console.log(`OK: Connected to MongoDB [db="${dbName}", host="${host}", time=${elapsed}ms]`);
        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('ERROR: Database connection failed');
        console.error(err);
        try { await mongoose.connection.close(); } catch { }
        process.exit(1);
    }
}

main();