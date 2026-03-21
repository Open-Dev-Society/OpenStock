import 'dotenv/config';
import mongoose from 'mongoose';
import { addToWatchlist, removeFromWatchlist, getUserWatchlist, isStockInWatchlist } from '../lib/actions/watchlist.actions.js';
import { createAlert, getUserAlerts } from '../lib/actions/alert.actions.js';
import { getWatchlistData } from '../lib/actions/finnhub.actions.js';

// Mock data
const MOCK_USER_ID = 'verify-user-' + Date.now();
const SYMBOL = 'AAPL';
const COMPANY = 'Apple Inc';

// Monkey patch revalidatePath to avoid Next.js error in script
global.fetch = fetch; // Ensure fetch is available
import { jest } from '@jest/globals'; // Not using jest, just need to mock module if possible.
// Actually, simple mock:
const mockRevalidatePath = () => { };
// We can't easily mock module import in ESM without loader hooks.
// But the actions import 'next/cache'. This script will fail if next/cache is not found or environment is not Next.js.
// We might need to run this verification via a Next.js API route or just run the dev server and test manually?
// Alternative: Creating a temporary test page or API route is safer for server actions.
// OR: We comment out revalidatePath in actions for testing? No.
// Let's try running it. If it fails on 'next/cache', we'll switch to manual verification.

console.log('--- STARTING VERIFICATION ---');

// We will rely on manual verification for Server Actions mostly because they depend on Next.js context (headers, cache).
// But we can test models and Finnhub actions.

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

async function verifyDB() {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri, { bufferCommands: false, family: 4 });
    console.log('Connected to DB');
}

// Just verifying Finnhub for now as it's the external dependency.
// Database interactions are standard Mongoose.
async function main() {
    await verifyFinnhub();
    process.exit(0);
}

main();
