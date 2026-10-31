import { Suspense } from 'react';
import { Plus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { getUserWatchlist } from '@/lib/actions/watchlist.actions';
import { getUserAlerts } from '@/lib/actions/alert.actions';
import { alertsEnabled } from '@/lib/market-data';
import { getNews, getWatchlistData } from '@/lib/actions/finnhub.actions';
import { getWatchlistLists } from '@/lib/actions/watchlist-lists.actions';
import WatchlistTable from '@/components/watchlist/WatchlistTable';
import AlertsPanel from '@/components/watchlist/AlertsPanel';
import NewsList from '@/components/watchlist/NewsList';
import NamedListTabs from '@/components/watchlist/NamedListTabs';
import NamedListTable from '@/components/watchlist/NamedListTable';
import AddToListButton from '@/components/watchlist/AddToListButton';
import Panel from '@/components/Panel';
import { LocalizedDataFreshness } from '@/components/DataFreshness';
import { SearchButton } from '@/components/SearchCommand';

const RowsSkeleton = ({ rows = 4 }: { rows?: number }) => (
    <div className="row-list" aria-busy="true">
        {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-3.5 py-3.5">
                <span className="size-8 animate-pulse rounded-full bg-hover" />
                <span className="h-3.5 flex-1 animate-pulse rounded-md bg-hover" />
                <span className="h-3.5 w-20 animate-pulse rounded-md bg-hover" />
            </div>
        ))}
    </div>
);

async function Symbols({ symbols, lists }: { symbols: string[]; lists: { id: string; name: string }[] }) {
    return <WatchlistTable initialRows={await getWatchlistData(symbols)} lists={lists} />;
}

async function News({ symbols }: { symbols: string[] }) {
    return <NewsList news={await getNews(symbols).catch(() => [] as MarketNewsArticle[])} />;
}

// DB reads render first; everything from Finnhub streams in behind skeletons.
export default async function WatchlistPage({ searchParams }: { searchParams: Promise<{ list?: string }> }) {
    const [params, items, alerts, lists, t] = await Promise.all([
        searchParams,
        getUserWatchlist(),
        getUserAlerts(),
        getWatchlistLists(),
        getTranslations('WatchlistPage'),
    ]);
    const symbols: string[] = items.map((item: { symbol: string }) => item.symbol);
    const activeAlerts = alerts.filter((a: { triggered?: boolean }) => !a.triggered).length;
    // The selection lives in the URL, so a list is linkable and the table below can be a server component.
    const active = lists.find((list) => list.id === params.list) ?? null;
    const listOptions = lists.map(({ id, name }) => ({ id, name }));

    return (
        <>
            <header className="page-head">
                <div>
                    <h1 className="page-title">{t('title')}</h1>
                    <p className="page-sub num flex flex-wrap items-center gap-x-2">
                        {t('symbolCount', { count: symbols.length })} <span aria-hidden>·</span> <LocalizedDataFreshness />
                    </p>
                </div>
                <SearchButton className="btn btn-primary"><Plus /> {t('addSymbol')}</SearchButton>
            </header>

            <Panel
                title={t('listsTitle')}
                sub={t('listsSub')}
                action={active ? <AddToListButton listId={active.id} listName={active.name} /> : undefined}
                className="mb-3"
            >
                <NamedListTabs lists={lists} activeId={active?.id ?? null} starredCount={symbols.length} />
                {active && (
                    <Suspense fallback={<RowsSkeleton rows={Math.max(1, Math.min(active.count, 6))} />}>
                        <NamedListTable listId={active.id} listName={active.name} symbols={active.symbols} />
                    </Suspense>
                )}
            </Panel>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
                <div className="flex min-w-0 flex-col gap-3">
                    <Panel title={t('symbolsTitle')} sub={t('symbolsSub')}>
                        <Suspense fallback={<RowsSkeleton rows={Math.max(1, Math.min(symbols.length, 6))} />}>
                            <Symbols symbols={symbols} lists={listOptions} />
                        </Suspense>
                    </Panel>
                    <Panel title={t('newsTitle')} sub={symbols.length ? t('newsSubWatched') : t('newsSubGeneral')}>
                        <Suspense fallback={<RowsSkeleton />}>
                            <News symbols={symbols} />
                        </Suspense>
                    </Panel>
                </div>

                <Panel title={t('alertsTitle')} sub={alertsEnabled ? t('alertsSubActive', { count: activeAlerts }) : t('alertsSubCloud')} className="self-start">
                    <AlertsPanel alerts={alerts} />
                </Panel>
            </div>
        </>
    );
}
