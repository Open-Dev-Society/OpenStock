import { beforeEach, describe, expect, it, vi } from 'vitest';

// The 5-minute alert checker, run with a plain step runner: which alerts fire, which only move their saved side.

vi.mock('@/lib/inngest/client', () => ({ inngest: { createFunction: (_config: unknown, handler: unknown) => handler } }));
vi.mock('@/lib/actions/user.actions', () => ({ getAllUsersForNewsEmail: vi.fn(), getWatchlistSymbolsByEmail: vi.fn() }));
vi.mock('@/lib/ai-provider', () => ({ callAIProviderWithFallback: vi.fn() }));
vi.mock('@/database/mongoose', () => ({ connectToDatabase: vi.fn().mockResolvedValue({ connection: { db: { collection: () => ({ findOne: async () => ({ email: 'owner@example.test' }) }) } } }) }));

const sendStockAlertEmail = vi.fn();
vi.mock('@/lib/nodemailer', () => ({
    sendStockAlertEmail: (...args: unknown[]) => sendStockAlertEmail(...args),
    sendNewsSummaryEmail: vi.fn(),
    sendWelcomeEmail: vi.fn(),
}));

const quotes: Record<string, number> = {};
vi.mock('@/lib/actions/finnhub.actions', () => ({
    getNews: vi.fn(),
    getQuote: async (symbol: string) => ({ c: quotes[symbol] }),
}));

const getDailyCloses = vi.fn();
vi.mock('@/lib/sma', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/sma')>()),
    getDailyCloses: (...args: unknown[]) => getDailyCloses(...args),
}));

let stored: Record<string, unknown>[] = [];
const bulkWrite = vi.fn();
const findOneAndUpdate = vi.fn();
vi.mock('@/database/models/alert.model', () => ({
    alertModel: () => ({
        find: () => ({ lean: async () => stored }),
        bulkWrite: (...args: unknown[]) => bulkWrite(...args),
        findOneAndUpdate: (...args: unknown[]) => findOneAndUpdate(...args),
        findByIdAndUpdate: () => ({ catch: () => undefined }),
    }),
}));

import { checkStockAlertsHandler } from '@/lib/inngest/functions';

const step = { run: <T,>(_id: string, fn: () => Promise<T>) => fn() };
// 20 closes averaging 100
const closes = Array.from({ length: 20 }, (_, i) => 90.5 + i);

const smaAlert = (overrides: Record<string, unknown>) => ({
    _id: 'a1', userId: 'u1', symbol: 'AAPL', condition: 'ABOVE', target: 'SMA', smaPeriod: 20, targetPrice: 99, ...overrides,
});

describe('alert checker', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        for (const key of Object.keys(quotes)) delete quotes[key];
        getDailyCloses.mockResolvedValue({ closes, price: closes.at(-1) });
        findOneAndUpdate.mockImplementation(async (filter: unknown) => filter);
        sendStockAlertEmail.mockResolvedValue({ status: 'sent' });
    });

    it('fires an SMA alert when the price crosses the average, and says so in the email', async () => {
        stored = [smaAlert({ lastSide: 'BELOW' })];
        quotes.AAPL = 103;

        await expect(checkStockAlertsHandler({ step })).resolves.toEqual({ processed: 1, triggered: 1 });
        expect(sendStockAlertEmail).toHaveBeenCalledWith(expect.objectContaining({
            symbol: 'AAPL', currentPrice: 103, targetPrice: 100, condition: 'ABOVE', smaPeriod: 20,
        }));
        // The stored alert matches the email: the claim saves the average that was crossed
        expect(findOneAndUpdate).toHaveBeenCalledWith(
            { _id: 'a1', active: true, triggered: false },
            { $set: { triggered: true, active: false, targetPrice: 100 } },
        );
    });

    it('does not fire while the price stays on the same side, but saves the new average', async () => {
        stored = [smaAlert({ lastSide: 'ABOVE' })];
        quotes.AAPL = 103;

        await expect(checkStockAlertsHandler({ step })).resolves.toEqual({ processed: 1, triggered: 0 });
        expect(sendStockAlertEmail).not.toHaveBeenCalled();
        expect(bulkWrite).toHaveBeenCalledWith([expect.objectContaining({
            updateOne: expect.objectContaining({ update: { $set: { targetPrice: 100, lastSide: 'ABOVE' } } }),
        })]);
    });

    it('remembers the side a fresh alert starts on, so the next move across can fire', async () => {
        stored = [smaAlert({ condition: 'BELOW', lastSide: undefined })];
        quotes.AAPL = 103;

        await checkStockAlertsHandler({ step });
        expect(sendStockAlertEmail).not.toHaveBeenCalled();
        expect(bulkWrite.mock.calls[0][0][0].updateOne.update.$set.lastSide).toBe('ABOVE');
    });

    it('asks for each symbol’s closes once per run, however many alerts share it', async () => {
        stored = [smaAlert({ _id: 'a1' }), smaAlert({ _id: 'a2', smaPeriod: 20, condition: 'BELOW' }), smaAlert({ _id: 'a3', symbol: 'MSFT' })];
        quotes.AAPL = 103;
        quotes.MSFT = 103;

        await checkStockAlertsHandler({ step });
        expect(getDailyCloses).toHaveBeenCalledTimes(2);
    });

    it('leaves fixed-price alerts on the level check, without any daily closes', async () => {
        stored = [{ _id: 'p1', userId: 'u1', symbol: 'TSLA', condition: 'ABOVE', targetPrice: 200 }];
        quotes.TSLA = 250;

        await expect(checkStockAlertsHandler({ step })).resolves.toEqual({ processed: 1, triggered: 1 });
        expect(getDailyCloses).not.toHaveBeenCalled();
        expect(sendStockAlertEmail).toHaveBeenCalledWith(expect.not.objectContaining({ smaPeriod: expect.anything() }));
        expect(findOneAndUpdate).toHaveBeenCalledWith(expect.anything(), { $set: { triggered: true, active: false } });
    });
});
