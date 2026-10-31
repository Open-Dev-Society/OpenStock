'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createWatchlistList, deleteWatchlistList, type WatchlistListSummary } from '@/lib/actions/watchlist-lists.actions';
import { cn } from '@/lib/utils';

// Tabs across the starred list and the named ones. The selection lives in the URL (?list=…), so the
// panel below can stay a server component and fetch quotes for the one list being looked at.
export default function NamedListTabs({
    lists,
    activeId,
    starredCount,
}: {
    lists: WatchlistListSummary[];
    activeId: string | null;
    starredCount: number;
}) {
    const router = useRouter();
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const active = lists.find((l) => l.id === activeId) ?? null;

    const create = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        try {
            const result = await createWatchlistList(name);
            if ('error' in result) {
                toast.error(result.error);
                return;
            }
            setName('');
            router.push(`/watchlist?list=${result.id}`);
            router.refresh();
        } catch {
            toast.error('Couldn’t create the list');
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!active || busy) return;
        if (!window.confirm(`Delete the list “${active.name}”? The stocks you starred are not affected.`)) return;
        setBusy(true);
        try {
            const result = await deleteWatchlistList(active.id);
            if ('error' in result) {
                toast.error(result.error);
                return;
            }
            router.push('/watchlist');
            router.refresh();
        } catch {
            toast.error('Couldn’t delete the list');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-1.5 px-1 pb-1">
            <Link href="/watchlist" className={cn('pill h-8', !activeId && 'is-up')}>
                <Star className="size-3.5" /> Starred <span className="num">· {starredCount}</span>
            </Link>

            {lists.map((list) => (
                <Link key={list.id} href={`/watchlist?list=${list.id}`} className={cn('pill h-8', activeId === list.id && 'is-up')}>
                    {list.name} <span className="num">· {list.count}</span>
                </Link>
            ))}

            {active && (
                <button type="button" onClick={remove} disabled={busy} className="pill h-8 is-danger" title={`Delete ${active.name}`}>
                    <Trash2 className="size-3.5" /> Delete
                </button>
            )}

            <form onSubmit={create} className="flex items-center gap-1.5">
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="New list name"
                    aria-label="New list name"
                    maxLength={60}
                    className="h-8 w-40 rounded-full bg-page px-3 text-[13px] shadow-[inset_0_0_0_1px_var(--line)] outline-none placeholder:text-faint focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button type="submit" disabled={busy || !name.trim()} className="pill h-8" title="Create the list">
                    <Plus className="size-3.5" /> Create
                </button>
            </form>
        </div>
    );
}
