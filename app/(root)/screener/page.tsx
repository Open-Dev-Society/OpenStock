import { Suspense } from 'react';
import Panel from '@/components/Panel';
import SetupsLiveTable from '@/components/SetupsLiveTable';
import { scanMarket, scanRsiBand, scanRsiBurst, scanRsiRising } from '@/lib/actions/screener.actions';
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

async function Results({ band, rising, burst }: { band: [number, number] | null; rising: boolean; burst: boolean }) {
    const lang = await getLang();
    if (burst) {
        const { rows, scanned } = await scanRsiBurst(25, 6, 50);
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
    if (rising) {
        const { rows, scanned } = await scanRsiRising(25);
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
// ?rising=1 switches to RSI(14) momentum (higher than yesterday) instead.
// ?burst=1 switches to the RSI burst preset (one-day jump >= 6, RSI <= 50).
export default async function ScreenerPage({ searchParams }: { searchParams: Promise<{ rsiMin?: string; rsiMax?: string; rising?: string; burst?: string }> }) {
    const lang = await getLang();
    const { rsiMin, rsiMax, rising: risingRaw, burst: burstRaw } = await searchParams;
    const burst = burstRaw === '1';
    const rising = !burst && risingRaw === '1';
    const band = rising || burst ? null : parseBand(rsiMin, rsiMax);
    return (
        <>
            <header className="page-head">
                <div>
                    <h1 className="page-title">{tx(lang, 'screen.title')}</h1>
                    <p className="page-sub">{tx(lang, 'screen.sub')}</p>
                </div>
            </header>
            <Panel
                title={burst ? tx(lang, 'screen.burstTitle') : rising ? tx(lang, 'screen.risingTitle') : band ? tx(lang, 'screen.bandTitle') : tx(lang, 'screen.top')}
                sub={burst ? tx(lang, 'screen.burstSub') : rising ? tx(lang, 'screen.risingSub') : band ? tx(lang, 'screen.bandSub').replace('{lo}', String(band[0])).replace('{hi}', String(band[1])) : tx(lang, 'screen.tapRow')}
                action={
                    <div className="flex items-center gap-1.5">
                        {!rising && !burst && (
                            <a href="/screener?rising=1" className="pill h-8">{tx(lang, 'screen.rising')}</a>
                        )}
                        {!burst && (
                            <a href="/screener?burst=1" className="pill h-8">{tx(lang, 'screen.burst')}</a>
                        )}
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
                        {(band || rising || burst) && (
                            <a href="/screener" className="pill h-8">{tx(lang, 'screen.clear')}</a>
                        )}
                    </form>
                    </div>
                }
            >
                <Suspense fallback={<ScanSkeleton />}>
                    <Results band={band} rising={rising} burst={burst} />
                </Suspense>
            </Panel>
        </>
    );
}
