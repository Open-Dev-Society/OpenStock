#!/usr/bin/env node
/**
 * Standalone script to process pending orders.
 * Connects directly to MongoDB and executes orders when price conditions are met.
 * Called by cron every 2 minutes.
 */
const path = require('path');

// Load env
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

async function main() {
    const { MongoClient } = require('mongodb');
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/openstock';
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db();

    const pendingColl = db.collection('pendingorders');
    const accountsColl = db.collection('paperaccounts');
    const tradesColl = db.collection('papertrades');

    // ── Market hours check (simplified) ──
    // US market: Mon-Fri, 9:30 AM - 4:00 PM ET
    function isMarketOpen() {
        const now = new Date();
        // US ET offset: EDT = -4, EST = -5
        // Rough check: Mar-Nov is EDT
        const month = now.getUTCMonth() + 1;
        const offset = (month >= 3 && month <= 11) ? -4 : -5;
        const etMs = now.getTime() + offset * 3600000;
        const et = new Date(etMs);
        const dow = et.getUTCDay();
        const minutes = et.getUTCHours() * 60 + et.getUTCMinutes();

        // Weekend
        if (dow === 0 || dow === 6) return false;

        // US Holidays 2026 (simplified list)
        const holidays = [
            { m: 1, d: 1 }, { m: 1, d: 19 }, { m: 2, d: 16 },
            { m: 4, d: 3 }, { m: 5, d: 25 }, { m: 6, d: 19 },
            { m: 7, d: 3 }, { m: 9, d: 7 }, { m: 11, d: 26 },
            { m: 12, d: 25 },
        ];
        const etMonth = et.getUTCMonth() + 1;
        const etDay = et.getUTCDate();
        if (holidays.some(h => h.m === etMonth && h.d === etDay)) return false;

        // Regular hours: 9:30 AM - 4:00 PM ET
        return minutes >= 570 && minutes < 960;
    }

    if (!isMarketOpen()) {
        await client.close();
        return { executed: 0, total: 0 };
    }

    // Fetch all PENDING orders
    const pending = await pendingColl.find({ status: 'PENDING' }).sort({ createdAt: 1 }).toArray();

    if (pending.length === 0) {
        await client.close();
        return { executed: 0, total: 0 };
    }

    // Fetch current prices (using simple REST call)
    const https = require('https');

    // For each order, check and execute
    let executed = 0;
    for (const order of pending) {
        try {
            // Get current price from Finnhub
            const finnhubKey = process.env.FINNHUB_API_KEY;
            if (!finnhubKey) {
                console.log(`No FINNHUB_API_KEY, skipping ${order.symbol}`);
                continue;
            }

            const price = await new Promise((resolve, reject) => {
                const url = `https://finnhub.io/api/v1/quote?symbol=${order.symbol}&token=${finnhubKey}`;
                https.get(url, res => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            const json = JSON.parse(data);
                            resolve(json.c || 0);
                        } catch { resolve(0); }
                    });
                }).on('error', reject);
            });

            if (!price) {
                console.log(`No price for ${order.symbol}, skipping`);
                continue;
            }

            const roundedPrice = Math.round(price * 100) / 100;

            // Check condition
            let shouldExecute = false;
            const orderType = order.orderType || 'MARKET_ON_OPEN';

            switch (orderType) {
                case 'MARKET_ON_OPEN':
                    shouldExecute = true;
                    break;
                case 'LIMIT':
                    if (order.type === 'BUY') shouldExecute = roundedPrice <= order.limitPrice;
                    else shouldExecute = roundedPrice >= order.limitPrice;
                    break;
                case 'STOP':
                    if (order.type === 'BUY') shouldExecute = roundedPrice >= order.stopPrice;
                    else shouldExecute = roundedPrice <= order.stopPrice;
                    break;
            }

            if (!shouldExecute) continue;

            // Execute trade
            const account = await accountsColl.findOne({ _id: new (require('mongodb').ObjectId)(order.accountId) });
            if (!account) {
                await pendingColl.updateOne({ _id: order._id }, { $set: { status: 'FAILED', failReason: 'Account not found' } });
                continue;
            }

            if (order.type === 'BUY') {
                const total = Math.round(order.shares * roundedPrice * 100) / 100;
                if (total > account.balance) {
                    await pendingColl.updateOne({ _id: order._id }, { $set: { status: 'FAILED', failReason: `Insufficient funds: need $${total}, have $${account.balance}` } });
                    console.log(`  ✗ ${order.symbol}: insufficient funds`);
                    continue;
                }
                await accountsColl.updateOne({ _id: account._id }, { $inc: { balance: -total } });
                await tradesColl.insertOne({
                    accountId: order.accountId,
                    userId: order.userId,
                    symbol: order.symbol,
                    company: order.company || order.symbol,
                    type: 'BUY',
                    shares: order.shares,
                    price: roundedPrice,
                    total,
                    timestamp: new Date(),
                });
            } else {
                // SELL: check holdings
                const agg = await tradesColl.aggregate([
                    { $match: { accountId: order.accountId, symbol: order.symbol } },
                    { $group: { _id: '$symbol', shares: { $sum: { $cond: [{ $eq: ['$type', 'BUY'] }, '$shares', { $multiply: ['$shares', -1] }] } } } },
                ]).toArray();
                const held = agg[0]?.shares || 0;
                if (held < order.shares) {
                    await pendingColl.updateOne({ _id: order._id }, { $set: { status: 'FAILED', failReason: `Insufficient shares: have ${held}, need ${order.shares}` } });
                    console.log(`  ✗ ${order.symbol}: insufficient shares`);
                    continue;
                }
                const total = Math.round(order.shares * roundedPrice * 100) / 100;
                await accountsColl.updateOne({ _id: account._id }, { $inc: { balance: total } });
                await tradesColl.insertOne({
                    accountId: order.accountId,
                    userId: order.userId,
                    symbol: order.symbol,
                    company: order.company || order.symbol,
                    type: 'SELL',
                    shares: order.shares,
                    price: roundedPrice,
                    total,
                    timestamp: new Date(),
                });
            }

            // Mark as executed
            await pendingColl.updateOne({ _id: order._id }, { $set: { status: 'EXECUTED', executedAt: new Date() } });
            console.log(`  ✓ EXECUTED ${order.type} ${order.shares} ${order.symbol} @ $${roundedPrice}`);
            executed++;
        } catch (err) {
            console.error(`Error processing order ${order._id}:`, err.message);
        }
    }

    await client.close();
    console.log(`Done: ${executed} of ${pending.length} orders executed`);
    return { executed, total: pending.length };
}

main().catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
});
