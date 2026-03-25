export type SentimentSourceKey = 'reddit' | 'x' | 'news' | 'polymarket';
export type SentimentTrend = 'rising' | 'falling' | 'stable';

type BaseCompareRow = {
    ticker?: string;
    company_name?: string | null;
    buzz_score?: number | null;
    trend?: SentimentTrend | null;
    bullish_pct?: number | null;
    trend_history?: number[] | null;
};

export type SourceComparePayload = {
    stocks?: BaseCompareRow[];
};

export const SOURCE_CONFIG = {
    reddit: {
        label: 'Reddit',
        path: '/reddit/stocks/v1/compare',
        metricLabel: 'Mentions',
        metricField: 'mentions',
    },
    x: {
        label: 'X.com',
        path: '/x/stocks/v1/compare',
        metricLabel: 'Mentions',
        metricField: 'mentions',
    },
    news: {
        label: 'News',
        path: '/news/stocks/v1/compare',
        metricLabel: 'Mentions',
        metricField: 'mentions',
    },
    polymarket: {
        label: 'Polymarket',
        path: '/polymarket/stocks/v1/compare',
        metricLabel: 'Trades',
        metricField: 'trade_count',
    },
} as const satisfies Record<
    SentimentSourceKey,
    {
        label: string;
        path: string;
        metricLabel: string;
        metricField: string;
    }
>;

type SourceSpecificRow = BaseCompareRow & Record<string, unknown>;

export interface SentimentSourceInsight {
    source: SentimentSourceKey;
    label: string;
    companyName: string | null;
    buzzScore: number;
    bullishPct: number | null;
    trend: SentimentTrend | null;
    metricLabel: string;
    metricValue: number;
}

export interface StockSentimentInsights {
    symbol: string;
    companyName: string | null;
    averageBuzz: number;
    bullishAverage: number | null;
    sourceAlignment: string;
    availableSources: number;
    sources: SentimentSourceInsight[];
}

function toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function roundTo(value: number, digits: number = 1): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function average(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeTrend(value: unknown): SentimentTrend | null {
    return value === 'rising' || value === 'falling' || value === 'stable' ? value : null;
}

export function getSourceAlignment(bullishValues: number[]): string {
    if (bullishValues.length === 0) return 'No sentiment mix';
    if (bullishValues.length === 1) return 'Single-source view';

    const min = Math.min(...bullishValues);
    const max = Math.max(...bullishValues);
    const spread = max - min;
    const avg = average(bullishValues);

    if (spread <= 12 && avg >= 60) return 'Bullish alignment';
    if (spread <= 12 && avg <= 40) return 'Bearish alignment';
    if (spread <= 12) return 'Tight alignment';
    if (spread >= 25) return 'Wide divergence';
    return 'Mixed';
}

export function normalizeSourceInsight(
    source: SentimentSourceKey,
    row: SourceSpecificRow | null | undefined,
): SentimentSourceInsight | null {
    if (!row) return null;

    const buzzScore = toNumber(row.buzz_score);
    const metricValue = toNumber(row[SOURCE_CONFIG[source].metricField]);

    if (buzzScore === null || metricValue === null) {
        return null;
    }

    return {
        source,
        label: SOURCE_CONFIG[source].label,
        companyName: typeof row.company_name === 'string' ? row.company_name : null,
        buzzScore: roundTo(buzzScore),
        bullishPct: toNumber(row.bullish_pct),
        trend: normalizeTrend(row.trend),
        metricLabel: SOURCE_CONFIG[source].metricLabel,
        metricValue: Math.round(metricValue),
    };
}

export function buildStockSentimentInsights(
    symbol: string,
    sources: Array<SentimentSourceInsight | null>,
): StockSentimentInsights | null {
    const availableSources = sources.filter((source): source is SentimentSourceInsight => Boolean(source));

    if (availableSources.length === 0) {
        return null;
    }

    const buzzValues = availableSources.map((source) => source.buzzScore);
    const bullishValues = availableSources
        .map((source) => source.bullishPct)
        .filter((value): value is number => value !== null);

    return {
        symbol: symbol.toUpperCase(),
        companyName: availableSources.find((source) => source.companyName)?.companyName ?? null,
        averageBuzz: roundTo(average(buzzValues)),
        bullishAverage: bullishValues.length ? roundTo(average(bullishValues)) : null,
        sourceAlignment: getSourceAlignment(bullishValues),
        availableSources: availableSources.length,
        sources: availableSources,
    };
}
