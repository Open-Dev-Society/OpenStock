/**
 * AI Trading Scheduler
 *
 * Embedded scheduler that runs inside the Next.js process.
 * Checks enabled AI trading accounts every 5 minutes during market hours.
 * runAITradeCycle itself enforces the tradingIntervalMin per-account limit.
 *
 * This is the local-development equivalent of the Inngest checkAITrading cron.
 * In production (Vercel), the Inngest cloud handles scheduling automatically.
 */

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startAITradingScheduler(): void {
    if (intervalHandle) {
        console.log('[AI-Scheduler] Already running, skipping duplicate start.');
        return;
    }

    console.log('[AI-Scheduler] Starting — checking enabled AI trading accounts every 5 minutes during market hours.');

    // Run immediately on startup, then every interval
    runCheck();
    intervalHandle = setInterval(runCheck, CHECK_INTERVAL_MS);
}

export function stopAITradingScheduler(): void {
    if (intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
        console.log('[AI-Scheduler] Stopped.');
    }
}

async function runCheck(): Promise<void> {
    try {
        const { connectToDatabase } = await import('@/database/mongoose');
        const { AITradingConfigModel } = await import('@/database/models/paper-trading.model');

        await connectToDatabase();
        const accounts = await AITradingConfigModel.find({ enabled: true, apiKey: { $ne: '' } }).lean();

        if (!accounts || accounts.length === 0) {
            return; // silent when nothing to do
        }

        console.log(`[AI-Scheduler] Found ${accounts.length} enabled account(s). Running trade cycles...`);

        for (const account of accounts as any[]) {
            try {
                const { runAITradeCycle } = await import('@/lib/actions/ai-trading.actions');
                const result = await runAITradeCycle(account.accountId);
                if (result.executed.length > 0 || result.errors.length > 0) {
                    console.log(
                        `[AI-Scheduler] ${account.accountId}:`,
                        result.executed.length > 0 ? `Executed ${result.executed.length} trades` : '',
                        result.errors.length > 0 ? `Errors: ${result.errors.join('; ')}` : ''
                    );
                }
            } catch (err: any) {
                console.error(`[AI-Scheduler] Error for account ${account.accountId}:`, err.message);
            }
        }
    } catch (err: any) {
        console.error('[AI-Scheduler] Error in check cycle:', err.message);
    }
}
