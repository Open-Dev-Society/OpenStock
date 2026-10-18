import { Suspense } from 'react';
import Panel from '@/components/Panel';
import ScreenerHeader from '@/components/ScreenerHeader';
import SetupsLiveTable from '@/components/SetupsLiveTable';
import { scanMarket, scanRsiBand, scanRsiBurst, scanRsiRising } from '@/lib/actions/screener.actions';
import { parseBand } from '@/lib/setup-scan';
import { getLang } from '@/lib/i18n-server';
import { tx } from '@/lib/i18n';

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
                action={<ScreenerHeader lang={lang} rising={rising} burst={burst} band={band} />}
            >
                <Suspense fallback={<ScanSkeleton />}>
                    <Results band={band} rising={rising} burst={burst} />
                </Suspense>
            </Panel>
        </>
    );
}
