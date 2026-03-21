
const dns = require('dns');
const { promisify } = require('util');

// Force Google DNS
dns.setServers(['8.8.8.8']);

const resolveSrv = promisify(dns.resolveSrv);
const resolveTxt = promisify(dns.resolveTxt);

const SRV_ADDR = '_mongodb._tcp.cluster0.scwvh5g.mongodb.net';

async function getStandardConnectionString() {
    try {
        console.log(`Resolving SRV for ${SRV_ADDR}...`);
        const addresses = await resolveSrv(SRV_ADDR);
        console.log('SRV Records:', addresses);

        // Sort by priority/weight if needed, usually just need the names
        const hosts = addresses.map(a => `${a.name}:${a.port}`).join(',');

        // We also need the replica set name, often found in TXT record or we can try without it first
        // But usually Atlas needs 'ssl=true&authSource=admin' for standard connections

        let replicaSet = null;
        try {
            // TXT record often contains options like authSource or replicaSet
            const txts = await resolveTxt('cluster0.scwvh5g.mongodb.net');
            console.log('TXT Records:', txts);
            // Atlas TXT often looks like: "authSource=admin&replicaSet=atlas-..."
            const params = new URLSearchParams(txts[0].join(''));
            replicaSet = params.get('replicaSet');
        } catch (e) {
            console.warn("Could not fetch TXT record for options, guessing/omitting...");
        }

        const user = "opendevsociety";
        const pass = "6vIalDn9VhIDu7Fr";
        const db = "openstock"; // Assuming db name, or just /test

        let uri = `mongodb://${user}:${pass}@${hosts}/${db}?ssl=true&authSource=admin`;
        if (replicaSet) {
            uri += `&replicaSet=${replicaSet}`;
        }
        uri += `&retryWrites=true&w=majority`;

        console.log("\n✅ STANDARD URI (Use this in .env):");
        console.log(uri);

        const fs = require('fs');
        fs.writeFileSync('mongo_uri.txt', uri);

    } catch (e) {
        console.error("DNS Resolution Failed:", e);
    }
}

getStandardConnectionString();
