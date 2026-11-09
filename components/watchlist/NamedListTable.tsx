import Link from 'next/link';
import { Star } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import ChangePill from '@/components/ChangePill';
import { getWatchlistData } from '@/lib/actions/finnhub.actions';
import { formatNumber, formatPrice } from '@/lib/utils';
import RemoveFromListButton from './RemoveFromListButton';

// The stocks inside one named list. Rendered on the server, so the quotes come from the same
// getWatchlistData path the starred table uses: one fetch, for the list being looked at.
export default async function NamedListTable({
    listId,
    listName,
    symbols,
}: {
    listId: string;
    listName: string;
    symbols: { symbol: string; company: string }[];
}) {
    const [t, th, tr] = await Promise.all([
        getTranslations('NamedLists'),
        getTranslations('WatchlistTable.headers'),
        getTranslations('WatchlistTableRow'),
    ]);
    if (symbols.length === 0) {
        return (
            <div className="empty-state py-12">
                <span className="empty-icon"><Star className="size-5" /></span>
                <h3>{t('emptyTitle', { list: listName })}</h3>
                <p className="max-w-sm">{t('emptyBody')}</p>
            </div>
        );
    }

    const rows = await getWatchlistData(symbols.map((s) => s.symbol));
    // The quote feed has no name for every exchange, so keep what was stored when it was added.
    const storedCompany = new Map(symbols.map((s) => [s.symbol, s.company]));

    return (
        <div className="overflow-x-auto rounded-[14px]">
            <table className="data-table">
                <thead>
                    <tr>
                        <th>{th('company')}</th>
                        <th className="is-num">{th('price')}</th>
                        <th className="is-num">{tr('today')}</th>
                        <th className="is-num">{th('change')}</th>
                        <th className="is-num">{th('marketCap')}</th>
                        <th className="w-[88px]"><span className="sr-only">{th('action')}</span></th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        // getWatchlistData falls back to the ticker when the feed has no name, so the
                        // stored company is the better label whenever the two are the same.
                        const company = row.name && row.name !== row.symbol ? row.name : storedCompany.get(row.symbol) || row.name;
                        return (
                        <tr key={row.symbol}>
                            <td className="max-w-[320px]">
                                <Link href={`/stocks/${row.symbol}`} className="group flex items-center gap-3">
                                    {row.logo ? (
                                        <span className="logo-well"><img src={row.logo} alt="" className="size-full object-contain p-1" /></span>
                                    ) : (
                                        <span className="logo-well is-empty">{row.symbol[0]}</span>
                                    )}
                                    <span className="min-w-0">
                                        <span className="block truncate font-semibold text-foreground transition-colors group-hover:text-brand-ink" title={company}>
                                            {company}
                                        </span>
                                        <span className="mono block text-[12px] text-faint">{row.symbol}</span>
                                    </span>
                                </Link>
                            </td>
                            <td className="is-num font-semibold text-foreground">{row.price ? formatPrice(row.price, row.currency) : '—'}</td>
                            <td className="is-num"><ChangePill value={row.price ? row.changePercent : null} /></td>
                            <td className="is-num text-muted-foreground">
                                {row.price ? `${row.change > 0 ? '+' : ''}${row.change.toFixed(2)}` : '—'}
                            </td>
                            <td className="is-num text-muted-foreground">{row.marketCap ? formatNumber(row.marketCap) : '—'}</td>
                            <td>
                                <div className="flex items-center justify-end gap-1">
                                    <RemoveFromListButton listId={listId} listName={listName} symbol={row.symbol} />
                                </div>
                            </td>
                        </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
