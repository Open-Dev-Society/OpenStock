'use client';

import { useState, useCallback, useEffect } from 'react';
import { ChevronDown, Plus, Trash2, Check } from 'lucide-react';

interface AccountInfo {
    _id: string;
    name: string;
    initialCapital: number;
    isActive: boolean;
    balance: number;
}

interface Props {
    userId: string;
    activeAccountId: string;
    onAccountChange: (accountId: string) => void;
    onAccountListChange: () => void;
}

export default function AccountSwitcher({ userId, activeAccountId, onAccountChange }: Props) {
    const [accounts, setAccounts] = useState<AccountInfo[]>([]);
    const [open, setOpen] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [creating, setCreating] = useState(false);

    const loadAccounts = useCallback(async () => {
        const { listAccounts } = await import('@/lib/actions/paper-trading.actions');
        const list = await listAccounts(userId);
        setAccounts(list);
    }, [userId]);

    useEffect(() => {
        loadAccounts();
    }, [loadAccounts]);

    const handleSwitch = async (accountId: string) => {
        const { switchAccount } = await import('@/lib/actions/paper-trading.actions');
        await switchAccount(userId, accountId);
        setOpen(false);
        onAccountChange(accountId);
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        const { createAccount } = await import('@/lib/actions/paper-trading.actions');
        const res = await createAccount(userId, newName.trim());
        setCreating(false);
        if (res.success) {
            setShowCreate(false);
            setNewName('');
            await loadAccounts();
            onAccountChange(res.account._id);
        }
    };

    const handleDelete = async (accountId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (accounts.length <= 1) return; // Can't delete last account
        const name = accounts.find(a => a._id === accountId)?.name || 'this account';
        if (!confirm(`Delete "${name}"? All trade records will be removed.`)) return;
        const { deleteAccount } = await import('@/lib/actions/paper-trading.actions');
        const res = await deleteAccount(accountId);
        if (res.success) {
            await loadAccounts();
            // Switch to first remaining account
            const remaining = accounts.filter(a => a._id !== accountId);
            if (remaining.length > 0) {
                onAccountChange(remaining[0]._id);
            }
        }
    };

    const activeAccount = accounts.find(a => a._id === activeAccountId);

    return (
        <div className="relative">
            <div className="flex items-center gap-2">
                {/* Account selector dropdown */}
                <button
                    onClick={() => setOpen(!open)}
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white transition-colors"
                >
                    <span className="font-medium">{activeAccount?.name || 'Default Account'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {/* New Account button */}
                <button
                    onClick={() => { setShowCreate(true); setOpen(false); }}
                    className="flex items-center gap-1 bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/30 rounded-lg px-2.5 py-2 text-xs text-teal-400 transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" />
                    New Account
                </button>
            </div>

            {/* Dropdown */}
            {open && (
                <div className="absolute top-full mt-1 left-0 w-64 bg-gray-900 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                    {accounts.map(acc => (
                        <div
                            key={acc._id}
                            onClick={() => handleSwitch(acc._id)}
                            className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                                acc._id === activeAccountId
                                    ? 'bg-teal-600/10 text-teal-400'
                                    : 'text-gray-300 hover:bg-white/5'
                            }`}
                        >
                            <div>
                                <p className="text-sm font-medium">{acc.name}</p>
                                <p className="text-xs text-gray-500">${acc.initialCapital.toLocaleString()} initial</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {acc._id === activeAccountId && <Check className="w-4 h-4" />}
                                {accounts.length > 1 && acc._id !== activeAccountId && (
                                    <button
                                        onClick={(e) => handleDelete(acc._id, e)}
                                        className="text-gray-600 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create dialog */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
                    <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-white">Create Account</h3>
                        <input
                            type="text"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="e.g. Aggressive Growth, Safe Haven"
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500"
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setShowCreate(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 py-2 rounded-lg text-sm transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={creating || !newName.trim()}
                                className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                {creating ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Click outside to close dropdown */}
            {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
        </div>
    );
}
