import { beforeEach, describe, expect, it, vi } from 'vitest';

// Server actions are public endpoints. These tests pin two things the UI cannot prove:
// every write is scoped to the signed-in user in the query itself, and an add is one atomic
// update — never read-array, rewrite-array, which loses a concurrent add.

const requireUserId = vi.fn();
vi.mock('@/lib/better-auth/auth', () => ({ requireUserId: () => requireUserId() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/database/mongoose', () => ({ connectToDatabase: vi.fn().mockResolvedValue({}) }));

const findOneAndUpdate = vi.fn();
const findOne = vi.fn();
const updateOne = vi.fn();
vi.mock('@/database/models/watchlist-list.model', () => ({
    WatchlistList: {
        findOneAndUpdate: (...args: unknown[]) => findOneAndUpdate(...args),
        findOne: (...args: unknown[]) => findOne(...args),
        updateOne: (...args: unknown[]) => updateOne(...args),
    },
}));

import { addSymbolToList, removeSymbolFromList } from '@/lib/actions/watchlist-lists.actions';
import { MAX_LIST_SYMBOLS } from '@/lib/watchlist-lists';

const LIST_ID = '6ae5ddcacd4956020465901d';
const USER = 'user-123';

describe('named list writes are scoped and atomic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireUserId.mockResolvedValue(USER);
    });

    it('pushes the symbol in a single update filtered by owner', async () => {
        findOneAndUpdate.mockResolvedValueOnce({ _id: LIST_ID });

        await expect(addSymbolToList(LIST_ID, 'aapl', 'Apple Inc.')).resolves.toEqual({ success: true });

        const [filter, update] = findOneAndUpdate.mock.calls[0];
        expect(filter).toMatchObject({ _id: LIST_ID, userId: USER, 'symbols.symbol': { $ne: 'AAPL' } });
        // The cap travels in the same filter, so two adds at the boundary cannot both land.
        expect(filter.symbols).toEqual({ $not: { $size: MAX_LIST_SYMBOLS } });
        expect(update).toMatchObject({ $push: { symbols: { symbol: 'AAPL' } } });
        // The read-array/rewrite-array path would lose a concurrent add.
        expect(updateOne).not.toHaveBeenCalled();
        expect(findOne).not.toHaveBeenCalled();
    });

    it('replaces an existing symbol in place instead of duplicating it', async () => {
        findOneAndUpdate.mockResolvedValueOnce(null).mockResolvedValueOnce({ _id: LIST_ID });

        await expect(addSymbolToList(LIST_ID, 'AAPL', 'Apple Inc.')).resolves.toEqual({ success: true });

        const [filter, update] = findOneAndUpdate.mock.calls[1];
        expect(filter).toMatchObject({ _id: LIST_ID, userId: USER, 'symbols.symbol': 'AAPL' });
        expect(update).toEqual({ $set: { 'symbols.$.company': 'Apple Inc.', 'symbols.$.addedAt': expect.any(Date) } });
        expect(updateOne).not.toHaveBeenCalled();
    });

    it('treats a list owned by someone else as missing, and writes nothing', async () => {
        findOneAndUpdate.mockResolvedValue(null); // neither the push nor the replace matches
        findOne.mockResolvedValue(null); // and no list with that id belongs to this user

        await expect(addSymbolToList(LIST_ID, 'AAPL', 'Apple Inc.')).resolves.toEqual({
            error: 'That list no longer exists.',
        });
        expect(findOne).toHaveBeenCalledWith({ _id: LIST_ID, userId: USER });
        expect(updateOne).not.toHaveBeenCalled();
    });

    it('refuses the symbol past the cap with a readable error', async () => {
        findOneAndUpdate.mockResolvedValue(null);
        findOne.mockResolvedValue({ _id: LIST_ID, symbols: new Array(MAX_LIST_SYMBOLS).fill({ symbol: 'X' }) });

        await expect(addSymbolToList(LIST_ID, 'AAPL', 'Apple Inc.')).resolves.toEqual({
            error: `A list holds up to ${MAX_LIST_SYMBOLS} symbols.`,
        });
        expect(updateOne).not.toHaveBeenCalled();
    });

    it('removes with one $pull filtered by owner', async () => {
        findOneAndUpdate.mockResolvedValueOnce({ _id: LIST_ID });

        await expect(removeSymbolFromList(LIST_ID, 'msft')).resolves.toEqual({ success: true });

        expect(findOneAndUpdate).toHaveBeenCalledWith(
            { _id: LIST_ID, userId: USER },
            { $pull: { symbols: { symbol: 'MSFT' } } },
            { new: true }
        );
        expect(updateOne).not.toHaveBeenCalled();
    });

    it('cannot remove from a list the session user does not own', async () => {
        findOneAndUpdate.mockResolvedValueOnce(null);

        await expect(removeSymbolFromList(LIST_ID, 'MSFT')).resolves.toEqual({
            error: 'That list no longer exists.',
        });
        expect(findOneAndUpdate.mock.calls[0][0]).toMatchObject({ userId: USER });
    });

    it('rejects a malformed list id before touching the database', async () => {
        await expect(addSymbolToList('not-an-id', 'AAPL', 'Apple Inc.')).resolves.toEqual({
            error: 'That list no longer exists.',
        });
        expect(findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('rejects a symbol the starred watchlist would also reject', async () => {
        await expect(addSymbolToList(LIST_ID, 'AAPL;DROP', 'x')).resolves.toEqual({
            error: 'That is not a symbol we can look up.',
        });
        expect(findOneAndUpdate).not.toHaveBeenCalled();
    });
});
