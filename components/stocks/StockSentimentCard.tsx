import type { StockSentimentInsights } from '@/lib/actions/adanos.helpers';
import { cn } from '@/lib/utils';
import { alignmentLabel, arDigits, metricLabel, sourceLabel, trendLabel, tx, type Lang } from '@/lib/i18n';

interface StockSentimentCardProps {
    insight: StockSentimentInsights | null;
}

function formatScore(value: number | null, suffix: string, lang: Lang): string {
    if (value === null) return '—';
    return arDigits(`${value.toFixed(1)}${suffix}`, lang);
}

function formatCompactNumber(value: number, lang: Lang): string {
    const compact = new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(value);
    return arDigits(compact, lang);
}

const TREND_CLASS: Record<string, string> = {
    rising: 'is-up',
    falling: 'is-down',
    stable: '',
};

function getAlignmentClass(alignment: string): string {
    if (alignment === 'Bullish alignment') return 'text-up';
    if (alignment === 'Bearish alignment' || alignment === 'Wide divergence') return 'text-down';
    if (alignment === 'Mixed') return 'text-warn';
    return 'text-muted-foreground';
}

export default function StockSentimentCard({ insight, lang = 'en' }: StockSentimentCardProps & { lang?: Lang }) {
    if (!insight) {
        return null;
    }

    const summary = [
        { label: tx(lang, 'sentiment.avgBuzz'), value: formatScore(insight.averageBuzz, '/100', lang) },
        { label: tx(lang, 'sentiment.bullishAvg'), value: formatScore(insight.bullishAverage, '%', lang) },
        { label: tx(lang, 'sentiment.coverage'), value: tx(lang, 'sentiment.sources').replace('{n}', arDigits(insight.availableSources, lang)) },
    ];

    return (
        <div className="flex flex-col">
            <div className="grid grid-cols-3 gap-2 p-3">
                {summary.map(({ label, value }) => (
                    <div key={label} className="min-w-0">
                        <p className="kicker">{label}</p>
                        <p className="num mt-1 truncate font-bold text-foreground">{value}</p>
                    </div>
                ))}
            </div>
            <p className="border-t border-line px-3 py-2.5 text-[12.5px] text-faint">
                {tx(lang, 'sentiment.alignment')} <span className={cn('font-semibold', getAlignmentClass(insight.sourceAlignment))}>{alignmentLabel(lang, insight.sourceAlignment)}</span>
            </p>

            <ul className="row-list border-t border-line">
                {insight.sources.map((source) => (
                    <li key={source.source} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2.5">
                        <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">{sourceLabel(lang, source.label)}</p>
                            <p className="num truncate text-[12px] text-faint">
                                {formatCompactNumber(source.metricValue, lang)} {metricLabel(lang, source.metricLabel)}
                            </p>
                        </div>
                        <div className="num text-end text-[12.5px]">
                            <p className="font-semibold text-foreground">{formatScore(source.buzzScore, '', lang)}</p>
                            <p className="text-faint">{tx(lang, 'sentiment.buzz')}</p>
                        </div>
                        <span className={cn('pill w-[74px] justify-center capitalize', TREND_CLASS[source.trend ?? ''])}>
                            {source.bullishPct !== null
                                ? tx(lang, 'sentiment.bull').replace('{n}', arDigits(source.bullishPct.toFixed(0), lang))
                                : trendLabel(lang, source.trend)}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
