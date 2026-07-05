'use client';

import React, { useEffect, useState } from 'react';
import { Clock, X, Loader2, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import type { PendingOrder as PendingOrderType } from '@/lib/actions/pending-orders.actions';

export default function PendingOrdersList({ accountId }: { accountId: string }) {
    const [orders, setOrders] = useState<PendingOrderType[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState<string | null>(null);

    const fetchOrders = async () => {
        const { getPendingOrders } = await import('@/lib/actions/pending-orders.actions');
        const data = await getPendingOrders(accountId);
        setOrders(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 15000); // Refresh every 15s
        return () => clearInterval(interval);
    }, [accountId]);

    const handleCancel = async (orderId: string) => {
        setCancelling(orderId);
        const { cancelPendingOrder } = await import('@/lib/actions/pending-orders.actions');
        await cancelPendingOrder(orderId);
        setCancelling(null);
        fetchOrders();
    };

    if (loading) return null;
    if (orders.length === 0) return null;

    const orderTypeLabel = (o: PendingOrderType): string => {
        switch (o.orderType) {
            case 'LIMIT': return o.type === 'BUY' ? `Limit Buy ≤ $${o.limitPrice?.toFixed(2)}` : `Limit Sell ≥ $${o.limitPrice?.toFixed(2)}`;
            case 'STOP': return o.type === 'BUY' ? `Stop Buy ≥ $${o.stopPrice?.toFixed(2)}` : `Stop Loss ≤ $${o.stopPrice?.toFixed(2)}`;
            case 'MARKET_ON_OPEN': return 'Market-on-Open';
            default: return o.orderType || 'Unknown';
        }
    };

    return (
        <div className="bg-yellow-500/5 backdrop-blur-md rounded-xl border border-yellow-500/20 overflow-hidden">
            <div className="px-5 py-4 border-b border-yellow-500/10 flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-400" />
                <h3 className="text-md font-semibold text-white">Pending Orders</h3>
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">{orders.length}</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-gray-400 border-b border-yellow-500/5">
                            <th className="text-left px-5 py-3 font-medium">Order</th>
                            <th className="text-left px-5 py-3 font-medium">Stock</th>
                            <th className="text-right px-5 py-3 font-medium">Shares</th>
                            <th className="text-left px-5 py-3 font-medium">Condition</th>
                            <th className="text-left px-5 py-3 font-medium">Status</th>
                            <th className="text-right px-5 py-3 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-yellow-500/5">
                        {orders.map(order => (
                            <tr key={order._id} className="hover:bg-white/5 transition-colors">
                                <td className="px-5 py-4">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                        order.type === 'BUY'
                                            ? 'bg-green-500/10 text-green-400'
                                            : 'bg-red-500/10 text-red-400'
                                    }`}>
                                        {order.type === 'BUY' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                        {order.type}
                                    </span>
                                </td>
                                <td className="px-5 py-4">
                                    <span className="text-white font-semibold">{order.symbol}</span>
                                    <p className="text-xs text-gray-500">{order.company}</p>
                                </td>
                                <td className="px-5 py-4 text-right text-white">{order.shares}</td>
                                <td className="px-5 py-4">
                                    <span className="text-gray-300 text-xs font-mono">{orderTypeLabel(order)}</span>
                                </td>
                                <td className="px-5 py-4">
                                    {order.status === 'PENDING' ? (
                                        <span className="inline-flex items-center gap-1 text-yellow-400 text-xs">
                                            <Clock className="w-3 h-3" /> Pending
                                        </span>
                                    ) : order.status === 'FAILED' ? (
                                        <span className="inline-flex items-center gap-1 text-red-400 text-xs" title={order.failReason || ''}>
                                            <AlertCircle className="w-3 h-3" /> Failed
                                        </span>
                                    ) : null}
                                </td>
                                <td className="px-5 py-4 text-right">
                                    {order.status === 'PENDING' ? (
                                        <button
                                            onClick={() => handleCancel(order._id)}
                                            disabled={cancelling === order._id}
                                            className="inline-flex items-center gap-1 text-xs bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 px-2.5 py-1.5 rounded-md transition-colors disabled:opacity-50"
                                        >
                                            {cancelling === order._id ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <X className="w-3 h-3" />
                                            )}
                                            Cancel
                                        </button>
                                    ) : (
                                        <span className="text-xs text-gray-600">—</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
