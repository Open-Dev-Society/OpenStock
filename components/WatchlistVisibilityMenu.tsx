'use client';

import { useState } from 'react';
import { Eye } from 'lucide-react';
import { useWatchlistVisibility } from '@/components/useWatchlistVisibility';
import { tx, type Lang } from '@/lib/i18n';

// Indicators-style show/hide menu for watchlist symbols. Shares one store, so
// the sidebar, terminal panel and watchlist table stay in sync.
export default function WatchlistVisibilityMenu({ items, lang }: { items: { id: string; label: string }[]; lang: Lang }) {
    const [open, setOpen] = useState(false);
    const { hidden, toggle, reset } = useWatchlistVisibility();
    const shown = items.length - items.filter((i) => hidden.includes(i.id)).length;

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className={hidden.length ? 'pill is-up' : 'pill'}
                title={tx(lang, 'wl.display')}
            >
                <Eye className="size-3.5" />
                {tx(lang, 'wl.display')}{hidden.length ? ` · ${shown}/${items.length}` : ''}
            </button>
            {open && (
                <div className="card absolute end-0 z-20 mt-1 flex max-h-72 min-w-56 flex-col gap-0.5 overflow-y-auto p-1.5">
                    {items.map((item) => {
                        const off = hidden.includes(item.id);
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => toggle(item.id)}
                                aria-pressed={!off}
                                className="search-item-link w-full"
                            >
                                <span className={`flex size-4 items-center justify-center rounded border ${off ? 'border-line-strong text-transparent' : 'border-brand-ink bg-brand-soft text-brand-ink'}`}>✓</span>
                                <span className="mono w-14 shrink-0 text-[12px] font-semibold">{item.id.replace('TADAWUL:', '')}</span>
                                <span className="flex-1 truncate text-start text-[12.5px] text-faint">{item.label}</span>
                            </button>
                        );
                    })}
                    {hidden.length > 0 && (
                        <button type="button" onClick={reset} className="search-item-link w-full">
                            <span className="flex-1 text-start text-[12.5px] text-brand-ink">{tx(lang, 'wl.showAll')}</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
