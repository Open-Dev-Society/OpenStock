'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, Trash2 } from 'lucide-react';
import { deleteWatchlistList, type WatchlistListSummary } from '@/lib/actions/watchlist-lists.actions';
import { cn } from '@/lib/utils';
import { tx, type Lang } from '@/lib/i18n';

// Tabs across the default list and named lists, with delete for named ones.
export default function WatchlistListTabs({ lists, activeId, lang }: { lists: WatchlistListSummary[]; activeId: string | null; lang: Lang }) {
    const router = useRouter();
    const [deleting, setDeleting] = useState(false);
    const active = lists.find((l) => l.id === activeId);

    const onDelete = async () => {
        if (!active || deleting) return;
        if (!window.confirm(tx(lang, 'wl.confirmDelete').replace('{name}', active.name))) return;
        setDeleting(true);
        try {
            await deleteWatchlistList(active.id);
            router.push('/watchlist');
            router.refresh();
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            <Link href="/watchlist" className={cn('pill', !activeId ? 'is-up' : '')}>
                <Star className="size-3" /> {tx(lang, 'wl.mine')}
            </Link>
            {lists.map((l) => (
                <Link key={l.id} href={`/watchlist?list=${l.id}`} className={cn('pill', activeId === l.id ? 'is-up' : '')}>
                    {l.name} <span className="num">· {l.count}</span>
                </Link>
            ))}
            {active && (
                <button type="button" onClick={onDelete} disabled={deleting} className="pill" title={`${tx(lang, 'wl.delete')} ${active.name}`}>
                    <Trash2 className="size-3" /> {deleting ? tx(lang, 'wl.deleting') : tx(lang, 'wl.delete')}
                </button>
            )}
        </div>
    );
}
