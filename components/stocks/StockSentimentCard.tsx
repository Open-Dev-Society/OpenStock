import type { StockSentimentInsights } from '@/lib/actions/adanos.helpers';

interface StockSentimentCardProps {
    insight: StockSentimentInsights | null;
}

function formatScore(value: number | null, suffix: string): string {
    if (value === null) return 'N/A';
    return `${value.toFixed(1)}${suffix}`;
}

function formatCompactNumber(value: number): string {
    return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(value);
}

function getTrendClasses(trend: string | null): string {
    if (trend === 'rising') return 'text-emerald-400';
    if (trend === 'falling') return 'text-rose-400';
    if (trend === 'stable') return 'text-amber-300';
    return 'text-gray-400';
}

function getAlignmentClasses(alignment: string): string {
    if (alignment === 'Bullish alignment') return 'text-emerald-400';
    if (alignment === 'Bearish alignment' || alignment === 'Wide divergence') return 'text-rose-400';
    if (alignment === 'Tight alignment') return 'text-blue-300';
    if (alignment === 'Mixed') return 'text-amber-300';
    if (alignment === 'Single-source view') return 'text-slate-300';
    if (alignment === 'No sentiment mix') return 'text-zinc-400';
    return 'text-gray-300';
}

export default function StockSentimentCard({ insight }: StockSentimentCardProps) {
    if (!insight) {
        return null;
    }

    return (
        <section className="rounded-2xl border border-gray-800 bg-gray-950/40 p-5 backdrop-blur-sm">
            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
                            Sentiment Insights
                        </p>
                        <h2 className="mt-2 text-xl font-semibold text-white">
                            {insight.symbol} across social and public channels
                        </h2>
                        {insight.companyName ? (
                            <p className="mt-1 text-sm font-medium text-gray-300">
                                {insight.companyName}
                            </p>
                        ) : null}
                        <p className="mt-1 text-sm text-gray-400">
                            Structured sentiment snapshot across Reddit, X.com, news, and Polymarket.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 rounded-2xl border border-gray-800 bg-black/20 p-4 md:min-w-[320px]">
                        <div>
                            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-gray-500">
                                Avg. Buzz
                            </p>
                            <p className="mt-1 text-lg font-semibold text-white">
                                {formatScore(insight.averageBuzz, '/100')}
                            </p>
                        </div>
                        <div>
                            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-gray-500">
                                Bullish Avg
                            </p>
                            <p className="mt-1 text-lg font-semibold text-white">
                                {formatScore(insight.bullishAverage, '%')}
                            </p>
                        </div>
                        <div>
                            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-gray-500">
                                Source Alignment
                            </p>
                            <p className={`mt-1 text-sm font-semibold ${getAlignmentClasses(insight.sourceAlignment)}`}>
                                {insight.sourceAlignment}
                            </p>
                        </div>
                        <div>
                            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-gray-500">
                                Coverage
                            </p>
                            <p className="mt-1 text-lg font-semibold text-white">
                                {insight.availableSources}/4
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {insight.sources.map((source) => (
                        <article
                            key={source.source}
                            className="rounded-xl border border-gray-800 bg-black/20 p-4"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-semibold text-white">{source.label}</h3>
                                <span className={`text-sm font-medium capitalize ${getTrendClasses(source.trend)}`}>
                                    {source.trend ?? 'No trend'}
                                </span>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <div className="rounded-lg border border-gray-800 bg-black/20 p-3">
                                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-gray-500">
                                        Buzz
                                    </p>
                                    <p className="mt-2 text-xl font-semibold text-white">
                                        {formatScore(source.buzzScore, '/100')}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-gray-800 bg-black/20 p-3">
                                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-gray-500">
                                        Bullish
                                    </p>
                                    <p className="mt-2 text-xl font-semibold text-white">
                                        {formatScore(source.bullishPct, '%')}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-gray-800 bg-black/20 p-3">
                                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-gray-500">
                                        {source.metricLabel}
                                    </p>
                                    <p className="mt-2 text-xl font-semibold text-white">
                                        {formatCompactNumber(source.metricValue)}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-gray-800 bg-black/20 p-3">
                                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-gray-500">
                                        Trend
                                    </p>
                                    <p className={`mt-2 text-xl font-semibold capitalize ${getTrendClasses(source.trend)}`}>
                                        {source.trend ?? 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
