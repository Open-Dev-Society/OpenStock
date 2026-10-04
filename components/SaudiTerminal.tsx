import { getYahooDailyQuotes } from '@/lib/actions/yahoo.actions';
import { getUserWatchlist } from '@/lib/actions/watchlist.actions';
import { TADAWUL_COMPANIES } from '@/lib/tadawul-companies';
import { tadawulDisplayName } from '@/lib/tadawul-search';
import type { YahooDailyQuote } from '@/lib/yahoo';
import type { Lang } from '@/lib/i18n';
import TerminalWatchlistView, { type TerminalRow } from '@/components/TerminalWatchlistView';

// Default terminal list (mirrors a typical TradingView Tadawul watchlist).
// Shown until the user stars their own symbols.
const DEFAULT_TERMINAL = [
    'TADAWUL:TASI',
    'TADAWUL:1120',
    'TADAWUL:1210',
    'TADAWUL:2010',
    'TADAWUL:2084',
    'TADAWUL:2120',
    'TADAWUL:2140',
    'TADAWUL:2160',
    'TADAWUL:2190',
    'TADAWUL:2382',
    'TADAWUL:4031',
    'TADAWUL:4250',
    'TADAWUL:4270',
    'TADAWUL:4290',
    'TADAWUL:4321',
    'TADAWUL:6018',
    'TADAWUL:6050',
    'TADAWUL:7010',
];

const DIRECTORY = new Map(TADAWUL_COMPANIES.map((c) => [c.symbol, c]));

const toTv = (symbol: string) => {
    const upper = symbol.toUpperCase();
    if (upper.startsWith('TADAWUL:')) return upper;
    if (/^\d+\.SR$/.test(upper)) return `TADAWUL:${upper.split('.')[0]}`;
    return upper;
};

const toApp = (tvSymbol: string) => {
    const m = /^TADAWUL:(\d+)$/.exec(tvSymbol);
    return m ? `${m[1]}.SR` : null;
};

// Terminal-style watchlist: Symbol | Last | Chg | Chg% | Vol, priced from Yahoo.
// Uses the user's starred symbols, or the default terminal list when empty.
export default async function SaudiTerminalWatchlist({ lang }: { lang: Lang }) {
    const starred: { symbol: string; company: string }[] = await getUserWatchlist().catch(() => []);
    const tvSymbols = (starred.length ? starred.map((w) => toTv(w.symbol)) : DEFAULT_TERMINAL).slice(0, 30);
    const storedName = new Map(starred.map((w) => [toTv(w.symbol), w.company]));
    const quotes: Record<string, YahooDailyQuote> = await getYahooDailyQuotes(tvSymbols);

    const rows: TerminalRow[] = tvSymbols.map((tv) => {
        const num = tv.replace('TADAWUL:', '');
        const dir = DIRECTORY.get(`${num}.SR`);
        return {
            tv,
            num,
            name: tv === 'TADAWUL:TASI' ? 'TASI Index · تاسي' : (storedName.get(tv) || (dir ? tadawulDisplayName(dir) : num)),
            app: toApp(tv),
            quote: quotes[tv] ?? null,
        };
    });
    return <TerminalWatchlistView rows={rows} lang={lang} hasCustom={starred.length > 0} />;
}
