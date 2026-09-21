import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock auth BEFORE importing the action
vi.mock('@/lib/better-auth/auth', () => ({
    auth: { api: { getSession: vi.fn() } },
}));

// Mock headers
vi.mock('next/headers', () => ({
    headers: vi.fn(() => Promise.resolve(new Headers())),
}));

// Mock revalidatePath
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

// Mock mongoose connection
vi.mock('@/database/mongoose', () => ({
    connectToDatabase: vi.fn().mockResolvedValue({}),
}));

// Mock Alert model
const findOneAndDelete = vi.fn();
vi.mock('@/database/models/alert.model', () => ({
    Alert: { findOneAndDelete: (...args: unknown[]) => findOneAndDelete(...args) },
}));

import { deleteAlert } from '@/lib/actions/alert.actions';
import { auth } from '@/lib/better-auth/auth';

const getSession = vi.mocked(auth.api.getSession);

describe('deleteAlert (IDOR fix)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getSession.mockResolvedValue({
            user: {
                id: 'user-123',
                createdAt: new Date(),
                updatedAt: new Date(),
                email: 'test@example.com',
                emailVerified: true,
                name: 'Test User',
            },
            session: {
                id: 'sess-1',
                createdAt: new Date(),
                updatedAt: new Date(),
                userId: 'user-123',
                expiresAt: new Date(Date.now() + 86400000),
                token: 'tok',
            },
        });
        findOneAndDelete.mockResolvedValue({ _id: 'alert-1', userId: 'user-123' });
    });

    it('deletes own alert successfully', async () => {
        const result = await deleteAlert('alert-1');
        expect(result).toEqual({ success: true });
        expect(findOneAndDelete).toHaveBeenCalledWith({
            _id: 'alert-1',
            userId: 'user-123',
        });
    });

    it('throws when not authenticated', async () => {
        getSession.mockResolvedValue(null);
        await expect(deleteAlert('alert-1')).rejects.toThrow('Failed to delete alert');
        // Should NOT call the DB when unauthenticated
        expect(findOneAndDelete).not.toHaveBeenCalled();
    });

    it('throws and does NOT delete when the alert belongs to another user', async () => {
        findOneAndDelete.mockResolvedValue(null); // other user's alert -> nothing deleted
        await expect(deleteAlert('alert-other')).rejects.toThrow('Failed to delete alert');
        // Verify the DB WOULD have been queried with the session user's id,
        // not with a client-supplied id
        expect(findOneAndDelete).toHaveBeenCalledWith({
            _id: 'alert-other',
            userId: 'user-123', // <-- uses session user, not attacker-supplied
        });
    });
});
