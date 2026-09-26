import { beforeEach, describe, expect, it, vi } from 'vitest';

// Server actions are public endpoints: these tests pin that alerts are always scoped to the
// signed-in user, never to an id sent by the client. Adapted from #93.

const requireUserId = vi.fn();
vi.mock('@/lib/better-auth/auth', () => ({ requireUserId: () => requireUserId() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/database/mongoose', () => ({ connectToDatabase: vi.fn().mockResolvedValue({}) }));
// Alerts are an OpenStock Cloud feature; most tests run with it on
const flags = { alertsEnabled: true };
vi.mock('@/lib/market-data', () => ({ get alertsEnabled() { return flags.alertsEnabled; } }));

const findOneAndDelete = vi.fn();
const create = vi.fn();
vi.mock('@/database/models/alert.model', () => ({
    Alert: {
        findOneAndDelete: (...args: unknown[]) => findOneAndDelete(...args),
        create: (...args: unknown[]) => create(...args),
    },
}));

import { createAlert, deleteAlert } from '@/lib/actions/alert.actions';

describe('alert actions are scoped to the session user', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireUserId.mockResolvedValue('user-123');
        findOneAndDelete.mockResolvedValue({ _id: 'alert-1', userId: 'user-123' });
        create.mockImplementation(async (doc: unknown) => doc);
    });

    it('deletes the user’s own alert', async () => {
        await expect(deleteAlert('alert-1')).resolves.toEqual({ success: true });
        expect(findOneAndDelete).toHaveBeenCalledWith({ _id: 'alert-1', userId: 'user-123' });
    });

    it('rejects signed-out calls before touching the database', async () => {
        requireUserId.mockRejectedValue(new Error('Unauthorized'));
        await expect(deleteAlert('alert-1')).rejects.toThrow('Unauthorized');
        expect(findOneAndDelete).not.toHaveBeenCalled();
    });

    it('cannot delete another user’s alert: the query always carries the session user', async () => {
        findOneAndDelete.mockResolvedValue(null); // someone else's alert matches nothing
        await deleteAlert('alert-of-someone-else');
        expect(findOneAndDelete).toHaveBeenCalledWith({ _id: 'alert-of-someone-else', userId: 'user-123' });
    });

    it('creates alerts for the session user, ignoring any userId sent by the client', async () => {
        await createAlert({ symbol: 'AAPL', targetPrice: 200, condition: 'ABOVE', userId: 'attacker' } as never);
        expect(create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-123', symbol: 'AAPL' }));
    });

    it('refuses new alerts where Cloud features are off', async () => {
        flags.alertsEnabled = false;
        try {
            await expect(createAlert({ symbol: 'AAPL', targetPrice: 200, condition: 'ABOVE' })).rejects.toThrow('OpenStock Cloud');
            expect(create).not.toHaveBeenCalled();
        } finally {
            flags.alertsEnabled = true;
        }
    });

    it('refuses alerts the checker could never price', async () => {
        await expect(createAlert({ symbol: 'RELIANCE.NS', targetPrice: 1000, condition: 'ABOVE' })).rejects.toThrow('US stocks and crypto');
        expect(create).not.toHaveBeenCalled();
    });
});

describe('createAlert validates untrusted input', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireUserId.mockResolvedValue('user-123');
        create.mockImplementation(async (doc: unknown) => doc);
    });

    it('rejects symbols that could carry markup into alert emails', async () => {
        await expect(createAlert({ symbol: '<img src=x>', targetPrice: 1, condition: 'ABOVE' })).rejects.toThrow('Invalid symbol');
        expect(create).not.toHaveBeenCalled();
    });

    it('rejects unknown conditions', async () => {
        await expect(createAlert({ symbol: 'AAPL', targetPrice: 1, condition: 'SIDEWAYS' as never })).rejects.toThrow('Invalid condition');
    });

    it('stores only validated fields, so callers cannot pre-trigger or extend an alert', async () => {
        await createAlert({ symbol: ' brk.b ', targetPrice: 400, condition: 'BELOW', triggered: true, expiresAt: new Date(2100, 0) } as never);
        expect(create).toHaveBeenCalledWith({ userId: 'user-123', symbol: 'BRK.B', targetPrice: 400, condition: 'BELOW', active: true });
    });
});
