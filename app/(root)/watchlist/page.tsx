import { Suspense } from 'react';
import { Plus } from 'lucide-react';
import { getUserWatchlist } from '@/lib/actions/watchlist.actions';
import { getWatchlistLists } from '@/lib/actions/watchlist-lists.actions';
import { getUserAlerts } from '@/lib/actions/alert.actions';
import { alertsEnabled } from '@/lib/market-data';
import { getNews, getWatchlistData } from '@/lib/actions/finnhub.actions';
import WatchlistTable from '@/components/watchlist/WatchlistTable';
import WatchlistListTabs from '@/components/watchlist/WatchlistListTabs';
import NamedListTable from '@/components/NamedListTable';
import AlertsPanel from '@/components/watchlist/AlertsPanel';
import NewsList from '@/components/watchlist/NewsList';
import Panel from '@/components/Panel';
import DataFreshness from '@/components/DataFreshness';
import { SearchButton } from '@/components/SearchCommand';
import { getLang } from '@/lib/i18n-server';
import { tx, type Lang } from '@/lib/i18n';

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

async function Symbols({ items, lang }: { items: { symbol: string; company: string }[]; lang: Lang }) {
    const rows = await getWatchlistData(items.map((i) => i.symbol));
    const companyOf = new Map(items.map((i) => [i.symbol, i.company]));
    return <WatchlistTable initialRows={rows.map((r) => ({ ...r, name: companyOf.get(r.symbol) || r.name }))} lang={lang} />;
}

async function News({ symbols, lang }: { symbols: string[]; lang: Lang }) {
    return <NewsList news={await getNews(symbols).catch(() => [] as MarketNewsArticle[])} lang={lang} />;
}

// DB reads render first; everything from Finnhub streams in behind skeletons.
export default async function WatchlistPage({ searchParams }: { searchParams: Promise<{ list?: string }> }) {
    const { list: listId } = await searchParams;
    const [items, alerts, lists] = await Promise.all([getUserWatchlist(), getUserAlerts(), getWatchlistLists()]);
    const activeList = lists.find((l) => l.id === listId) ?? null;
    const lang = await getLang();
    const symbols: string[] = (activeList ? activeList.symbols : items).map((item: { symbol: string }) => item.symbol);
    const activeAlerts = alerts.filter((a: { triggered?: boolean }) => !a.triggered).length;

    return (
        <>
            <header className="page-head">
                <div>
                    <h1 className="page-title">{activeList ? activeList.name : tx(lang, 'wl.title')}</h1>
                    <p className="page-sub num flex flex-wrap items-center gap-x-2">
                        {symbols.length} {tx(lang, 'wl.symbolsUnit')} <span aria-hidden>·</span> <DataFreshness />
                    </p>
                </div>
                <SearchButton className="btn btn-primary"><Plus /> {tx(lang, 'wl.addSymbol')}</SearchButton>
            </header>

            {lists.length > 0 && (
                <div className="mb-3"><WatchlistListTabs lists={lists} activeId={activeList?.id ?? null} lang={lang} /></div>
            )}

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
                <div className="flex min-w-0 flex-col gap-3">
                    <Panel title={tx(lang, 'wl.symbols')} sub={activeList ? tx(lang, 'wl.symbolsSubList') : tx(lang, 'wl.symbolsSub')}>
                        {activeList ? (
                            <NamedListTable symbols={activeList.symbols} lang={lang} />
                        ) : (
                            <Suspense fallback={<RowsSkeleton rows={Math.max(1, Math.min(symbols.length, 6))} />}>
                                <Symbols items={items} lang={lang} />
                            </Suspense>
                        )}
                    </Panel>
                    <Panel title={tx(lang, 'wl.news')} sub={symbols.length ? tx(lang, 'wl.newsSub') : tx(lang, 'wl.newsGeneral')}>
                        <Suspense fallback={<RowsSkeleton />}>
                            <News symbols={symbols} lang={lang} />
                        </Suspense>
                    </Panel>
                </div>

                {!activeList && (
                    <Panel title={tx(lang, 'wl.alerts')} sub={alertsEnabled ? tx(lang, 'wl.alertsSub').replace('{n}', String(activeAlerts)) : tx(lang, 'wl.alertsCloud')} className="self-start">
                        <AlertsPanel alerts={alerts} lang={lang} />
                    </Panel>
                )}
            </div>
        </>
    );
}
