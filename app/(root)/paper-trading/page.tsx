import React from 'react';
import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getOrCreateAccount } from '@/lib/actions/paper-trading.actions';
import PaperTradingDashboard from '@/components/paper-trading/PaperTradingDashboard';

export default async function PaperTradingPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session) {
        redirect('/sign-in');
    }

    const userId = session.user.id;
    const accountId = await getOrCreateAccount(userId);

    return (
        <div className="min-h-screen bg-black text-gray-100 p-6 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Paper Trading</h1>
                    <p className="text-gray-400 mt-1">Multi-account simulation · Custom capital & period · AI-assisted trading</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-white/5 px-3 py-2 rounded-lg border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    Live prices from Finnhub
                </div>
            </div>

            {/* Dashboard */}
            <PaperTradingDashboard userId={userId} accountId={accountId} />
        </div>
    );
}
