'use server';

import { connectToDatabase } from '@/database/mongoose';
import { WatchlistList } from '@/database/models/watchlist-list.model';
import { TADAWUL_COMPANIES } from '@/lib/tadawul-companies';
import { tadawulDisplayName } from '@/lib/tadawul-search';
import { requireUserId } from '@/lib/better-auth/auth';
import { revalidatePath } from 'next/cache';

const DIRECTORY = new Map(TADAWUL_COMPANIES.map((c) => [c.symbol, c]));

const resolveCompany = (symbol: string) => {
    const upper = symbol.toUpperCase();
    const num = upper.startsWith('TADAWUL:') ? upper.slice('TADAWUL:'.length) : upper.split('.')[0];
    if (num === 'TASI') return 'TASI Index · تاسي';
    return DIRECTORY.get(`${num}.SR`)?.name
        ? tadawulDisplayName(DIRECTORY.get(`${num}.SR`)!)
        : upper;
};

export type WatchlistListSummary = {
    id: string;
    name: string;
    count: number;
    symbols: { symbol: string; company: string }[];
};

const toSummary = (doc: { _id: unknown; name: string; symbols: { symbol: string; company: string }[] }): WatchlistListSummary => ({
    id: String(doc._id),
    name: doc.name,
    count: doc.symbols.length,
    symbols: doc.symbols.map((s) => ({ symbol: s.symbol, company: s.company })),
});

export async function getWatchlistLists(): Promise<WatchlistListSummary[]> {
    const userId = await requireUserId();
    try {
        await connectToDatabase();
        const lists = await WatchlistList.find({ userId }).sort({ createdAt: 1 });
        return lists.map(toSummary);
    } catch (error) {
        console.error('Error fetching watchlist lists:', error);
        return [];
    }
}

export async function createWatchlistList(name: string, symbols: string[]) {
    const userId = await requireUserId();
    const clean = [...new Set(symbols.map((s) => s.toUpperCase()))].slice(0, 100);
    const docs = clean.map((symbol) => ({ symbol, company: resolveCompany(symbol), addedAt: new Date() }));
    try {
        await connectToDatabase();
        const created = await WatchlistList.findOneAndUpdate(
            { userId, name: name.trim().slice(0, 60) },
            { userId, name: name.trim().slice(0, 60), symbols: docs },
            { upsert: true, new: true },
        );
        revalidatePath('/watchlist');
        return { success: true, id: String(created._id) };
    } catch (error) {
        console.error('Error creating watchlist list:', error);
        throw new Error('Failed to create list');
    }
}

export async function deleteWatchlistList(id: string) {
    const userId = await requireUserId();
    try {
        await connectToDatabase();
        await WatchlistList.findOneAndDelete({ _id: id, userId });
        revalidatePath('/watchlist');
        return { success: true };
    } catch (error) {
        console.error('Error deleting watchlist list:', error);
        throw new Error('Failed to delete list');
    }
}
