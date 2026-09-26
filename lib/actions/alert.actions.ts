'use server';

import { connectToDatabase } from '@/database/mongoose';
import { Alert } from '@/database/models/alert.model';
import { revalidatePath } from 'next/cache';
import { requireUserId } from '@/lib/better-auth/auth';
import { hasFinnhubQuotes } from '@/lib/markets';
import { alertsEnabled } from '@/lib/market-data';

// A ticker (AAPL, BRK.B) or a Binance pair. Anything else, including markup, is rejected:
// the symbol ends up in alert emails.
const SYMBOL_PATTERN = /^(BINANCE:[A-Z0-9]{2,20}|[A-Z0-9][A-Z0-9.-]{0,14})$/;
const CONDITIONS = ['ABOVE', 'BELOW'];

// Create a new alert. Server actions take untrusted input, so only validated fields are stored.
export async function createAlert(params: {
    symbol: string;
    targetPrice: number;
    condition: 'ABOVE' | 'BELOW';
}) {
    const userId = await requireUserId();
    if (!alertsEnabled) throw new Error('Price alerts are part of OpenStock Cloud');
    const symbol = String(params.symbol ?? '').trim().toUpperCase();
    const targetPrice = Number(params.targetPrice);
    const condition = params.condition;

    if (!SYMBOL_PATTERN.test(symbol)) throw new Error('Invalid symbol');
    if (!CONDITIONS.includes(condition)) throw new Error('Invalid condition');
    // The alert checker prices symbols through Finnhub, whose free plan covers US stocks and crypto
    if (!hasFinnhubQuotes(symbol)) throw new Error('Alerts are available for US stocks and crypto');
    if (!Number.isFinite(targetPrice) || targetPrice <= 0) throw new Error('Target price must be a positive number');

    try {
        await connectToDatabase();
        // expiresAt and triggered come from the schema defaults, never from the caller
        const newAlert = await Alert.create({ userId, symbol, targetPrice, condition, active: true });
        revalidatePath('/watchlist');
        return JSON.parse(JSON.stringify(newAlert));
    } catch (error) {
        console.error('Error creating alert:', error);
        throw new Error('Failed to create alert');
    }
}

// Get all alerts for a user
export async function getUserAlerts() {
    const userId = await requireUserId();
    try {
        await connectToDatabase();
        const alerts = await Alert.find({ userId }).sort({ createdAt: -1 });
        return JSON.parse(JSON.stringify(alerts));
    } catch (error) {
        console.error('Error fetching alerts:', error);
        return [];
    }
}

// Delete an alert
export async function deleteAlert(alertId: string) {
    const userId = await requireUserId();
    try {
        await connectToDatabase();
        await Alert.findOneAndDelete({ _id: alertId, userId });
        revalidatePath('/watchlist');
        return { success: true };
    } catch (error) {
        console.error('Error deleting alert:', error);
        throw new Error('Failed to delete alert');
    }
}
