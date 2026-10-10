export const getScannerConfig = () => ({
    timeframes: [1, 3, 5] as const,
    defaultTimeframe: 3,
    defaultVolumeMultiplier: 2,
    signalStart: "09:15",
    signalEnd: "10:00",
    maxSymbolsPerRequest: 20,
});

export function isUpstoxConfigured() {
    return Boolean(process.env.UPSTOX_ACCESS_TOKEN?.trim());
}

export function getUpstoxToken() {
    const token = process.env.UPSTOX_ACCESS_TOKEN?.trim();
    if (!token) throw new Error("UPSTOX_ACCESS_TOKEN is not configured");
    return token;
}
