import Link from 'next/link';
import { Star } from 'lucide-react';
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
    if (symbols.length === 0) {
        return (
            <div className="empty-state py-12">
                <span className="empty-icon"><Star className="size-5" /></span>
                <h3>“{listName}” is empty</h3>
                <p className="max-w-sm">Use “Add a stock” above, or the list button on any row of your watchlist.</p>
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
                        <th>Company</th>
                        <th className="is-num">Price</th>
                        <th className="is-num">Today</th>
                        <th className="is-num">Change</th>
                        <th className="is-num">Market cap</th>
                        <th className="w-[88px]"><span className="sr-only">Actions</span></th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.symbol}>
                            <td className="max-w-[320px]">
                                <Link href={`/stocks/${row.symbol}`} className="group flex items-center gap-3">
                                    {row.logo ? (
                                        <span className="logo-well"><img src={row.logo} alt="" className="size-full object-contain p-1" /></span>
                                    ) : (
                                        <span className="logo-well is-empty">{row.symbol[0]}</span>
                                    )}
                                    <span className="min-w-0">
                                        <span className="block truncate font-semibold text-foreground transition-colors group-hover:text-brand-ink" title={row.name}>
                                            {row.name || storedCompany.get(row.symbol)}
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
                    ))}
                </tbody>
            </table>
        </div>
    );
}
