import { beforeEach, describe, expect, it, vi } from 'vitest';

// Server actions are public endpoints: these tests pin that alerts are always scoped to the
// signed-in user, never to an id sent by the client. Adapted from #93.

const requireUserId = vi.fn();
vi.mock('@/lib/better-auth/auth', () => ({ requireUserId: () => requireUserId(), requireUserIdForRead: () => requireUserId() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/database/mongoose', () => ({ connectToDatabase: vi.fn().mockResolvedValue({}) }));
// Alerts are an OpenStock Cloud feature; most tests run with it on
const flags = { alertsEnabled: true };
vi.mock('@/lib/market-data', () => ({ get alertsEnabled() { return flags.alertsEnabled; } }));

const findOneAndDelete = vi.fn();
const create = vi.fn();
const countDocuments = vi.fn().mockResolvedValue(0);
vi.mock('@/database/models/alert.model', () => ({
    alertModel: () => ({
        findOneAndDelete: (...args: unknown[]) => findOneAndDelete(...args),
        create: (...args: unknown[]) => create(...args),
        countDocuments: (...args: unknown[]) => countDocuments(...args),
    }),
}));

// The Finnhub quote the checker compares against
const getQuote = vi.fn();
vi.mock('@/lib/actions/finnhub.actions', () => ({ getQuote: (...args: unknown[]) => getQuote(...args) }));

// Real SMA math, canned daily closes
const getDailyCloses = vi.fn();
vi.mock('@/lib/sma', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/sma')>()),
    getDailyCloses: (...args: unknown[]) => getDailyCloses(...args),
}));

import { createAlert, deleteAlert } from '@/lib/actions/alert.actions';

describe('alert actions are scoped to the session user', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireUserId.mockResolvedValue('user-123');
        findOneAndDelete.mockResolvedValue({ _id: 'alert-1', userId: 'user-123' });
        create.mockImplementation(async (doc: unknown) => doc);
    });

    it('caps active alerts per user, counting only that user’s', async () => {
        countDocuments.mockResolvedValueOnce(50);
        await expect(createAlert({ symbol: 'AAPL', targetPrice: 200, condition: 'ABOVE' })).rejects.toThrow('up to 50 active alerts');
        expect(countDocuments).toHaveBeenCalledWith({ userId: 'user-123', active: true });
        expect(create).not.toHaveBeenCalled();
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

describe('createAlert for a moving average', () => {
    // 60 closes: the last 50 average 105, and the price (110) sits above that
    const closes = [...Array.from({ length: 10 }, () => 1), ...Array.from({ length: 50 }, (_, i) => 80.5 + i)];

    beforeEach(() => {
        vi.clearAllMocks();
        requireUserId.mockResolvedValue('user-123');
        create.mockImplementation(async (doc: unknown) => doc);
        getDailyCloses.mockResolvedValue({ closes, price: 110 });
        getQuote.mockResolvedValue({ c: 110 });
    });

    it('stores the period, the current average and the side the price is on now', async () => {
        await createAlert({ symbol: 'AAPL', condition: 'BELOW', target: 'SMA', smaPeriod: 50 });
        expect(getDailyCloses).toHaveBeenCalledWith('AAPL');
        expect(create).toHaveBeenCalledWith({
            userId: 'user-123', symbol: 'AAPL', condition: 'BELOW', active: true,
            target: 'SMA', smaPeriod: 50, targetPrice: 105, lastSide: 'ABOVE',
        });
    });

    it('ignores a target price sent with an SMA alert', async () => {
        await createAlert({ symbol: 'AAPL', condition: 'ABOVE', target: 'SMA', smaPeriod: 50, targetPrice: 1 });
        expect(create).toHaveBeenCalledWith(expect.objectContaining({ targetPrice: 105 }));
    });

    it('accepts only the listed periods', async () => {
        await expect(createAlert({ symbol: 'AAPL', condition: 'ABOVE', target: 'SMA', smaPeriod: 7 })).rejects.toThrow('Invalid moving average period');
        expect(getDailyCloses).not.toHaveBeenCalled();
    });

    it('answers with a code the modal can translate when the history is too short', async () => {
        await expect(createAlert({ symbol: 'AAPL', condition: 'ABOVE', target: 'SMA', smaPeriod: 200 })).resolves.toEqual({ error: 'notEnoughHistory' });
        getDailyCloses.mockResolvedValue({ closes: [], price: null }); // Yahoo has no data for the symbol
        await expect(createAlert({ symbol: 'AAPL', condition: 'ABOVE', target: 'SMA', smaPeriod: 20 })).resolves.toEqual({ error: 'notEnoughHistory' });
        expect(create).not.toHaveBeenCalled();
    });

    it('tells an unreachable history apart, so the modal can say to try again', async () => {
        getDailyCloses.mockResolvedValue(null);
        await expect(createAlert({ symbol: 'AAPL', condition: 'ABOVE', target: 'SMA', smaPeriod: 20 })).resolves.toEqual({ error: 'historyUnavailable' });
        expect(create).not.toHaveBeenCalled();
    });

    it('checks the alert cap before fetching any history', async () => {
        countDocuments.mockResolvedValueOnce(50);
        await expect(createAlert({ symbol: 'AAPL', condition: 'ABOVE', target: 'SMA', smaPeriod: 50 })).rejects.toThrow('up to 50 active alerts');
        expect(getDailyCloses).not.toHaveBeenCalled();
    });
});

describe('createAlert starts an SMA alert from the checker’s price', () => {
    // The last 50 closes average 105; Yahoo's cached price says 110 (above)
    const closes = Array.from({ length: 50 }, (_, i) => 80.5 + i);

    beforeEach(() => {
        vi.clearAllMocks();
        requireUserId.mockResolvedValue('user-123');
        create.mockImplementation(async (doc: unknown) => doc);
        getDailyCloses.mockResolvedValue({ closes, price: 110 });
    });

    it('takes the side from the Finnhub quote the checker uses, not Yahoo’s older price', async () => {
        getQuote.mockResolvedValue({ c: 100 }); // below the average, while Yahoo still says above
        await createAlert({ symbol: 'AAPL', condition: 'ABOVE', target: 'SMA', smaPeriod: 50 });
        expect(getQuote).toHaveBeenCalledWith('AAPL');
        expect(create).toHaveBeenCalledWith(expect.objectContaining({ lastSide: 'BELOW' }));
    });

    it('falls back to Yahoo’s price only when Finnhub has none', async () => {
        getQuote.mockResolvedValue(null);
        await createAlert({ symbol: 'AAPL', condition: 'ABOVE', target: 'SMA', smaPeriod: 50 });
        expect(create).toHaveBeenCalledWith(expect.objectContaining({ lastSide: 'ABOVE' }));
    });
});
