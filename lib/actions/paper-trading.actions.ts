'use server';

import { connectToDatabase } from '@/database/mongoose';
import { PaperAccount, PaperTrade } from '@/database/models/paper-trading.model';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';

// Defaults
const DEFAULT_CAPITAL = 100000;

const PERIOD_DAYS: Record<string, number | null> = {
    '1m': 30, '3m': 90, '6m': 180, '1y': 365,
    'unlimited': null, 'custom': null,
};

function computeEndDate(period: string, customDays?: number | null): Date | null {
    if (period === 'custom' && customDays) return new Date(Date.now() + customDays * 86400000);
    const days = PERIOD_DAYS[period];
    if (days === null || days === undefined) return null;
    return new Date(Date.now() + days * 86400000);
}

// ══════════════════════════════════════════════════
// Multi-Account Management
// ══════════════════════════════════════════════════

// ══════════════════════════════════════════════════
// NOTE: All account CRUD uses native MongoDB driver (not Mongoose)
// because Next.js HMR causes Mongoose model caching issues —
// fields written via Mongoose.create() sometimes get dropped.
// ══════════════════════════════════════════════════

async function getAccountsCollection() {
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error('No MongoDB connection');
    return db.collection('paperaccounts');
}

export async function listAccounts(userId: string) {
    try {
        const coll = await getAccountsCollection();
        const accounts = await coll
            .find({ userId })
            .sort({ isActive: -1, updatedAt: -1 })
            .toArray();
        return JSON.parse(JSON.stringify(accounts));
    } catch (error) {
        console.error('Error listing accounts:', error);
        return [];
    }
}

export async function createAccount(
    userId: string,
    name: string,
    initialCapital: number = DEFAULT_CAPITAL,
    tradingPeriod: string = 'unlimited',
    customPeriodDays?: number | null,
) {
    try {
        const coll = await getAccountsCollection();

        // Deactivate all existing accounts for this user
        await coll.updateMany({ userId }, { $set: { isActive: false } });

        const now = new Date();
        const endDate = computeEndDate(tradingPeriod, customPeriodDays);

        const doc = {
            userId,
            name: name.trim() || 'Default Account',
            balance: initialCapital,
            initialCapital,
            tradingPeriod,
            customPeriodDays: tradingPeriod === 'custom' ? (customPeriodDays || null) : null,
            startDate: now,
            endDate,
            isActive: true,
            createdAt: now,
            updatedAt: now,
        };

        const result = await coll.insertOne(doc);
        doc._id = result.insertedId;

        revalidatePath('/paper-trading');
        return { success: true, account: JSON.parse(JSON.stringify(doc)) };
    } catch (error) {
        console.error('Error creating account:', error);
        return { success: false, error: 'Failed to create account' };
    }
}

export async function deleteAccount(accountId: string) {
    try {
        const coll = await getAccountsCollection();
        await coll.deleteOne({ _id: new mongoose.Types.ObjectId(accountId) });
        const db = mongoose.connection.db;
        if (db) {
            await db.collection('papertrades').deleteMany({ accountId });
        }
        revalidatePath('/paper-trading');
        return { success: true };
    } catch (error) {
        console.error('Error deleting account:', error);
        return { success: false, error: 'Failed to delete account' };
    }
}

export async function switchAccount(userId: string, accountId: string) {
    try {
        const coll = await getAccountsCollection();
        // Deactivate all
        await coll.updateMany({ userId }, { $set: { isActive: false } });
        // Activate selected
        await coll.updateOne(
            { _id: new mongoose.Types.ObjectId(accountId), userId },
            { $set: { isActive: true } }
        );
        revalidatePath('/paper-trading');
        return { success: true };
    } catch (error) {
        console.error('Error switching account:', error);
        return { success: false, error: 'Failed to switch account' };
    }
}

// ══════════════════════════════════════════════════
// Account Operations (by accountId)
// ══════════════════════════════════════════════════

export async function getAccountOverview(accountId: string, userId?: string, initialCapital?: number) {
    try {
        await connectToDatabase();

        let account = await PaperAccount.findById(accountId).lean();

        // Backward compat: create default account on first visit (by userId)
        if (!account && userId) {
            account = (await PaperAccount.create({
                userId,
                name: '默认账户',
                balance: initialCapital || DEFAULT_CAPITAL,
                initialCapital: initialCapital || DEFAULT_CAPITAL,
                isActive: true,
            })).toObject();
        }

        if (!account) return null;

        // Backfill defaults
        if (!account.tradingPeriod) (account as any).tradingPeriod = 'unlimited';
        if (!account.startDate) (account as any).startDate = (account as any).createdAt;
        if ((account as any).endDate === undefined) (account as any).endDate = null;
        if ((account as any).customPeriodDays === undefined) (account as any).customPeriodDays = null;
        if (!account.name) (account as any).name = '默认账户';

        // Get holdings via native driver (bypass Mongoose model mismatch)
        const db = mongoose.connection.db;
        if (!db) throw new Error('No MongoDB connection');

        const trades = await db.collection('papertrades').aggregate([
            { $match: { accountId } },
            {
                $group: {
                    _id: '$symbol',
                    shares: { $sum: { $cond: [{ $eq: ['$type', 'BUY'] }, '$shares', { $multiply: ['$shares', -1] }] } },
                    totalBuyShares: { $sum: { $cond: [{ $eq: ['$type', 'BUY'] }, '$shares', 0] } },
                    totalBuyCost: { $sum: { $cond: [{ $eq: ['$type', 'BUY'] }, '$total', 0] } },
                    totalProceeds: { $sum: { $cond: [{ $eq: ['$type', 'SELL'] }, '$total', 0] } },
                    company: { $first: '$company' },
                }
            },
            { $match: { shares: { $gt: 0 } } }
        ]).toArray();

        return JSON.parse(JSON.stringify({
            account: {
                _id: (account as any)._id,
                balance: account.balance,
                initialCapital: account.initialCapital,
                totalInvested: account.initialCapital - account.balance,
                tradingPeriod: (account as any).tradingPeriod,
                customPeriodDays: (account as any).customPeriodDays,
                startDate: (account as any).startDate,
                endDate: (account as any).endDate,
                name: account.name,
                isActive: (account as any).isActive,
            },
            holdings: trades,
        }));
    } catch (error) {
        console.error('Error getting account overview:', error);
        return null;
    }
}

export async function getPositions(accountId: string) {
    try {
        await connectToDatabase();

        const db = mongoose.connection.db;
        if (!db) return [];

        const positions = await db.collection('papertrades').aggregate([
            { $match: { accountId } },
            {
                $group: {
                    _id: '$symbol',
                    shares: { $sum: { $cond: [{ $eq: ['$type', 'BUY'] }, '$shares', { $multiply: ['$shares', -1] }] } },
                    totalBuyShares: { $sum: { $cond: [{ $eq: ['$type', 'BUY'] }, '$shares', 0] } },
                    totalBuyCost: { $sum: { $cond: [{ $eq: ['$type', 'BUY'] }, '$total', 0] } },
                    totalProceeds: { $sum: { $cond: [{ $eq: ['$type', 'SELL'] }, '$total', 0] } },
                    company: { $first: '$company' },
                }
            },
            { $match: { shares: { $gt: 0 } } },
            { $sort: { _id: 1 } }
        ]).toArray();

        // Fetch current prices
        const { getQuote } = await import('@/lib/actions/finnhub.actions');
        const symbols = positions.map((p: any) => p._id);
        const quotes = await Promise.all(symbols.map((s: string) => getQuote(s)));

        const enriched = positions.map((pos: any, i: number) => {
            const currentPrice = quotes[i]?.c || 0;
            const roundedPrice = Math.round(currentPrice * 100) / 100;
            // avgCost = average purchase price per share (total buy cost / total buy shares)
            const avgCost = pos.totalBuyShares > 0 ? pos.totalBuyCost / pos.totalBuyShares : 0;
            // costBasis = proportional cost for remaining shares after partial sells
            const costBasis = avgCost * pos.shares;
            const marketValue = +(pos.shares * roundedPrice).toFixed(2);
            const pl = +(marketValue - costBasis).toFixed(2);
            const plPercent = costBasis > 0 ? +((pl / costBasis) * 100).toFixed(2) : 0;

            return {
                symbol: pos._id,
                company: pos.company || pos._id,
                shares: pos.shares,
                avgCost: +avgCost.toFixed(2),
                currentPrice: roundedPrice,
                marketValue,
                pl,
                plPercent,
            };
        });

        return JSON.parse(JSON.stringify(enriched));
    } catch (error) {
        console.error('Error getting positions:', error);
        return [];
    }
}

export async function getTradeHistory(accountId: string, limit = 50) {
    try {
        await connectToDatabase();
        const db = mongoose.connection.db;
        if (!db) return [];

        const trades = await db.collection('papertrades')
            .find({ accountId })
            .sort({ timestamp: -1 })
            .limit(limit)
            .toArray();

        return JSON.parse(JSON.stringify(trades));
    } catch (error) {
        console.error('Error getting trade history:', error);
        return [];
    }
}

// ══════════════════════════════════════════════════
// Trading
// ══════════════════════════════════════════════════

export async function buyStock(
    accountId: string,
    symbol: string,
    company: string,
    shares: number,
    userId?: string
) {
    try {
        await connectToDatabase();
        const db = mongoose.connection.db;
        if (!db) return { success: false, error: '数据库连接失败' };

        // Get account
        const account = await PaperAccount.findById(accountId);
        if (!account) return { success: false, error: '账户不存在' };

        // Get current price
        const { getQuote } = await import('@/lib/actions/finnhub.actions');
        const quote = await getQuote(symbol);
        const price = quote?.c || 0;
        if (!price) return { success: false, error: `无法获取 ${symbol} 的实时价格` };

        const roundedPrice = Math.round(price * 100) / 100;
        const total = Math.round(shares * roundedPrice * 100) / 100;

        if (total > account.balance) {
            return { success: false, error: `余额不足。需要 $${total.toFixed(2)}，可用 $${account.balance.toFixed(2)}` };
        }

        // Update balance
        await PaperAccount.updateOne({ _id: accountId }, { $inc: { balance: -total } });

        // Record trade
        await db.collection('papertrades').insertOne({
            accountId,
            userId: userId || account.userId,
            symbol: symbol.toUpperCase(),
            company: company || symbol,
            type: 'BUY',
            shares,
            price: roundedPrice,
            total,
            timestamp: new Date(),
        });

        revalidatePath('/paper-trading');
        return { success: true, message: `成功买入 ${shares} 股 ${symbol.toUpperCase()} @ $${roundedPrice.toFixed(2)}，总计 $${total.toFixed(2)}` };
    } catch (error) {
        console.error('Error buying stock:', error);
        return { success: false, error: '买入失败' };
    }
}

export async function sellStock(
    accountId: string,
    symbol: string,
    shares: number,
    userId?: string
) {
    try {
        await connectToDatabase();
        const db = mongoose.connection.db;
        if (!db) return { success: false, error: '数据库连接失败' };

        const account = await PaperAccount.findById(accountId);
        if (!account) return { success: false, error: '账户不存在' };

        // Check holdings
        const holding = await db.collection('papertrades').aggregate([
            { $match: { accountId, symbol: symbol.toUpperCase() } },
            {
                $group: {
                    _id: '$symbol',
                    shares: { $sum: { $cond: [{ $eq: ['$type', 'BUY'] }, '$shares', { $multiply: ['$shares', -1] }] } },
                    company: { $first: '$company' },
                }
            },
        ]).toArray();

        const held = holding[0]?.shares || 0;
        if (held < shares) {
            return { success: false, error: `持仓不足。持有 ${held} 股，尝试卖出 ${shares} 股` };
        }

        // Get current price
        const { getQuote } = await import('@/lib/actions/finnhub.actions');
        const quote = await getQuote(symbol);
        const price = quote?.c || 0;
        if (!price) return { success: false, error: `无法获取 ${symbol} 的实时价格` };

        const roundedPrice = Math.round(price * 100) / 100;
        const total = Math.round(shares * roundedPrice * 100) / 100;

        // Update balance
        await PaperAccount.updateOne({ _id: accountId }, { $inc: { balance: total } });

        // Record trade
        await db.collection('papertrades').insertOne({
            accountId,
            userId: userId || account.userId,
            symbol: symbol.toUpperCase(),
            company: holding[0]?.company || symbol,
            type: 'SELL',
            shares,
            price: roundedPrice,
            total,
            timestamp: new Date(),
        });

        revalidatePath('/paper-trading');
        return { success: true, message: `成功卖出 ${shares} 股 ${symbol.toUpperCase()} @ $${roundedPrice.toFixed(2)}，总计 $${total.toFixed(2)}` };
    } catch (error) {
        console.error('Error selling stock:', error);
        return { success: false, error: '卖出失败' };
    }
}

// ══════════════════════════════════════════════════
// Period & Reset
// ══════════════════════════════════════════════════

export async function updateTradingPeriod(
    accountId: string,
    tradingPeriod: string,
    customPeriodDays?: number | null
) {
    try {
        await connectToDatabase();
        const db = mongoose.connection.db;
        if (!db) return { success: false, error: '数据库连接失败' };

        const endDate = computeEndDate(tradingPeriod, customPeriodDays);

        const update: Record<string, any> = {
            tradingPeriod,
            startDate: new Date(),
            endDate,
        };
        if (tradingPeriod === 'custom') {
            update.customPeriodDays = customPeriodDays || null;
        } else {
            update.customPeriodDays = null;
        }

        await db.collection('paperaccounts').updateOne(
            { _id: new mongoose.Types.ObjectId(accountId) },
            { $set: update }
        );

        revalidatePath('/paper-trading');
        return { success: true };
    } catch (error) {
        console.error('Error updating trading period:', error);
        return { success: false, error: '更新失败' };
    }
}

export async function resetAccount(
    accountId: string,
    newCapital?: number,
    tradingPeriod?: string,
    userId?: string
) {
    try {
        await connectToDatabase();
        const db = mongoose.connection.db;
        if (!db) return { success: false, error: '数据库连接失败' };

        const account = await PaperAccount.findById(accountId);
        if (!account) return { success: false, error: '账户不存在' };

        const capital = newCapital || account.initialCapital;
        const period = tradingPeriod || account.tradingPeriod;

        // Delete old trades
        await db.collection('papertrades').deleteMany({ accountId });

        // Reset account
        await db.collection('paperaccounts').updateOne(
            { _id: new mongoose.Types.ObjectId(accountId) },
            {
                $set: {
                    balance: capital,
                    initialCapital: capital,
                    tradingPeriod: period,
                    customPeriodDays: period === 'custom' ? (account as any).customPeriodDays : null,
                    startDate: new Date(),
                    endDate: computeEndDate(period, (account as any).customPeriodDays),
                }
            }
        );

        revalidatePath('/paper-trading');
        return { success: true };
    } catch (error) {
        console.error('Error resetting account:', error);
        return { success: false, error: '重置失败' };
    }
}

// ══════════════════════════════════════════════════
// Backward-compat helper
// ══════════════════════════════════════════════════

export async function getOrCreateAccount(userId: string): Promise<string> {
    try {
        await connectToDatabase();
        // Find active account
        let account = await PaperAccount.findOne({ userId, isActive: true });
        if (account) return account._id.toString();

        // Find any account
        account = await PaperAccount.findOne({ userId }).sort({ updatedAt: -1 });
        if (account) {
            await PaperAccount.updateOne({ _id: account._id }, { $set: { isActive: true } });
            return account._id.toString();
        }

        // Create default
        const newAccount = await PaperAccount.create({
            userId,
            name: '默认账户',
            balance: DEFAULT_CAPITAL,
            initialCapital: DEFAULT_CAPITAL,
            isActive: true,
        });
        return newAccount._id.toString();
    } catch (error) {
        console.error('Error in getOrCreateAccount:', error);
        throw new Error('Failed to get or create account');
    }
}
