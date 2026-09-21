'use server';

import { connectToDatabase } from '@/database/mongoose';
import { Alert } from '@/database/models/alert.model';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';

// Create a new alert
export async function createAlert(params: {
    userId: string;
    symbol: string;
    targetPrice: number;
    condition: 'ABOVE' | 'BELOW';
}) {
    try {
        await connectToDatabase();
        const newAlert = await Alert.create({
            ...params,
            active: true,
            // expiresAt handled by default value in schema
        });
        revalidatePath('/watchlist');
        return JSON.parse(JSON.stringify(newAlert));
    } catch (error) {
        console.error('Error creating alert:', error);
        throw new Error('Failed to create alert');
    }
}

// Get all alerts for a user
export async function getUserAlerts(userId: string) {
    try {
        await connectToDatabase();
        const alerts = await Alert.find({ userId }).sort({ createdAt: -1 });
        return JSON.parse(JSON.stringify(alerts));
    } catch (error) {
        console.error('Error fetching alerts:', error);
        return [];
    }
}

// Delete an alert belonging to the current user
export async function deleteAlert(alertId: string) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        if (!session?.user?.id) {
            throw new Error('Not authenticated');
        }

        await connectToDatabase();
        const deleted = await Alert.findOneAndDelete({
            _id: alertId,
            userId: session.user.id
        });

        if (!deleted) {
            throw new Error('Alert not found or does not belong to the current user');
        }

        revalidatePath('/watchlist');
        return { success: true };
    } catch (error) {
        console.error('Error deleting alert:', error);
        throw new Error('Failed to delete alert');
    }
}
