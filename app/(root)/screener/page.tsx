import { Suspense } from 'react';
import Panel from '@/components/Panel';
import SetupsLiveTable from '@/components/SetupsLiveTable';
import { scanMarket, scanRsiBand } from '@/lib/actions/screener.actions';
import { parseBand } from '@/lib/setup-scan';
import { getLang } from '@/lib/i18n-server';
import { tx } from '@/lib/i18n';

export const metadata = { title: 'Sunday setups | OpenStock' };

const ScanSkeleton = () => (
    <div className="row-list" aria-busy="true">
        {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-3.5 py-3.5">
                <span className="h-3.5 w-16 animate-pulse rounded-md bg-hover" />
                <span className="h-3.5 flex-1 animate-pulse rounded-md bg-hover" />
                <span className="h-3.5 w-20 animate-pulse rounded-md bg-hover" />
            </div>
        ))}
    </div>
);

async function Results({ band }: { band: [number, number] | null }) {
    const lang = await getLang();
    if (band) {
        const { rows, scanned } = await scanRsiBand(band[0], band[1]);
        if (rows.length === 0) {
            return <p className="search-list-indicator">{tx(lang, 'screen.empty')}</p>;
        }
        return (
            <>
                <SetupsLiveTable rows={rows} lang={lang} />
                <p className="px-3 py-2 text-[11.5px] text-faint">
                    {tx(lang, 'screen.foot').replace('{n}', String(scanned))}
                </p>
            </>
        );
    }
    const { rows, scanned } = await scanMarket(25);
    if (rows.length === 0) {
        return <p className="search-list-indicator">{tx(lang, 'screen.empty')}</p>;
    }
    return (
        <>
            <SetupsLiveTable rows={rows} lang={lang} />
            <p className="px-3 py-2 text-[11.5px] text-faint">
                {tx(lang, 'screen.foot').replace('{n}', String(scanned))}
            </p>
        </>
    );
}

// Ranks every Tadawul stock by setup strength (oversold, MACD cross, trend,
// stochastic cross, near-high, volume). Cold scan takes ~30s, then cached hourly.
// ?rsiMin=&rsiMax= switches to an up-day + RSI band filter instead.
export default async function ScreenerPage({ searchParams }: { searchParams: Promise<{ rsiMin?: string; rsiMax?: string }> }) {
    const lang = await getLang();
    const { rsiMin, rsiMax } = await searchParams;
    const band = parseBand(rsiMin, rsiMax);
    return (
        <>
            <header className="page-head">
                <div>
                    <h1 className="page-title">{tx(lang, 'screen.title')}</h1>
                    <p className="page-sub">{tx(lang, 'screen.sub')}</p>
                </div>
            </header>
            <Panel
                title={band ? tx(lang, 'screen.bandTitle') : tx(lang, 'screen.top')}
                sub={band ? tx(lang, 'screen.bandSub').replace('{lo}', String(band[0])).replace('{hi}', String(band[1])) : tx(lang, 'screen.tapRow')}
                action={
                    <form action="/screener" method="GET" className="flex items-center gap-1.5">
                        <label className="text-[11.5px] text-faint">
                            {tx(lang, 'screen.rsiFrom')}{' '}
                            <input
                                type="number" name="rsiMin" min={0} max={100}
                                defaultValue={band ? band[0] : 25}
                                className="num h-8 w-14 rounded-[9px] border border-line bg-page px-2 text-[12.5px] text-foreground outline-none"
                            />
                        </label>
                        <label className="text-[11.5px] text-faint">
                            {tx(lang, 'screen.rsiTo')}{' '}
                            <input
                                type="number" name="rsiMax" min={0} max={100}
                                defaultValue={band ? band[1] : 70}
                                className="num h-8 w-14 rounded-[9px] border border-line bg-page px-2 text-[12.5px] text-foreground outline-none"
                            />
                        </label>
                        <button type="submit" className="pill h-8">{tx(lang, 'screen.apply')}</button>
                        {band && (
                            <a href="/screener" className="pill h-8">{tx(lang, 'screen.clear')}</a>
                        )}
                    </form>
                }
            >
                <Suspense fallback={<ScanSkeleton />}>
                    <Results band={band} />
                </Suspense>
            </Panel>
        </>
    );
}
