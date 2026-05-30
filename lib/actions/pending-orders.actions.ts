'use server';

import { connectToDatabase } from '@/database/mongoose';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import { buyStock, sellStock } from '@/lib/actions/paper-trading.actions';
import { isMarketOpen } from '@/lib/utils/market-hours';

// ── Types ──

export interface PendingOrder {
    _id: string;
    accountId: string;
    userId: string;
    symbol: string;
    company: string;
    type: 'BUY' | 'SELL';
    shares: number;
    /** 
     * Order types:
     * - LIMIT: execute at limitPrice or better
     * - STOP: execute when price crosses stopPrice (stop loss / stop entry)
     * - MARKET_ON_OPEN: execute at market price when the market opens (auto-created when market is closed)
     */
    orderType: 'LIMIT' | 'STOP' | 'MARKET_ON_OPEN';
    limitPrice: number | null;
    stopPrice: number | null;
    status: 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'FAILED';
    createdAt: string;
    executedAt: string | null;
    cancelledAt: string | null;
    failReason: string | null;
}

// ── Helpers ──

async function getPendingOrdersCollection() {
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error('No MongoDB connection');
    return db.collection('pendingorders');
}

// ── CRUD ──

export async function createPendingOrder(
    accountId: string,
    userId: string,
    symbol: string,
    company: string,
    type: 'BUY' | 'SELL',
    shares: number,
    orderType: 'LIMIT' | 'STOP' | 'MARKET_ON_OPEN',
    limitPrice?: number | null,
    stopPrice?: number | null,
) {
    try {
        const coll = await getPendingOrdersCollection();
        const sym = symbol.toUpperCase();

        // ── Balance / Holdings Check ──
        const { connectToDatabase } = await import('@/database/mongoose');
        await connectToDatabase();
        const db = mongoose.connection.db;
        if (!db) return { success: false, error: 'Database connection failed' };

        const accountsColl = db.collection('paperaccounts');
        const tradesColl = db.collection('papertrades');
        const account = await accountsColl.findOne({ _id: new mongoose.Types.ObjectId(accountId) });

        if (!account) return { success: false, error: 'Account not found' };

        if (type === 'BUY') {
            // Calculate maximum possible cost
            let maxCost: number;
            if (orderType === 'LIMIT' && limitPrice) {
                maxCost = Math.round(shares * limitPrice * 100) / 100;
            } else if (orderType === 'STOP' && stopPrice) {
                maxCost = Math.round(shares * stopPrice * 100) / 100;
            } else {
                // MARKET_ON_OPEN: use current price as estimate
                const { getQuote } = await import('@/lib/actions/finnhub.actions');
                const quote = await getQuote(sym);
                const currentPrice = quote?.c || 0;
                if (!currentPrice) return { success: false, error: `Cannot determine price for ${sym}. Try a limit order instead.` };
                maxCost = Math.round(shares * currentPrice * 100) / 100;
                // Add 5% buffer for price movement
                maxCost = Math.round(maxCost * 1.05 * 100) / 100;
            }
            if (maxCost > account.balance) {
                return { success: false, error: `Insufficient funds. Need $${maxCost.toFixed(2)}, available $${account.balance.toFixed(2)}` };
            }
        } else {
            // SELL: check holdings
            const holdings = await tradesColl.aggregate([
                { $match: { accountId, symbol: sym } },
                {
                    $group: {
                        _id: '$symbol',
                        shares: { $sum: { $cond: [{ $eq: ['$type', 'BUY'] }, '$shares', { $multiply: ['$shares', -1] }] } },
                    }
                },
            ]).toArray();
            const held = holdings[0]?.shares || 0;
            if (held < shares) {
                return { success: false, error: `Insufficient shares. Holding ${held} ${sym}, trying to sell ${shares}` };
            }
        }

        const doc = {
            accountId,
            userId,
            symbol: sym,
            company: company || sym,
            type,
            shares,
            orderType,
            limitPrice: limitPrice || null,
            stopPrice: stopPrice || null,
            status: 'PENDING',
            createdAt: new Date(),
            executedAt: null,
            cancelledAt: null,
            failReason: null,
        };
        const result = await coll.insertOne(doc);

        // Try immediate execution in case market just opened
        const executed = await attemptExecuteOrder(result.insertedId.toString());

        revalidatePath('/paper-trading');
        return {
            success: true,
            order: JSON.parse(JSON.stringify({ ...doc, _id: result.insertedId })),
            instantlyExecuted: executed,
            message: executed
                ? `Order executed immediately! ${type} ${shares} ${symbol}`
                : `Pending ${orderType} order created for ${shares} ${symbol}`,
        };
    } catch (error) {
        console.error('Error creating pending order:', error);
        return { success: false, error: 'Failed to create pending order' };
    }
}

export async function cancelPendingOrder(orderId: string) {
    try {
        const coll = await getPendingOrdersCollection();
        await coll.updateOne(
            { _id: new mongoose.Types.ObjectId(orderId), status: 'PENDING' },
            { $set: { status: 'CANCELLED', cancelledAt: new Date() } }
        );
        revalidatePath('/paper-trading');
        return { success: true };
    } catch (error) {
        console.error('Error cancelling order:', error);
        return { success: false, error: 'Failed to cancel order' };
    }
}

export async function getPendingOrders(accountId: string): Promise<PendingOrder[]> {
    try {
        const coll = await getPendingOrdersCollection();
        const orders = await coll
            .find({ accountId, status: { $in: ['PENDING', 'FAILED'] } })
            .sort({ createdAt: -1 })
            .toArray();
        return JSON.parse(JSON.stringify(orders));
    } catch (error) {
        console.error('Error getting pending orders:', error);
        return [];
    }
}

export async function getAllPendingOrders(): Promise<PendingOrder[]> {
    try {
        const coll = await getPendingOrdersCollection();
        const orders = await coll
            .find({ status: 'PENDING' })
            .sort({ createdAt: 1 })
            .toArray();
        return JSON.parse(JSON.stringify(orders));
    } catch (error) {
        console.error('Error getting all pending orders:', error);
        return [];
    }
}

// ── Execution Engine ──

/**
 * Attempt to execute a single pending order.
 * Returns true if executed, false if still pending.
 */
async function attemptExecuteOrder(orderId: string): Promise<boolean> {
    try {
        const coll = await getPendingOrdersCollection();
        const order = await coll.findOne({ _id: new mongoose.Types.ObjectId(orderId), status: 'PENDING' });
        if (!order) return false;

        // Market must be open to execute
        if (!isMarketOpen()) return false;

        // Get current price
        const { getQuote } = await import('@/lib/actions/finnhub.actions');
        const quote = await getQuote(order.symbol);
        const currentPrice = quote?.c || 0;
        if (!currentPrice) return false;

        const roundedPrice = Math.round(currentPrice * 100) / 100;

        // Check if conditions are met
        let shouldExecute = false;

        switch (order.orderType) {
            case 'MARKET_ON_OPEN':
                // Execute at market when market is open
                shouldExecute = true;
                break;

            case 'LIMIT':
                if (order.type === 'BUY') {
                    // Limit buy: execute when price ≤ limitPrice
                    shouldExecute = roundedPrice <= order.limitPrice;
                } else {
                    // Limit sell: execute when price ≥ limitPrice
                    shouldExecute = roundedPrice >= order.limitPrice;
                }
                break;

            case 'STOP':
                if (order.type === 'BUY') {
                    // Stop buy (buy stop): execute when price ≥ stopPrice (breakout entry)
                    shouldExecute = roundedPrice >= order.stopPrice;
                } else {
                    // Stop sell (stop loss): execute when price ≤ stopPrice
                    shouldExecute = roundedPrice <= order.stopPrice;
                }
                break;
        }

        if (!shouldExecute) return false;

        // Execute the trade
        let result;
        if (order.type === 'BUY') {
            result = await buyStock(order.accountId, order.symbol, order.company || order.symbol, order.shares, order.userId);
        } else {
            result = await sellStock(order.accountId, order.symbol, order.shares, order.userId);
        }

        if (result.success) {
            await coll.updateOne(
                { _id: order._id },
                { $set: { status: 'EXECUTED', executedAt: new Date() } }
            );
            return true;
        } else {
            await coll.updateOne(
                { _id: order._id },
                { $set: { status: 'FAILED', failReason: result.error } }
            );
            return false;
        }
    } catch (error: any) {
        console.error(`Error executing order ${orderId}:`, error);
        return false;
    }
}

/**
 * Process all pending orders for all accounts.
 * Called by cron job periodically during market hours.
 */
export async function processAllPendingOrders(): Promise<{ executed: number; failed: number; total: number }> {
    const orders = await getAllPendingOrders();
    let executed = 0;
    let failed = 0;

    // Only process if market is open
    if (!isMarketOpen()) {
        return { executed: 0, failed: 0, total: orders.length };
    }

    for (const order of orders) {
        const ok = await attemptExecuteOrder(order._id);
        if (ok) executed++;
    }

    revalidatePath('/paper-trading');
    return { executed, failed, total: orders.length };
}
