'use server';

import { connectToDatabase } from '@/database/mongoose';
import { WatchlistList, type NamedListSymbol } from '@/database/models/watchlist-list.model';
import { revalidatePath } from 'next/cache';
import { requireUserId } from '@/lib/better-auth/auth';
import {
    MAX_LISTS,
    MAX_LIST_SYMBOLS,
    addSymbol,
    canAddList,
    canAddSymbol,
    normalizeCompany,
    normalizeListName,
    normalizeSymbol,
    removeSymbol,
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

const toPlain = (symbols: readonly NamedListSymbol[]) =>
    symbols.map(({ symbol, company, addedAt }) => ({ symbol, company, addedAt }));

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
        if (!canAddList(await WatchlistList.countDocuments({ userId }))) {
            return { error: `You can keep ${MAX_LISTS} lists. Delete one to make room.` };
        }
        if (await WatchlistList.exists({ userId, name: clean })) {
            return { error: `You already have a list called “${clean}”.` };
        }
        const created = await WatchlistList.create({ userId, name: clean, symbols: [] });
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
        const list = await WatchlistList.findOne({ _id: listId, userId });
        if (!list) return NOT_FOUND;

        const alreadyThere = list.symbols.some((s) => s.symbol === ticker);
        if (!alreadyThere && !canAddSymbol(list.symbols.length)) {
            return { error: `A list holds up to ${MAX_LIST_SYMBOLS} symbols.` };
        }

        const symbols = addSymbol(toPlain(list.symbols), {
            symbol: ticker,
            company: normalizeCompany(company) || ticker,
            addedAt: new Date(),
        });
        await WatchlistList.updateOne({ _id: listId, userId }, { $set: { symbols } });
        revalidate();
        return { success: true };
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
        const list = await WatchlistList.findOne({ _id: listId, userId });
        if (!list) return NOT_FOUND;

        const symbols = removeSymbol(toPlain(list.symbols), ticker);
        await WatchlistList.updateOne({ _id: listId, userId }, { $set: { symbols } });
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
