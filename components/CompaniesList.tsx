'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { TadawulCompany } from '@/lib/tadawul-companies';
import { tadawulDisplayName } from '@/lib/tadawul-search';
import { tx, type Lang } from '@/lib/i18n';

// Full browsable Tadawul directory with instant client-side filtering (Latin + Arabic).
export default function CompaniesList({ companies, lang }: { companies: TadawulCompany[]; lang: Lang }) {
    const [query, setQuery] = useState('');
    const filtered = useMemo(() => {
        const q = query.trim().toUpperCase();
        if (!q) return companies;
        const digits = q.replace(/[^0-9]/g, '');
        return companies.filter(
            (c) =>
                c.symbol.toUpperCase().includes(digits || q) ||
                c.name.toUpperCase().includes(q) ||
                (c.ar || '').toUpperCase().includes(q),
        );
    }, [companies, query]);

    return (
        <div>
            <div className="search-field mb-2">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={tx(lang, 'co.filter')}
                    className="search-input"
                    aria-label="Filter companies"
                />
            </div>
            <p className="search-count px-1 pb-1">
                {tx(lang, 'co.title')} <span className="num"> · {filtered.length}</span>
            </p>
            <ul className="row-list">
                {filtered.map((c) => (
                    <li key={c.symbol}>
                        <Link href={`/stocks/${c.symbol}`} className="search-item-link group">
                            <span className="mono w-20 shrink-0 text-[13px] font-semibold text-brand-ink">{c.symbol}</span>
                            <span className="search-item-name flex-1">{tadawulDisplayName(c)}</span>
                            <ArrowUpRight className="size-4 text-faint opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                    </li>
                ))}
                {filtered.length === 0 && (
                    <li className="search-list-indicator">{tx(lang, 'search.noMatch')} “{query.trim()}”</li>
                )}
            </ul>
        </div>
    );
}
