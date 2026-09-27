'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getGoldActivityCandles } from '@/lib/actions/finnhub.actions';

type GoldActivityCandle = Awaited<ReturnType<typeof getGoldActivityCandles>>[number];

const CHART_WIDTH = 720;
const CHART_HEIGHT = 220;
const CHART_TOP = 18;
const CHART_BOTTOM = 194;

const GoldActivityBubbles = () => {
    const [candles, setCandles] = useState<GoldActivityCandle[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const result = await getGoldActivityCandles();
            setCandles(result);
            setError(null);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Could not load gold activity');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
        const interval = window.setInterval(() => void refresh(), 60_000);
        return () => window.clearInterval(interval);
    }, [refresh]);

    const chart = useMemo(() => {
        const visible = candles.slice(-48);
        const withVolume = visible.filter(
            (candle): candle is GoldActivityCandle & { tickVolume: number } => candle.tickVolume !== null
        );
        const volumes = withVolume.map((candle) => candle.tickVolume).sort((a, b) => a - b);
        const median = volumes.length ? volumes[Math.floor(volumes.length / 2)] : 0;
        const minPrice = Math.min(...visible.map((candle) => candle.low));
        const maxPrice = Math.max(...visible.map((candle) => candle.high));
        const priceRange = maxPrice - minPrice || 1;
        const xStep = visible.length > 1 ? (CHART_WIDTH - 40) / (visible.length - 1) : 0;
        const points = visible.map((candle, index) => ({
            candle,
            x: 20 + index * xStep,
            y: CHART_BOTTOM - ((candle.close - minPrice) / priceRange) * (CHART_BOTTOM - CHART_TOP),
        }));

        return {
            points,
            withVolume,
            median,
            minPrice,
            maxPrice,
            line: points.map(({ x, y }) => `${x},${y}`).join(' '),
        };
    }, [candles]);

    return (
        <section className="rounded-xl border border-white/10 bg-[#141414] p-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 className="text-lg font-semibold text-gray-100">Gold activity bubbles</h2>
                    <p className="text-sm text-gray-400">XAU/USD · 5-minute candles · refreshes every minute</p>
                </div>
                <span className="text-xs text-gray-400">
                    {loading ? 'Loading activity…' : error ? 'Data unavailable' : 'Tick activity'}
                </span>
            </div>

            {error ? (
                <p role="status" className="py-8 text-sm text-amber-300">{error}</p>
            ) : chart.points.length === 0 ? (
                <p role="status" className="py-8 text-sm text-gray-400">
                    {loading ? 'Loading recent candles…' : 'No recent gold candles were returned by the data provider.'}
                </p>
            ) : chart.withVolume.length === 0 ? (
                <p role="status" className="py-8 text-sm text-gray-400">
                    Price data is available, but this feed did not return tick-activity values.
                </p>
            ) : (
                <>
                    <svg
                        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                        className="h-56 w-full"
                        role="img"
                        aria-label="Gold price chart with bubbles sized by relative tick activity"
                    >
                        <line x1="20" x2={CHART_WIDTH - 20} y1={CHART_BOTTOM} y2={CHART_BOTTOM} stroke="#333" />
                        <polyline points={chart.line} fill="none" stroke="#9ca3af" strokeWidth="1.5" opacity="0.7" />
                        {chart.points.map(({ candle, x, y }) => {
                            if (candle.tickVolume === null || chart.median === 0) return null;
                            const ratio = candle.tickVolume / chart.median;
                            const isElevated = ratio >= 1.5;
                            const radius = Math.min(22, 5 + Math.sqrt(ratio) * 5);
                            const color = candle.close >= candle.open ? '#0FEDBE' : '#fb7185';
                            return (
                                <circle
                                    key={candle.time}
                                    cx={x}
                                    cy={y}
                                    r={radius}
                                    fill={color}
                                    fillOpacity={isElevated ? 0.72 : 0.35}
                                    stroke={isElevated ? color : 'none'}
                                    strokeWidth="2"
                                >
                                    <title>
                                        {new Date(candle.time * 1000).toLocaleString()} · ${candle.close.toFixed(2)} ·
                                        {' '}tick volume {candle.tickVolume} ({ratio.toFixed(1)}× median)
                                    </title>
                                </circle>
                            );
                        })}
                        <text x="20" y="14" fill="#9ca3af" fontSize="11">${chart.maxPrice.toFixed(2)}</text>
                        <text x="20" y={CHART_HEIGHT - 4} fill="#9ca3af" fontSize="11">${chart.minPrice.toFixed(2)}</text>
                    </svg>
                    <p className="mt-1 text-xs text-gray-400">
                        Larger bubbles indicate higher-than-usual tick activity, not confirmed large trades or order sizes.
                    </p>
                </>
            )}
        </section>
    );
};

export default GoldActivityBubbles;
