import React, { Suspense } from 'react';
import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserWatchlist, isStockInWatchlist, removeFromWatchlist } from '@/lib/actions/watchlist.actions';
import { getUserAlerts } from '@/lib/actions/alert.actions';
import { getNews } from '@/lib/actions/finnhub.actions';
import TradingViewWatchlist from '@/components/watchlist/TradingViewWatchlist';
import WatchlistStockChip from '@/components/watchlist/WatchlistStockChip';
import AlertsPanel from '@/components/watchlist/AlertsPanel';
import NewsGrid from '@/components/watchlist/NewsGrid';
import SearchCommand from '@/components/SearchCommand';
import { Loader2 } from 'lucide-react';

export default async function WatchlistPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session) {
        redirect('/sign-in');
    }

    const userId = session.user.id;

    // Parallel data fetching
    // Parallel data fetching
    const [watchlistItems, alerts, news] = await Promise.all([
        getUserWatchlist(userId),
        getUserAlerts(userId),
        getNews() // Initial news fetch, maybe refine later to use watchlist symbols
    ]);

    const watchlistSymbols = watchlistItems.map((item: any) => item.symbol);
    // const watchlistData = await getWatchlistData(watchlistSymbols); // OPTIMIZATION: Removed to prevent 429 errors. Widget handles data.

    // Fallback news if watchlist has items
    const relevantNews = watchlistSymbols.length > 0 ? await getNews(watchlistSymbols) : news;

    return (
        <div className="min-h-screen bg-black text-gray-100 p-6 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                        Watchlist
                    </h1>
                    <p className="text-gray-500 mt-1">Track your favorite stocks and manage alerts.</p>
                </div>
                <div className="flex items-center space-x-4">
                    <SearchCommand renderAs="button" label="Add Stock" initialStocks={[]} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Main Content - Watchlist Table */}
                <div className="lg:col-span-3 space-y-8">
                    <div className="space-y-6">
                        {/* Manage Watchlist Section */}
                        <div className="bg-gray-900/30 rounded-xl border border-gray-800 p-4 backdrop-blur-sm">
                            <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider flex items-center">
                                <span className="mr-2">Manage Symbols</span>
                                <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">{watchlistSymbols.length}</span>
                            </h3>
                            {watchlistSymbols.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {watchlistItems.map((item: any) => (
                                        <WatchlistStockChip
                                            key={item.symbol}
                                            symbol={item.symbol}
                                            userId={userId}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 italic">No stocks in watchlist.</p>
                            )}
                        </div>

                        {/* TradingView Widget */}
                        <div className="min-h-[550px]">
                            <TradingViewWatchlist symbols={watchlistSymbols} />
                        </div>
                    </div>

                    {/* News Section */}
                    <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-500" /></div>}>
                        <NewsGrid news={relevantNews || []} />
                    </Suspense>
                </div>

                {/* Sidebar - Alerts */}
                <div className="lg:col-span-1">
                    <AlertsPanel alerts={alerts} />
                </div>
            </div>
        </div>
    );
}
