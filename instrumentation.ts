// This file is compiled for both Node.js and Edge Runtimes.
// NEXT_RUNTIME is a compile-time constant — the bundler evaluates
// the condition and tree-shakes the unused branch.
// Edge Runtime doesn't support Node.js built-in modules (fs, path),
// so we only start the scheduler in the Node.js bundle.

if (process.env.NEXT_RUNTIME !== 'edge' && process.env.NODE_ENV === 'development') {
    const { startAITradingScheduler } = await import('./lib/ai-trading-scheduler');
    startAITradingScheduler();
}

export async function register() {
    // register() is required by Next.js but the scheduler is
    // already started at the module level above.
}
