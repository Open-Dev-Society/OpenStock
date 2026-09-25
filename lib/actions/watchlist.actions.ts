'use server';

import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';
import { revalidatePath } from 'next/cache';

export type WatchlistInstrumentOptions = {
    assetClass?: 'equity' | 'crypto';
    instrumentId?: string;
    provider?: string;
    providerSymbol?: string;
    quoteCurrency?: string;
    venue?: string;
};

// -- CRUD Operations --

export async function addToWatchlist(
    userId: string,
    symbol: string,
    company: string,
    options: WatchlistInstrumentOptions = {},
) {
    try {
        await connectToDatabase();

        const normalizedSymbol = symbol.toUpperCase();
        const assetClass = options.assetClass ?? 'equity';
        const instrumentId = options.instrumentId ?? `${assetClass}:${normalizedSymbol}`;
        const identity = assetClass === 'crypto'
            ? { userId, instrumentId }
            : { userId, symbol: normalizedSymbol };

        // Upsert to avoid duplicates/errors if it already exists
        const newItem = await Watchlist.findOneAndUpdate(
            identity,
            {
                userId,
                symbol: normalizedSymbol,
                company,
                assetClass,
                instrumentId,
                provider: options.provider ?? (assetClass === 'crypto' ? 'finnhub' : undefined),
                providerSymbol: options.providerSymbol,
                quoteCurrency: options.quoteCurrency,
                venue: options.venue,
                addedAt: new Date()
            },
            { upsert: true, new: true }
        );

        revalidatePath('/watchlist');
        return JSON.parse(JSON.stringify(newItem));
    } catch (error) {
        console.error('Error adding to watchlist:', error);
        throw new Error('Failed to add to watchlist');
    }
}

export async function removeFromWatchlist(
    userId: string,
    symbol: string,
    options: Pick<WatchlistInstrumentOptions, 'instrumentId'> = {},
) {
    try {
        await connectToDatabase();
        const identity = options.instrumentId
            ? { userId, instrumentId: options.instrumentId }
            : { userId, symbol: symbol.toUpperCase() };
        await Watchlist.findOneAndDelete(identity);
        revalidatePath('/watchlist');
        revalidatePath('/'); // In case it's used elsewhere
        return { success: true };
    } catch (error) {
        console.error('Error removing from watchlist:', error);
        throw new Error('Failed to remove from watchlist');
    }
}

export async function getUserWatchlist(userId: string) {
    try {
        await connectToDatabase();
        const watchlist = await Watchlist.find({ userId }).sort({ addedAt: -1 });
        return JSON.parse(JSON.stringify(watchlist));
    } catch (error) {
        console.error('Error fetching watchlist:', error);
        return [];
    }
}

// Check if a symbol is in the user's watchlist
export async function isStockInWatchlist(userId: string, symbol: string) {
    try {
        await connectToDatabase();
        const item = await Watchlist.findOne({ userId, symbol: symbol.toUpperCase() });
        return !!item;
    } catch (error) {
        console.error('Error checking watchlist status:', error);
        return false;
    }
}

// -- Legacy Support (if needed by other components) --

export async function getWatchlistSymbolsByEmail(email: string): Promise<string[]> {
    if (!email) return [];

    try {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;
        if (!db) throw new Error('MongoDB connection not found');

        // Better Auth stores users in the "user" collection
        const user = await db.collection('user').findOne<{ _id?: unknown; id?: string; email?: string }>({ email });

        if (!user) return [];

        const userId = (user.id as string) || String(user._id || '');
        if (!userId) return [];

        const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
        return items.map((i) => String(i.symbol));
    } catch (err) {
        console.error('getWatchlistSymbolsByEmail error:', err);
        return [];
    }
}

export async function isInstrumentInWatchlist(userId: string, instrumentId: string) {
    try {
        await connectToDatabase();
        const item = await Watchlist.findOne({ userId, instrumentId });
        return !!item;
    } catch (error) {
        console.error('Error checking instrument watchlist status:', error);
        return false;
    }
}
