'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ArrowUp, ArrowDown, Plus, RotateCcw, Settings, X, CalendarClock, Clock, AlertCircle, Activity, Banknote } from 'lucide-react';
import AITradingPanel from './AITradingPanel';
import AccountSwitcher from './AccountSwitcher';
import PendingOrdersList from './PendingOrdersList';

interface Position {
    symbol: string;
    company: string;
    shares: number;
    avgCost: number;
    currentPrice: number;
    marketValue: number;
    pl: number;
    plPercent: number;
}

interface Trade {
    _id: string;
    symbol: string;
    company: string;
    type: 'BUY' | 'SELL';
    shares: number;
    price: number;
    total: number;
    timestamp: string;
}

interface AccountInfo {
    _id: string;
    balance: number;
    initialCapital: number;
    tradingPeriod: string;
    customPeriodDays: number | null;
    startDate: string;
    endDate: string | null;
    name: string;
    isActive: boolean;
}

interface AccountData {
    account: AccountInfo;
    holdings: any[];
}

const PERIOD_LABELS: Record<string, string> = {
    '1m': '1 Month', '3m': '3 Months', '6m': '6 Months', '1y': '1 Year',
    'unlimited': 'Unlimited', 'custom': 'Custom',
};

const PERIOD_OPTIONS = ['1m', '3m', '6m', '1y', 'unlimited', 'custom'] as const;

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function daysRemaining(endDateStr: string | null): number | null {
    if (!endDateStr) return null;
    const ms = new Date(endDateStr).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 86400000));
}

export default function PaperTradingDashboard({ userId, accountId }: { userId: string; accountId: string }) {
    const [currentAccountId, setCurrentAccountId] = useState(accountId);
    const [account, setAccount] = useState<AccountData | null>(null);
    const [positions, setPositions] = useState<Position[]>([]);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [buySymbol, setBuySymbol] = useState('');
    const [buyShares, setBuyShares] = useState('');
    const [sellSymbol, setSellSymbol] = useState('');
    const [sellShares, setSellShares] = useState('');
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [buyMessage, setBuyMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [sellMessage, setSellMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [loading, setLoading] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);

    // Order type for buy form
    const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT' | 'STOP'>('MARKET');
    const [limitPrice, setLimitPrice] = useState('');
    const [stopPrice, setStopPrice] = useState('');
    const [marketStatus, setMarketStatus] = useState<{ isOpen: boolean; label: string; nextOpen: string } | null>(null);

    // Order type for sell confirmation
    const [sellOrderType, setSellOrderType] = useState<'MARKET' | 'LIMIT' | 'STOP'>('MARKET');
    const [sellLimitPrice, setSellLimitPrice] = useState('');
    const [sellStopPrice, setSellStopPrice] = useState('');

    // Setup / Reset state
    const [showResetDialog, setShowResetDialog] = useState(false);
    const [setupCapital, setSetupCapital] = useState('100000');
    const [setupPeriod, setSetupPeriod] = useState('3m');
    const [editingPeriod, setEditingPeriod] = useState(false);
    const [editingCustomDays, setEditingCustomDays] = useState('');
    const [periodUpdating, setPeriodUpdating] = useState(false);

    const fetchData = useCallback(async (acctId: string) => {
        const { getAccountOverview, getPositions, getTradeHistory } = await import('@/lib/actions/paper-trading.actions');
        const [overview, pos, hist] = await Promise.all([
            getAccountOverview(acctId),
            getPositions(acctId),
            getTradeHistory(acctId),
        ]);
        setAccount(overview);
        setPositions(pos || []);
        setTrades(hist || []);
        setDataLoaded(true);
    }, []);

    useEffect(() => {
        fetchData(currentAccountId);
        // Check market status
        import('@/lib/utils/market-hours').then(({ getMarketStatus }) => {
            setMarketStatus(getMarketStatus());
        });
        // Update market status every 60s
        const marketInterval = setInterval(() => {
            import('@/lib/utils/market-hours').then(({ getMarketStatus: gms }) => {
                setMarketStatus(gms());
            });
        }, 60000);
        // Data refresh interval
        const refreshInterval = setInterval(() => fetchData(currentAccountId), 10000);
        return () => { clearInterval(refreshInterval); clearInterval(marketInterval); };
    }, [currentAccountId, fetchData]);

    const handleAccountChange = (newAccountId: string) => {
        setDataLoaded(false);
        setCurrentAccountId(newAccountId);
        setAccount(null);
        setPositions([]);
        setTrades([]);
    };

    const handleUpdatePeriod = async (period: string, customDays?: number) => {
        setPeriodUpdating(true);
        const { updateTradingPeriod } = await import('@/lib/actions/paper-trading.actions');
        const result = await updateTradingPeriod(currentAccountId, period, customDays || null);
        if (result.success) {
            const label = period === 'custom' && customDays ? `${customDays} days` : PERIOD_LABELS[period];
            setMessage({ text: `Trading period updated: ${label}`, type: 'success' });
            // Optimistic update
            const accInfo = account?.account;
            if (accInfo) {
                const PERIOD_DAYS_MAP: Record<string, number> = { '1m': 30, '3m': 90, '6m': 180, '1y': 365 };
                const newEndDate = period === 'unlimited' ? null :
                    period === 'custom' ? (customDays ? new Date(Date.now() + customDays * 86400000).toISOString() : null) :
                    PERIOD_DAYS_MAP[period] ? new Date(Date.now() + PERIOD_DAYS_MAP[period] * 86400000).toISOString() : null;
                setAccount(prev => prev ? { ...prev, account: { ...prev.account, tradingPeriod: period, customPeriodDays: period === 'custom' ? (customDays || null) : null, endDate: newEndDate as any } } : prev);
            }
            setEditingPeriod(false);
            setPeriodUpdating(false);
        } else {
            setMessage({ text: result.error || 'Update failed', type: 'error' });
            setPeriodUpdating(false);
        }
    };

    const handleBuy = async () => {
        if (!buySymbol || !buyShares) return;
        const shares = parseInt(buyShares);
        if (isNaN(shares) || shares <= 0) return;

        // Limit/Stop order → create pending order
        if (orderType === 'LIMIT' || orderType === 'STOP') {
            if ((orderType === 'LIMIT' && !limitPrice) || (orderType === 'STOP' && !stopPrice)) return;
            setLoading(true);
            setBuyMessage(null);
            const price = orderType === 'LIMIT' ? parseFloat(limitPrice) : parseFloat(stopPrice);
            if (isNaN(price) || price <= 0) { setLoading(false); return; }
            const { createPendingOrder } = await import('@/lib/actions/pending-orders.actions');
            const result = await createPendingOrder(
                currentAccountId, userId,
                buySymbol.toUpperCase(), buySymbol.toUpperCase(),
                'BUY', shares, orderType as 'LIMIT' | 'STOP',
                orderType === 'LIMIT' ? price : null,
                orderType === 'STOP' ? price : null,
            );
            setLoading(false);
            if (result.success) {
                setBuyMessage({ text: result.message || 'Order placed', type: 'success' });
                setBuySymbol(''); setBuyShares(''); setLimitPrice(''); setStopPrice('');
                fetchData(currentAccountId);
            } else {
                setBuyMessage({ text: result.error || 'Order failed', type: 'error' });
            }
            return;
        }

        // Market order → execute immediately or fallback to Market-on-Open
        setLoading(true);
        setBuyMessage(null);
        const { buyStock } = await import('@/lib/actions/paper-trading.actions');
        const { getMarketStatus } = await import('@/lib/utils/market-hours');
        const market = getMarketStatus();

        if (market.isOpen) {
            // Market is open → execute immediately
            const result = await buyStock(currentAccountId, buySymbol.toUpperCase(), buySymbol.toUpperCase(), shares);
            setLoading(false);
            if (result.success) {
                setBuyMessage({ text: result.message || 'Buy successful', type: 'success' });
                setBuySymbol(''); setBuyShares('');
                fetchData(currentAccountId);
            } else {
                setBuyMessage({ text: result.error || 'Buy failed', type: 'error' });
            }
        } else {
            // Market is closed → create Market-on-Open pending order
            const { createPendingOrder } = await import('@/lib/actions/pending-orders.actions');
            const result = await createPendingOrder(
                currentAccountId, userId,
                buySymbol.toUpperCase(), buySymbol.toUpperCase(),
                'BUY', shares, 'MARKET_ON_OPEN',
                null, null,
            );
            setLoading(false);
            if (result.success) {
                setBuyMessage({ text: `Market closed. Placed Market-on-Open order for ${shares} ${buySymbol.toUpperCase()} — will execute when market opens.`, type: 'success' });
                setBuySymbol(''); setBuyShares('');
                fetchData(currentAccountId);
            } else {
                setBuyMessage({ text: result.error || 'Failed to place order', type: 'error' });
            }
        }
    };

    const handleSell = async (symbol: string) => {
        if (!sellShares) return;
        const shares = parseInt(sellShares);
        if (isNaN(shares) || shares <= 0) return;

        // Limit/Stop sell → create pending order
        if (sellOrderType === 'LIMIT' || sellOrderType === 'STOP') {
            const price = sellOrderType === 'LIMIT' ? parseFloat(sellLimitPrice) : parseFloat(sellStopPrice);
            if (isNaN(price) || price <= 0) { setSellMessage({ text: 'Invalid price', type: 'error' }); return; }
            setLoading(true);
            setSellMessage(null);
            const { createPendingOrder } = await import('@/lib/actions/pending-orders.actions');
            const result = await createPendingOrder(
                currentAccountId, userId,
                symbol.toUpperCase(), symbol.toUpperCase(),
                'SELL', shares, sellOrderType as 'LIMIT' | 'STOP',
                sellOrderType === 'LIMIT' ? price : null,
                sellOrderType === 'STOP' ? price : null,
            );
            setLoading(false);
            if (result.success) {
                setSellMessage({ text: result.message || 'Order placed', type: 'success' });
                setSellSymbol(''); setSellShares(''); setSellLimitPrice(''); setSellStopPrice('');
                fetchData(currentAccountId);
            } else {
                setSellMessage({ text: result.error || 'Order failed', type: 'error' });
            }
            return;
        }

        // Market sell → execute or pending
        setLoading(true);
        setSellMessage(null);
        const { sellStock } = await import('@/lib/actions/paper-trading.actions');
        const { getMarketStatus } = await import('@/lib/utils/market-hours');
        const market = getMarketStatus();

        if (market.isOpen) {
            const result = await sellStock(currentAccountId, symbol.toUpperCase(), shares);
            setLoading(false);
            if (result.success) {
                setSellMessage({ text: result.message || 'Sell successful', type: 'success' });
                setSellSymbol(''); setSellShares('');
                fetchData(currentAccountId);
            } else {
                setSellMessage({ text: result.error || 'Sell failed', type: 'error' });
            }
        } else {
            const { createPendingOrder } = await import('@/lib/actions/pending-orders.actions');
            const result = await createPendingOrder(
                currentAccountId, userId,
                symbol.toUpperCase(), symbol.toUpperCase(),
                'SELL', shares, 'MARKET_ON_OPEN',
                null, null,
            );
            setLoading(false);
            if (result.success) {
                setSellMessage({ text: `Market closed. Placed Market-on-Open sell order for ${shares} ${symbol.toUpperCase()} — will execute when market opens.`, type: 'success' });
                setSellSymbol(''); setSellShares('');
                fetchData(currentAccountId);
            } else {
                setSellMessage({ text: result.error || 'Failed to place order', type: 'error' });
            }
        }
    };

    const handleReset = async () => {
        const capital = parseInt(setupCapital);
        if (isNaN(capital) || capital <= 0) return;
        setLoading(true);
        const { resetAccount } = await import('@/lib/actions/paper-trading.actions');
        await resetAccount(currentAccountId, capital, setupPeriod);
        setLoading(false);
        setShowResetDialog(false);
        setMessage({ text: `Account reset! Initial capital $${capital.toLocaleString()}, period ${PERIOD_LABELS[setupPeriod]}`, type: 'success' });
        fetchData(currentAccountId);
    };

    // Derived values
    const totalPL = positions.reduce((sum, p) => sum + p.pl, 0);
    const totalMV = positions.reduce((sum, p) => sum + p.marketValue, 0);
    const accInfo = account?.account;
    const actualTotalPL = accInfo ? (accInfo.balance + totalMV) - accInfo.initialCapital : 0;
    const remaining = daysRemaining(accInfo?.endDate ?? null);

    // ════════ LOADING ════════
    if (!dataLoaded) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-gray-500 flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-gray-600 border-t-teal-400 rounded-full animate-spin" />
                    <span>Loading...</span>
                </div>
            </div>
        );
    }

    // ════════ NO ACCOUNT ════════
    if (!account || !accInfo) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-gray-500">Unable to load account data</div>
            </div>
        );
    }

    // ════════ DASHBOARD ════════
    return (
        <div className="space-y-6">
            {/* ── Account Switcher + Toolbar ── */}
            <div className="flex items-center justify-between">
                <AccountSwitcher
                    userId={userId}
                    activeAccountId={currentAccountId}
                    onAccountChange={handleAccountChange}
                    onAccountListChange={() => {}}
                />

                <button
                    onClick={() => {
                        setSetupCapital(String(accInfo.initialCapital || 100000));
                        setSetupPeriod(accInfo.tradingPeriod || 'unlimited');
                        setShowResetDialog(true);
                    }}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-teal-500/20"
                >
                    <Settings className="w-4 h-4" />
                    Setup
                </button>
            </div>

            {/* ── General Message (period updates, resets) ── */}
            {message && (
                <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
                    message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                    {message.text}
                </div>
            )}

            {/* ── Account Summary ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-5">
                    <p className="text-gray-400 text-sm mb-1">Cash Balance</p>
                    <p className="text-2xl font-bold text-white">${accInfo.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-5">
                    <p className="text-gray-400 text-sm mb-1">Total Assets</p>
                    <p className="text-2xl font-bold text-white">${(totalMV + accInfo.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-5">
                    <p className="text-gray-400 text-sm mb-1">Total P&amp;L</p>
                    <p className={`text-2xl font-bold ${actualTotalPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {actualTotalPL >= 0 ? '+' : ''}${actualTotalPL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        <span className="text-sm ml-1">({accInfo.initialCapital ? ((actualTotalPL / accInfo.initialCapital) * 100).toFixed(2) : '0.00'}%)</span>
                    </p>
                </div>
                <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-5">
                    <p className="text-gray-400 text-sm mb-1">Period</p>
                    {editingPeriod ? (
                        <div className="space-y-2">
                            {PERIOD_OPTIONS.map(p => (
                                <button key={p}
                                    onClick={() => { if (p === 'custom' || periodUpdating) return; handleUpdatePeriod(p); }}
                                    disabled={periodUpdating}
                                    className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors disabled:opacity-50 ${p === 'custom' ? 'text-purple-400 cursor-default' : 'hover:bg-teal-600/20 text-gray-300 hover:text-white'}`}
                                >
                                    {periodUpdating && p !== 'custom' ? 'Updating...' : PERIOD_LABELS[p]}
                                </button>
                            ))}
                            <div className="flex items-center gap-2 pt-1">
                                <input type="number" value={editingCustomDays} onChange={e => setEditingCustomDays(e.target.value)} placeholder="Days" min="1" max="3650"
                                    className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-purple-500 w-20" />
                                <span className="text-gray-500 text-xs">days</span>
                                <button
                                    onClick={() => { const days = parseInt(editingCustomDays); if (days && days > 0) handleUpdatePeriod('custom', days); }}
                                    disabled={!editingCustomDays || parseInt(editingCustomDays) <= 0 || periodUpdating}
                                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                                >
                                    {periodUpdating ? '...' : 'OK'}
                                </button>
                            </div>
                            <button onClick={() => setEditingPeriod(false)} className="text-xs text-gray-500 hover:text-gray-300">Cancel</button>
                        </div>
                    ) : (
                        <div onClick={() => { setEditingCustomDays(accInfo.customPeriodDays ? String(accInfo.customPeriodDays) : ''); setEditingPeriod(true); }} className="cursor-pointer group">
                            <p className="text-xl font-bold text-white flex items-center gap-2">
                                <Clock className="w-5 h-5 text-teal-400" />
                                {accInfo.tradingPeriod === 'custom' && accInfo.customPeriodDays ? `${accInfo.customPeriodDays} days` : PERIOD_LABELS[accInfo.tradingPeriod] || 'Unlimited'}
                                <span className="text-xs text-gray-600 group-hover:text-gray-400 transition-colors ml-1">✎</span>
                            </p>
                            {remaining !== null ? (
                                <p className="text-xs text-gray-500 mt-1">{remaining} days left · ends {formatDate(accInfo.endDate)}</p>
                            ) : (
                                <p className="text-xs text-gray-600 mt-1">No end date</p>
                            )}
                        </div>
                    )}
                </div>
                <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-5">
                    <p className="text-gray-400 text-sm mb-1">Positions</p>
                    <p className="text-2xl font-bold text-white">{positions.length}</p>
                </div>
            </div>

            {/* ── AI Trading Panel ── */}
            <AITradingPanel accountId={currentAccountId} userId={userId} />

            {/* ── Buy Form ── */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-5">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-green-400" /> Buy
                    {marketStatus && (
                        <span className={`ml-auto text-xs font-normal flex items-center gap-1.5 ${
                            marketStatus.isOpen ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                            <span className={`w-2 h-2 rounded-full inline-block ${
                                marketStatus.isOpen ? 'bg-green-400' : 'bg-yellow-400'
                            }`} />
                            {marketStatus.label}
                        </span>
                    )}
                </h3>

                {/* Order Type Toggle */}
                <div className="flex gap-1 mb-4 bg-black/30 rounded-lg p-1 w-fit">
                    {(['MARKET', 'LIMIT', 'STOP'] as const).map(ot => (
                        <button
                            key={ot}
                            onClick={() => setOrderType(ot)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                orderType === ot
                                    ? 'bg-teal-600 text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {ot === 'MARKET' ? 'Market Order' : ot === 'LIMIT' ? 'Limit Order' : 'Stop Order'}
                        </button>
                    ))}
                </div>

                <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[120px]">
                        <label className="block text-xs text-gray-400 mb-1">Symbol</label>
                        <input type="text" value={buySymbol} onChange={e => setBuySymbol(e.target.value.toUpperCase())} placeholder="NVDA"
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500" />
                    </div>
                    <div className="flex-1 min-w-[80px]">
                        <label className="block text-xs text-gray-400 mb-1">Shares</label>
                        <input type="number" value={buyShares} onChange={e => setBuyShares(e.target.value)} placeholder="10" min="1"
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500" />
                    </div>

                    {/* Limit/Stop price input */}
                    {(orderType === 'LIMIT' || orderType === 'STOP') && (
                        <div className="flex-1 min-w-[100px]">
                            <label className="block text-xs text-gray-400 mb-1">
                                {orderType === 'LIMIT' ? (buyShares && limitPrice ? `Max total: $${(parseInt(buyShares || '0') * parseFloat(limitPrice || '0')).toFixed(0)}` : 'Limit Price ($)') : 'Stop Price ($)'}
                            </label>
                            <input
                                type="number"
                                value={orderType === 'LIMIT' ? limitPrice : stopPrice}
                                onChange={e => orderType === 'LIMIT' ? setLimitPrice(e.target.value) : setStopPrice(e.target.value)}
                                placeholder={orderType === 'LIMIT' ? 'Max buy price' : 'Trigger price'}
                                min="0.01" step="0.01"
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                            />
                        </div>
                    )}

                    <button
                        onClick={handleBuy}
                        disabled={loading || !buySymbol || !buyShares || (orderType === 'LIMIT' && !limitPrice) || (orderType === 'STOP' && !stopPrice)}
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        {loading ? '...' : orderType === 'MARKET' ? 'Buy' : `Place ${orderType} Order`}
                    </button>
                </div>

                {/* Market closed warning for market orders */}
                {orderType === 'MARKET' && marketStatus && !marketStatus.isOpen && (
                    <p className="mt-3 text-xs text-yellow-400 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        Market is currently closed. Your order will be placed as a <strong>Market-on-Open</strong> pending order
                        and executed automatically when the market opens.
                    </p>
                )}

                {/* Limit order hint */}
                {orderType === 'LIMIT' && (
                    <p className="mt-3 text-xs text-gray-500">
                        Limit buy: executes when price drops to <strong>${limitPrice ? parseFloat(limitPrice).toFixed(2) : '—'}</strong> or lower.
                    </p>
                )}

                {/* Stop order hint */}
                {orderType === 'STOP' && (
                    <p className="mt-3 text-xs text-gray-500">
                        Stop buy: executes when price rises above <strong>${stopPrice ? parseFloat(stopPrice).toFixed(2) : '—'}</strong> (breakout entry).
                    </p>
                )}
            </div>

            {/* ── Buy Message ── */}
            {buyMessage && (
                <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
                    buyMessage.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                    {buyMessage.text}
                </div>
            )}

            {/* ── Holdings ── */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10"><h3 className="text-lg font-semibold text-white">Holdings</h3></div>
                {positions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No positions yet. Buy some stocks to get started!</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="text-gray-400 border-b border-white/5">
                                <th className="text-left px-5 py-3 font-medium">Stock</th><th className="text-right px-5 py-3 font-medium">Shares</th>
                                <th className="text-right px-5 py-3 font-medium">Cost</th><th className="text-right px-5 py-3 font-medium">Price</th>
                                <th className="text-right px-5 py-3 font-medium">Mkt Value</th><th className="text-right px-5 py-3 font-medium">P&amp;L</th>
                                <th className="text-right px-5 py-3 font-medium">Actions</th>
                            </tr></thead>
                            <tbody className="divide-y divide-white/5">
                                {positions.map(pos => (
                                    <React.Fragment key={pos.symbol}>
                                        <tr className="hover:bg-white/5 transition-colors">
                                            <td className="px-5 py-4"><div><span className="text-white font-semibold">{pos.symbol}</span><p className="text-xs text-gray-500">{pos.company}</p></div></td>
                                            <td className="px-5 py-4 text-right text-white">{pos.shares}</td>
                                            <td className="px-5 py-4 text-right text-gray-300">${pos.avgCost.toFixed(2)}</td>
                                            <td className="px-5 py-4 text-right text-white font-mono">${pos.currentPrice.toFixed(2)}</td>
                                            <td className="px-5 py-4 text-right text-white">${pos.marketValue.toFixed(2)}</td>
                                            <td className={`px-5 py-4 text-right font-medium ${pos.pl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                <div className="flex items-center justify-end gap-1">
                                                    {pos.pl >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                                    ${Math.abs(pos.pl).toFixed(2)} ({pos.plPercent >= 0 ? '+' : ''}{pos.plPercent}%)
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <button onClick={() => {
                                                    if (sellSymbol === pos.symbol) {
                                                        // Close if already open
                                                        setSellSymbol(''); setSellShares(''); setSellLimitPrice(''); setSellStopPrice('');
                                                    } else {
                                                        setSellSymbol(pos.symbol);
                                                        setSellShares(String(pos.shares));
                                                        setSellOrderType('MARKET');
                                                        setSellLimitPrice('');
                                                        setSellStopPrice('');
                                                    }
                                                }}
                                                    className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                                                        sellSymbol === pos.symbol
                                                            ? 'bg-gray-500/20 text-gray-400'
                                                            : 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {sellSymbol === pos.symbol ? 'Cancel' : 'Sell'}
                                                </button>
                                            </td>
                                        </tr>

                                        {/* ── Inline Sell Panel (slides out below this row) ── */}
                                        {sellSymbol === pos.symbol && (
                                            <tr>
                                                <td colSpan={7} className="px-0 py-0">
                                                    <div className="bg-yellow-500/5 border-y border-yellow-500/20 px-5 py-4 mx-0 animate-slideDown">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <h4 className="text-sm font-semibold text-white">
                                                                Sell {pos.symbol}
                                                                {marketStatus && (
                                                                    <span className={`ml-2 text-xs font-normal ${
                                                                        marketStatus.isOpen ? 'text-green-400' : 'text-yellow-400'
                                                                    }`}>
                                                                        · {marketStatus.isOpen ? 'Open' : 'Closed'}
                                                                    </span>
                                                                )}
                                                            </h4>
                                                            <div className="flex gap-1 bg-black/30 rounded-lg p-0.5">
                                                                {(['MARKET', 'LIMIT', 'STOP'] as const).map(ot => (
                                                                    <button key={ot}
                                                                        onClick={() => setSellOrderType(ot)}
                                                                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                                                            sellOrderType === ot
                                                                                ? 'bg-teal-600 text-white'
                                                                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                                                        }`}
                                                                    >
                                                                        {ot === 'MARKET' ? 'Market' : ot === 'LIMIT' ? 'Limit' : 'Stop'}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-end gap-3 flex-wrap">
                                                            <div>
                                                                <label className="block text-xs text-gray-400 mb-1">Shares</label>
                                                                <input type="number" value={sellShares}
                                                                    onChange={e => setSellShares(e.target.value)}
                                                                    min="1" max={pos.shares}
                                                                    className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm w-24 focus:outline-none focus:border-teal-500" />
                                                            </div>

                                                            {(sellOrderType === 'LIMIT' || sellOrderType === 'STOP') && (
                                                                <div>
                                                                    <label className="block text-xs text-gray-400 mb-1">
                                                                        {sellOrderType === 'LIMIT' ? 'Limit Price ($)' : 'Stop Price ($)'}
                                                                    </label>
                                                                    <input type="number"
                                                                        value={sellOrderType === 'LIMIT' ? sellLimitPrice : sellStopPrice}
                                                                        onChange={e => sellOrderType === 'LIMIT' ? setSellLimitPrice(e.target.value) : setSellStopPrice(e.target.value)}
                                                                        placeholder={sellOrderType === 'LIMIT' ? 'Min sell' : 'Trigger'}
                                                                        min="0.01" step="0.01"
                                                                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm w-24 focus:outline-none focus:border-teal-500" />
                                                                </div>
                                                            )}

                                                            <button onClick={() => handleSell(pos.symbol)}
                                                                disabled={loading || (sellOrderType === 'LIMIT' && !sellLimitPrice) || (sellOrderType === 'STOP' && !sellStopPrice)}
                                                                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors">
                                                                {loading ? '...' : sellOrderType === 'MARKET' ? 'Confirm Sell' : `Place ${sellOrderType}`}
                                                            </button>
                                                            <button onClick={() => { setSellSymbol(''); setSellShares(''); setSellLimitPrice(''); setSellStopPrice(''); }}
                                                                className="text-gray-400 hover:text-white text-xs transition-colors">Cancel</button>
                                                        </div>

                                                        {/* Hints */}
                                                        {sellOrderType === 'MARKET' && marketStatus && !marketStatus.isOpen && (
                                                            <p className="mt-2 text-xs text-yellow-400 flex items-center gap-1">
                                                                <AlertCircle className="w-3 h-3" /> Market closed · Will be Market-on-Open pending order
                                                            </p>
                                                        )}
                                                        {sellOrderType === 'LIMIT' && (
                                                            <p className="mt-2 text-xs text-gray-500">
                                                                Sells when price ≥ <strong>${sellLimitPrice ? parseFloat(sellLimitPrice).toFixed(2) : '—'}</strong>
                                                            </p>
                                                        )}
                                                        {sellOrderType === 'STOP' && (
                                                            <p className="mt-2 text-xs text-gray-500">
                                                                Triggers when price ≤ <strong>${sellStopPrice ? parseFloat(sellStopPrice).toFixed(2) : '—'}</strong>
                                                            </p>
                                                        )}

                                                        {/* Sell Message */}
                                                        {sellMessage && (
                                                            <div className={`mt-3 px-3 py-2 rounded text-xs font-medium ${
                                                                sellMessage.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                                            }`}>
                                                                {sellMessage.text}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Pending Orders ── */}
            <PendingOrdersList accountId={currentAccountId} />

            {/* ── Trade History ── */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10"><h3 className="text-lg font-semibold text-white">Trade History</h3></div>
                {trades.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No trades yet</div>
                ) : (
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-black"><tr className="text-gray-400 border-b border-white/5">
                                <th className="text-left px-5 py-3 font-medium">Time</th><th className="text-left px-5 py-3 font-medium">Stock</th>
                                <th className="text-center px-5 py-3 font-medium">Type</th><th className="text-right px-5 py-3 font-medium">Shares</th>
                                <th className="text-right px-5 py-3 font-medium">Price</th><th className="text-right px-5 py-3 font-medium">Total</th>
                            </tr></thead>
                            <tbody className="divide-y divide-white/5">
                                {trades.map(t => (
                                    <tr key={t._id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-5 py-3 text-gray-400 text-xs">{new Date(t.timestamp).toLocaleString()}</td>
                                        <td className="px-5 py-3"><span className="text-white font-semibold">{t.symbol}</span>{t.company && <p className="text-xs text-gray-500">{t.company}</p>}</td>
                                        <td className="px-5 py-3 text-center"><span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${t.type === 'BUY' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{t.type === 'BUY' ? 'BUY' : 'SELL'}</span></td>
                                        <td className="px-5 py-3 text-right text-white">{t.shares}</td>
                                        <td className="px-5 py-3 text-right text-gray-300">${t.price.toFixed(2)}</td>
                                        <td className="px-5 py-3 text-right text-white font-mono">${t.total.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Reset Dialog ── */}
            {showResetDialog && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowResetDialog(false)}>
                    <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 space-y-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2"><RotateCcw className="w-5 h-5 text-red-400" />Setup Console</h2>
                            <button onClick={() => setShowResetDialog(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <p className="text-sm text-gray-400">Resetting will clear all holdings and trade history, creating a fresh account.</p>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Initial Capital</label>
                            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                                <input type="number" value={setupCapital} onChange={e => setSetupCapital(e.target.value)} min="1000" step="1000"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-3 py-3 text-white text-xl font-bold focus:outline-none focus:border-teal-500" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Trading Period</label>
                            <div className="grid grid-cols-6 gap-2">
                                {PERIOD_OPTIONS.map(p => (
                                    <button key={p} onClick={() => setSetupPeriod(p)}
                                        className={`py-2 text-sm rounded-lg font-medium transition-all ${setupPeriod === p ? 'bg-teal-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
                                        {PERIOD_LABELS[p]}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowResetDialog(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 py-3 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                            <button onClick={handleReset} disabled={loading} className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-3 rounded-lg text-sm font-semibold transition-colors">
                                {loading ? 'Resetting...' : 'Confirm Reset'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <p className="text-center text-xs text-gray-600">Auto-refresh every 10s · Data from Finnhub</p>
        </div>
    );
}
