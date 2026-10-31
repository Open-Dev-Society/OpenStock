'use server';

import { connectToDatabase } from '@/database/mongoose';
import { WatchlistList } from '@/database/models/watchlist-list.model';
import { revalidatePath } from 'next/cache';
import { requireUserId } from '@/lib/better-auth/auth';
import {
    MAX_LISTS,
    MAX_LIST_SYMBOLS,
    canAddList,
    normalizeCompany,
    normalizeListName,
    normalizeSymbol,
} from '@/lib/watchlist-lists';

export type WatchlistListSummary = {
    id: string;
    name: string;
    count: number;
    symbols: { symbol: string; company: string }[];
};

// Named lists are only shown on /watchlist, unlike the starred watchlist which the sidebar reads
// on every page — so there is no reason to revalidate the whole layout after a write here.
const revalidate = () => revalidatePath('/watchlist');

// A malformed id would make Mongoose throw a CastError; treating it as "not found" keeps a guessed
// id indistinguishable from a list the user does not own.
const isObjectId = (id: unknown): boolean => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);

const toSummary = (doc: {
    _id: unknown;
    name: string;
    symbols: readonly { symbol: string; company: string }[];
}): WatchlistListSummary => ({
    id: String(doc._id),
    name: doc.name,
    count: doc.symbols.length,
    symbols: doc.symbols.map(({ symbol, company }) => ({ symbol, company })),
});

const isDuplicateKey = (error: unknown): boolean => (error as { code?: number })?.code === 11000;

const NOT_FOUND = { error: 'That list no longer exists.' };

export async function getWatchlistLists(): Promise<WatchlistListSummary[]> {
    const userId = await requireUserId();
    try {
        await connectToDatabase();
        const lists = await WatchlistList.find({ userId }).sort({ createdAt: -1 });
        return lists.map(toSummary);
    } catch (error) {
        console.error('Error fetching named lists:', error);
        return [];
    }
}

export async function createWatchlistList(name: string): Promise<{ error: string } | WatchlistListSummary> {
    const userId = await requireUserId();
    const clean = normalizeListName(name);
    if (!clean) return { error: 'Give the list a name of up to 60 characters.' };
    try {
        await connectToDatabase();
        // The duplicate-name handler below only works if the unique index exists, which is not
        // guaranteed on a fresh deployment: init() builds it once per process, before any write.
        await WatchlistList.init();
        if (!canAddList(await WatchlistList.countDocuments({ userId }))) {
            return { error: `You can keep ${MAX_LISTS} lists. Delete one to make room.` };
        }
        if (await WatchlistList.exists({ userId, name: clean })) {
            return { error: `You already have a list called “${clean}”.` };
        }
        const created = await WatchlistList.create({ userId, name: clean, symbols: [] });
        try {
            // Two tabs can both pass the check above. The cap is enforced by rank, not by shared
            // cleanup: only the request whose own row sits beyond the cap removes a row, so two
            // racers can never delete each other and leave the user with nine lists.
            const count = await WatchlistList.countDocuments({ userId });
            if (count > MAX_LISTS) {
                const ids = await WatchlistList.find({ userId }).sort({ _id: 1 }).select('_id');
                const rank = ids.findIndex((doc) => String(doc._id) === String(created._id));
                if (rank >= MAX_LISTS) {
                    await WatchlistList.deleteOne({ _id: created._id, userId });
                    return { error: `You can keep ${MAX_LISTS} lists. Delete one to make room.` };
                }
            }
        } catch (error) {
            // The row is already persisted: remove it rather than throw with a stray list behind.
            await WatchlistList.deleteOne({ _id: created._id, userId }).catch(() => {});
            throw error;
        }
        revalidate();
        return toSummary(created);
    } catch (error) {
        // Two tabs creating the same name at once still land on the unique index.
        if (isDuplicateKey(error)) return { error: `You already have a list called “${clean}”.` };
        console.error('Error creating a named list:', error);
        throw new Error('Failed to create the list');
    }
}

export async function addSymbolToList(
    listId: string,
    symbol: string,
    company: string
): Promise<{ error: string } | { success: true }> {
    const userId = await requireUserId();
    const ticker = normalizeSymbol(symbol);
    if (!ticker) return { error: 'That is not a symbol we can look up.' };
    try {
        await connectToDatabase();
        if (!isObjectId(listId)) return NOT_FOUND;

        const entry = {
            symbol: ticker,
            company: normalizeCompany(company) || ticker,
            addedAt: new Date(),
        };

        // One atomic update, filtered by owner. The cap and the duplicate rule travel in the
        // same filter: two adds landing at once can never both pass, and a stale read can never
        // rewrite an array that already grew.
        const pushed = await WatchlistList.findOneAndUpdate(
            {
                _id: listId,
                userId,
                'symbols.symbol': { $ne: ticker },
                symbols: { $not: { $size: MAX_LIST_SYMBOLS } },
            },
            { $push: { symbols: entry } },
            { new: true }
        );
        if (pushed) {
            revalidate();
            return { success: true };
        }

        // The push missed: either the symbol is already there (replace it in place, keeping one
        // row) or the list is full or gone, which the owner-scoped read below tells apart.
        const replaced = await WatchlistList.findOneAndUpdate(
            { _id: listId, userId, 'symbols.symbol': ticker },
            { $set: { 'symbols.$.company': entry.company } },
            { new: true }
        );
        if (replaced) {
            revalidate();
            return { success: true };
        }

        const exists = await WatchlistList.findOne({ _id: listId, userId });
        if (!exists) return NOT_FOUND;
        return { error: `A list holds up to ${MAX_LIST_SYMBOLS} symbols.` };
    } catch (error) {
        console.error('Error adding a symbol to a named list:', error);
        throw new Error('Failed to add the symbol');
    }
}

export async function removeSymbolFromList(
    listId: string,
    symbol: string
): Promise<{ error: string } | { success: true }> {
    const userId = await requireUserId();
    const ticker = normalizeSymbol(symbol);
    if (!ticker) return { error: 'That is not a symbol we can look up.' };
    try {
        await connectToDatabase();
        if (!isObjectId(listId)) return NOT_FOUND;

        // $pull is idempotent and atomic; removing a symbol that is already gone is not an error.
        const updated = await WatchlistList.findOneAndUpdate(
            { _id: listId, userId },
            { $pull: { symbols: { symbol: ticker } } },
            { new: true }
        );
        if (!updated) return NOT_FOUND;
        revalidate();
        return { success: true };
    } catch (error) {
        console.error('Error removing a symbol from a named list:', error);
        throw new Error('Failed to remove the symbol');
    }
}

export async function deleteWatchlistList(listId: string): Promise<{ error: string } | { success: true }> {
    const userId = await requireUserId();
    try {
        await connectToDatabase();
        if (!isObjectId(listId)) return NOT_FOUND;
        const deleted = await WatchlistList.findOneAndDelete({ _id: listId, userId });
        if (!deleted) return NOT_FOUND;
        revalidate();
        return { success: true };
    } catch (error) {
        console.error('Error deleting a named list:', error);
        throw new Error('Failed to delete the list');
    }
}
