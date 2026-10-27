import 'dotenv/config';
import { getWatchlistData } from '../lib/actions/finnhub.actions.js';

const SYMBOL = 'AAPL';

// Server Actions (watchlist/alerts) depend on the Next.js runtime (headers,
// revalidatePath, next/cache), so they can't be verified from a plain node
// script — test them through the running app instead. Only the external
// Finnhub dependency is checked here.

console.log('--- STARTING VERIFICATION ---');

async function verifyFinnhub() {
    console.log('1. Testing Finnhub Quote...');
    const data = await getWatchlistData([SYMBOL]);
    console.log('Finnhub Data:', data);
    if (data.length > 0 && data[0].price > 0) {
        console.log('✅ Finnhub Quote Fetch Success');
    } else {
        console.error('❌ Finnhub Quote Fetch Failed');
    }
}

async function main() {
    await verifyFinnhub();
    process.exit(0);
}

main();
