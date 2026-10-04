'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRightToLine, FoldVertical, Maximize2, Minimize2, RotateCcw, UnfoldVertical, ZoomIn, ZoomOut } from 'lucide-react';
import { CHART_BASE_HEIGHT, clampHeightDelta, zoomRange } from '@/lib/chart-view';
import {
    createChart,
    createSeriesMarkers,
    CandlestickSeries,
    HistogramSeries,
    LineSeries,
    LineStyle,
    ColorType,
    type IChartApi,
    type IPaneApi,
    type ISeriesApi,
    type UTCTimestamp,
    type BusinessDay,
    type LineWidth,
} from 'lightweight-charts';

type PaneApi = ReturnType<IChartApi['addPane']>;
import { CANDLE_RANGES, OhlcCandle, validCandles, type CandleRangeId } from '@/lib/yahoo';
import { bollinger, cci, elliottWaves, ema, macd, rsi, sma, stochastic, adx, studyPoints, zigzag } from '@/lib/indicators';
import { tx, type Lang } from '@/lib/i18n';
import {
    fibLevelPrices,
    gannGuides,
    loadDrawings,
    drawingColor,
    newDrawingId,
    normalizeTimeKey,
    saveDrawings,
    PATTERNS,
    cycleIndices,
    loadPatterns,
    savePatterns,
    patternById,
    type Drawing,
    type DrawingTool,
    type DrawPoint,
    type PatternDrawing,
    type PatternTool,
} from '@/lib/drawings';
import { getMarket, isMarketOpen } from '@/lib/markets';
import { getTadawulCandles } from '@/lib/actions/yahoo.actions';
import { getTwelveIntraday } from '@/lib/actions/twelvedata.actions';

const RANGE_IDS = Object.keys(CANDLE_RANGES) as CandleRangeId[];
const REFRESH_MS = 30_000;

type IndKey = 'ma20' | 'ema50' | 'bb' | 'rsi' | 'macd' | 'cci' | 'stoch' | 'adx' | 'elliott' | 'volume';
type ParamDef = { key: string; label: string; labelKey?: 'param.length' | 'param.mult' | 'param.fast' | 'param.slow' | 'param.signal' | 'param.dev'; def: number; min: number; max: number; step?: number };
const INDICATORS: { key: IndKey; label: string; labelAr?: string; params: ParamDef[]; defOn?: boolean; noColor?: boolean }[] = [
    { key: 'ma20', label: 'MA', params: [{ key: 'period', label: 'Length', labelKey: 'param.length', def: 20, min: 2, max: 200 }] },
    { key: 'ema50', label: 'EMA', params: [{ key: 'period', label: 'Length', labelKey: 'param.length', def: 50, min: 2, max: 200 }] },
    { key: 'bb', label: 'Bollinger', params: [{ key: 'period', label: 'Length', labelKey: 'param.length', def: 20, min: 2, max: 100 }, { key: 'mult', label: 'Mult', labelKey: 'param.mult', def: 2, min: 0.5, max: 5, step: 0.5 }] },
    { key: 'rsi', label: 'RSI', params: [{ key: 'period', label: 'Length', labelKey: 'param.length', def: 14, min: 2, max: 100 }] },
    { key: 'macd', label: 'MACD', params: [{ key: 'fast', label: 'Fast', labelKey: 'param.fast', def: 12, min: 1, max: 100 }, { key: 'slow', label: 'Slow', labelKey: 'param.slow', def: 26, min: 2, max: 200 }, { key: 'signal', label: 'Signal', labelKey: 'param.signal', def: 9, min: 1, max: 50 }] },
    { key: 'cci', label: 'CCI', params: [{ key: 'period', label: 'Length', labelKey: 'param.length', def: 20, min: 2, max: 100 }] },
    { key: 'stoch', label: 'Stochastic', params: [{ key: 'k', label: '%K', def: 14, min: 1, max: 100 }, { key: 'd', label: '%D', def: 3, min: 1, max: 50 }] },
    { key: 'adx', label: 'ADX', params: [{ key: 'period', label: 'Length', labelKey: 'param.length', def: 14, min: 2, max: 100 }] },
    { key: 'elliott', label: 'Elliott', params: [{ key: 'dev', label: 'Deviation', labelKey: 'param.dev', def: 5, min: 1, max: 20, step: 0.5 }] },
    { key: 'volume', label: 'Volume', labelAr: 'الحجم', params: [], defOn: true, noColor: true },
];
const DEFAULT_PARAMS: Record<IndKey, Record<string, number>> = Object.fromEntries(
    INDICATORS.map(({ key, params }) => [key, Object.fromEntries(params.map((p) => [p.key, p.def]))]),
) as Record<IndKey, Record<string, number>>;
const PALETTE = ['#2962FF', '#FF6D00', '#26A69A', '#EF5350', '#7E57C2', '#00BCD4', '#EAB308', '#F0F3FA'];
const DEFAULT_COLORS: Record<IndKey, string> = {
    ma20: '#2962FF', ema50: '#FF6D00', bb: '#787B86', rsi: '#7E57C2',
    macd: '#2962FF', cci: '#00BCD4', stoch: '#2962FF', adx: '#AD8CFF', elliott: '#2962FF', volume: '#26A69A',
};
const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
const IND_STORAGE = 'tadawul-indicators-v2';
const loadState = (): { enabled: Record<IndKey, boolean>; params: Record<IndKey, Record<string, number>>; colors: Record<IndKey, string> } => {
    const enabled = Object.fromEntries(INDICATORS.map(({ key, defOn }) => [key, defOn ?? false])) as Record<IndKey, boolean>;
    const params = structuredClone(DEFAULT_PARAMS);
    const colors = { ...DEFAULT_COLORS };
    try {
        const saved = JSON.parse(localStorage.getItem(IND_STORAGE) ?? '{}') as {
            enabled?: Partial<Record<IndKey, boolean>>;
            params?: Partial<Record<IndKey, Record<string, number>>>;
            colors?: Partial<Record<IndKey, string>>;
        };
        for (const { key } of INDICATORS) {
            if (typeof saved.enabled?.[key] === 'boolean') enabled[key] = saved.enabled[key] as boolean;
            for (const [pk, pv] of Object.entries(saved.params?.[key] ?? {})) {
                if (typeof pv === 'number' && Number.isFinite(pv) && pk in params[key]) params[key][pk] = pv;
            }
            if (isHex(saved.colors?.[key])) colors[key] = saved.colors[key] as string;
        }
    } catch { /* fresh defaults */ }
    return { enabled, params, colors };
};

const riyadhTime = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Riyadh',
});

// Crosshair axis label: full date + time for intraday, day + month + year for daily.
const riyadhDateTime = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Riyadh',
});
const riyadhDate = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Riyadh',
});
const formatTickTime = (t: string | number): string => {
    if (typeof t === 'number') return riyadhDateTime.format(t * 1000).replace(',', ' ·');
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
    if (!m) return String(t);
    return riyadhDate.format(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
};

// Own candlestick chart for Tadawul, since TradingView free embeds refuse TADAWUL
// candle charts. Data: Yahoo Finance (delayed, SAR). "Today" shows 1-minute
// candles and re-reads them every 30s while the market is open.
export default function TadawulChart({ symbol, tvUrl, lang, initialRange = '1m' }: { symbol: string; tvUrl: string; lang: Lang; initialRange?: CandleRangeId }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null);
    const [range, setRange] = useState<CandleRangeId>(initialRange);

    // Timeframe survives refreshes/bookmarks via ?tf= (no server round-trip)
    const changeRange = (id: CandleRangeId) => {
        setRange(id);
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('tf', id);
            window.history.replaceState(null, '', url);
        } catch { /* ignore */ }
    };
    const [candles, setCandles] = useState<OhlcCandle[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [last, setLast] = useState<OhlcCandle | null>(null);
    const [live, setLive] = useState(false);
    const [source, setSource] = useState<'live' | 'delayed' | null>(null);
    const [indState, setIndState] = useState(() => ({
        enabled: Object.fromEntries(INDICATORS.map(({ key }) => [key, false])) as Record<IndKey, boolean>,
        params: structuredClone(DEFAULT_PARAMS),
        colors: { ...DEFAULT_COLORS },
    }));
    const inds = indState.enabled;
    const indParams = indState.params;
    const indColors = indState.colors;
    const [menuOpen, setMenuOpen] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [priceLine, setPriceLine] = useState(true);
    // SSR-safe defaults; persisted prefs load after mount (below) so the
    // first render always matches the server and hydration never mismatches.
    const [lineWidth, setLineWidth] = useState<LineWidth>(1);
    // Every study line ever created (overlays + oscillator panes)
    const lineRegistry = useRef(new Set<ISeriesApi<'Line'>>());
    const [heightDelta, setHeightDelta] = useState(0);

    // Hydrate persisted prefs after mount (never during SSR)
    useEffect(() => {
        setIndState(loadState());
        try {
            const w = Number(localStorage.getItem('tadawul-line-width') ?? 1);
            if (w >= 1 && w <= 4) setLineWidth(Math.round(w) as LineWidth);
            const h = Number(localStorage.getItem('tadawul-chart-height') ?? 0);
            if (Number.isFinite(h)) setHeightDelta(clampHeightDelta(h));
            if (localStorage.getItem('tadawul-price-line') === '0') setPriceLine(false);
        } catch { /* fresh defaults */ }
    }, []);

    // Price line + last-value tag on the candle series
    useEffect(() => {
        try {
            candleRef.current?.applyOptions({ priceLineVisible: priceLine, lastValueVisible: priceLine });
        } catch { /* ignore */ }
    }, [priceLine]);

    const togglePriceLine = () => {
        setPriceLine((prev) => {
            const next = !prev;
            try { localStorage.setItem('tadawul-price-line', next ? '1' : '0'); } catch { /* ignore */ }
            return next;
        });
    };
    const [tool, setTool] = useState<DrawingTool | null>(null);
    const [draftA, setDraftA] = useState<DrawPoint | null>(null);
    const [previewB, setPreviewB] = useState<DrawPoint | null>(null);
    const [drawings, setDrawings] = useState<Drawing[]>([]);
    const [patternTool, setPatternTool] = useState<PatternTool | null>(null);
    const [patternDraft, setPatternDraft] = useState<DrawPoint[]>([]);
    const [patternPreview, setPatternPreview] = useState<DrawPoint | null>(null);
    const [patterns, setPatterns] = useState<PatternDrawing[]>([]);
    const [patternsOpen, setPatternsOpen] = useState(false);
    const [hover, setHover] = useState<{ x: number; y: number; candle: OhlcCandle } | null>(null);
    const candlesRef = useRef<OhlcCandle[]>([]);
    candlesRef.current = candles;
    const [, setViewTick] = useState(0);
    // Mirrors for stable chart subscriptions (registered once)
    const toolRef = useRef<DrawingTool | null>(null);
    const draftRef = useRef<DrawPoint | null>(null);
    const patternToolRef = useRef<PatternTool | null>(null);
    const patternDraftRef = useRef<DrawPoint[]>([]);
    const symbolRef = useRef(symbol);
    const rangeRef = useRef(range);
    toolRef.current = tool;
    draftRef.current = draftA;
    patternToolRef.current = patternTool;
    patternDraftRef.current = patternDraft;
    symbolRef.current = symbol;
    rangeRef.current = range;
    const overlayRef = useRef<Partial<Record<'ma20' | 'ema50' | 'bbBasis' | 'bbUpper' | 'bbLower', ISeriesApi<'Line'> | null>>>({});
    const rsiRef = useRef<{ pane: PaneApi; series: ISeriesApi<'Line'> } | null>(null);
    const macdRef = useRef<{ pane: PaneApi; line: ISeriesApi<'Line'>; signal: ISeriesApi<'Line'>; hist: ISeriesApi<'Histogram'> } | null>(null);
    const cciRef = useRef<{ pane: PaneApi; series: ISeriesApi<'Line'> } | null>(null);
    const stochRef = useRef<{ pane: PaneApi; k: ISeriesApi<'Line'>; d: ISeriesApi<'Line'> } | null>(null);
    const adxRef = useRef<{ pane: PaneApi; adx: ISeriesApi<'Line'>; plus: ISeriesApi<'Line'>; minus: ISeriesApi<'Line'> } | null>(null);
    const waveMarkersRef = useRef<{
        setMarkers: (m: {
            time: UTCTimestamp | string;
            position: 'aboveBar' | 'belowBar';
            color: string;
            shape: 'circle';
            text: string;
        }[]) => void;
    } | null>(null);

    const persist = (next: { enabled: Record<IndKey, boolean>; params: Record<IndKey, Record<string, number>>; colors: Record<IndKey, string> }) => {
        try { localStorage.setItem(IND_STORAGE, JSON.stringify(next)); } catch { /* ignore */ }
    };

    const toggleInd = (key: IndKey) => {
        setIndState((prev) => {
            const next = { ...prev, enabled: { ...prev.enabled, [key]: !prev.enabled[key] } };
            persist(next);
            return next;
        });
    };

    const stepLineWidth = (dir: 1 | -1) => {
        setLineWidth((prev) => {
            const next = Math.min(4, Math.max(1, prev + dir)) as LineWidth;
            try { localStorage.setItem('tadawul-line-width', String(next)); } catch { /* ignore */ }
            return next;
        });
    };

    // Apply the width to every study line (created now or earlier)
    useEffect(() => {
        lineRegistry.current.forEach((s) => {
            try { s.applyOptions({ lineWidth }); } catch { /* series gone */ }
        });
    }, [lineWidth]);

    const trackLine = (s: ISeriesApi<'Line'>) => {
        lineRegistry.current.add(s);
        try { s.applyOptions({ lineWidth }); } catch { /* ignore */ }
        return s;
    };

    const cycleColor = (key: IndKey) => {
        setIndState((prev) => {
            const idx = PALETTE.indexOf(prev.colors[key]);
            const nextColor = PALETTE[(idx + 1 + PALETTE.length) % PALETTE.length];
            const next = { ...prev, colors: { ...prev.colors, [key]: nextColor } };
            persist(next);
            return next;
        });
    };

    const stepParam = (key: IndKey, param: ParamDef, dir: 1 | -1) => {
        setIndState((prev) => {
            const step = param.step ?? 1;
            const raw = (prev.params[key][param.key] ?? param.def) + dir * step;
            const rounded = Math.round(raw / step) * step;
            const value = Math.min(param.max, Math.max(param.min, Number(rounded.toFixed(4))));
            const next = { ...prev, params: { ...prev.params, [key]: { ...prev.params[key], [param.key]: value } } };
            persist(next);
            return next;
        });
    };
    const activeIndCount = INDICATORS.filter(({ key }) => inds[key]).length;

    // Create the chart once. autoSize lets the library follow the container
    // (docked 480px or full-screen) instead of hand-rolled resize observers.
    useEffect(() => {
        if (!containerRef.current || chartRef.current) return;
        const chart = createChart(containerRef.current, {
            autoSize: true,
            layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#adaba3', fontSize: 12 },
            grid: { vertLines: { color: 'rgba(255, 255, 255, 0.04)' }, horzLines: { color: 'rgba(255, 255, 255, 0.04)' } },
            timeScale: { borderColor: 'rgba(255, 255, 255, 0.08)', timeVisible: true, secondsVisible: false, fixLeftEdge: true },
            rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.08)' },
            localization: {
                timeFormatter: (t: BusinessDay | UTCTimestamp) => {
                    if (typeof t === 'number') return riyadhDateTime.format(t * 1000).replace(',', ' ·');
                    if (typeof t === 'string') return formatTickTime(t);
                    const b = t as unknown as { day?: number; month?: number; year?: number };
                    if (b?.day && b?.month && b?.year) {
                        return riyadhDate.format(Date.UTC(b.year, b.month - 1, b.day));
                    }
                    return '';
                },
            },
            height: 480,
        });
        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
            borderVisible: false,
        });
        const volumeSeries = chart.addSeries(HistogramSeries, {
            priceFormat: { type: 'volume' },
            priceScaleId: '',
        });
        chart.priceScale('').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
        chartRef.current = chart;
        candleRef.current = candleSeries;
        // Volume visibility is driven by the Volume indicator toggle (on by default)
        volumeRef.current = volumeSeries;

        const toPoint = (x: number, y: number): DrawPoint | null => {
            const time = normalizeTimeKey(chart.timeScale().coordinateToTime(x));
            const price = candleRef.current?.coordinateToPrice(y) ?? null;
            if (time == null || price == null || !Number.isFinite(price)) return null;
            return { time, price };
        };
        const onClick = (param: { point?: { x: number; y: number } }) => {
            if (!param.point) {
                setPreviewB(null);
                setPatternPreview(null);
                return;
            }
            const pt = toPoint(param.point.x, param.point.y);
            if (!pt) return;
            // Multi-click pattern tools (XABCD, Elliott sets, cycles...)
            const pt2 = patternToolRef.current;
            if (pt2) {
                const def = patternById(pt2);
                const next = [...patternDraftRef.current, pt];
                if (next.length >= def.clicks) {
                    const done = next.slice(0, def.clicks);
                    setPatterns((prev) => {
                        const upd = [...prev, { id: newDrawingId(), pattern: pt2, pts: done }].slice(-50);
                        savePatterns(symbolRef.current, rangeRef.current, upd);
                        return upd;
                    });
                    setPatternDraft([]);
                    setPatternPreview(null);
                } else {
                    setPatternDraft(next);
                }
                return;
            }
            const t = toolRef.current;
            if (!t) return;
            const d = draftRef.current;
            if (!d) {
                setDraftA(pt);
            } else {
                setDrawings((prev) => {
                    const next = [...prev, { id: newDrawingId(), tool: t, a: d, b: pt }].slice(-50);
                    saveDrawings(symbolRef.current, rangeRef.current, next);
                    return next;
                });
                setDraftA(null);
                setPreviewB(null);
            }
        };
        const onCrosshair = (param: { point?: { x: number; y: number }; time?: unknown }) => {
            if (patternToolRef.current && patternDraftRef.current.length > 0 && param.point) {
                setPatternPreview(toPoint(param.point.x, param.point.y));
            } else {
                setPatternPreview(null);
            }
            if (!toolRef.current || !draftRef.current || !param.point) {
                setPreviewB(null);
            } else {
                setPreviewB(toPoint(param.point.x, param.point.y));
            }
            // Candle tooltip: date/time + OHLC under the cursor
            if (param.point && param.time != null) {
                const key = normalizeTimeKey(param.time);
                const found = key == null ? undefined : candlesRef.current.find((c) => normalizeTimeKey(c.time) === key);
                setHover(found && param.point ? { x: param.point.x, y: param.point.y, candle: found } : null);
            } else {
                setHover(null);
            }
        };
        const onRange = () => {
            setViewTick((v) => v + 1);
            // Universal floor: never show fewer than 5 bars, however the user
            // zooms (buttons, wheel or pinch). Prevents "missing data" voids.
            const r = chart.timeScale().getVisibleLogicalRange();
            if (r && r.to - r.from < 5) {
                const c = (r.from + r.to) / 2;
                chart.timeScale().setVisibleLogicalRange({ from: c - 2.5, to: c + 2.5 });
            }
        };
        chart.subscribeClick(onClick);
        chart.subscribeCrosshairMove(onCrosshair);
        chart.timeScale().subscribeVisibleTimeRangeChange(onRange);

        return () => {
            chart.unsubscribeClick(onClick);
            chart.unsubscribeCrosshairMove(onCrosshair);
            chart.timeScale().unsubscribeVisibleTimeRangeChange(onRange);
            chart.remove();
            chartRef.current = null;
        };
    }, []);

    // Load candles per range, and re-read intraday every 30s while Tadawul is open
    useEffect(() => {
        let cancelled = false;
        const intraday = CANDLE_RANGES[range]?.intraday ?? false;
        const load = async (silent: boolean) => {
            if (!silent) {
                setLoading(true);
                setFailed(false);
            }
            // Intraday: Twelve Data live first (Pro plan; trial symbols on free),
            // Yahoo delayed as fallback.
            if (intraday) {
                const twelve = await getTwelveIntraday(symbol, range);
                if (cancelled) return;
                if (twelve) {
                    setCandles(validCandles(twelve.candles));
                    setLast(twelve.candles[twelve.candles.length - 1] ?? null);
                    setSource('live');
                    if (!silent) setLoading(false);
                    return;
                }
            }
            const res = await getTadawulCandles(symbol, range);
            if (cancelled) return;
            if (!res) {
                if (!silent) {
                    setFailed(true);
                    setLoading(false);
                }
                setLive(false);
                setSource(null);
                return;
            }
            setCandles(validCandles(res.candles));
            setLast(res.candles[res.candles.length - 1] ?? null);
            setSource(intraday ? 'delayed' : null);
            if (!silent) setLoading(false);
        };
        setLive(isMarketOpen(getMarket('sa')));
        load(false);

        // Re-check the session on every tick: pages opened before 10:00 must
        // still go live at the open instead of staying frozen all session.
        let timer: ReturnType<typeof setInterval> | null = null;
        if (intraday) {
            timer = setInterval(() => {
                if (!isMarketOpen(getMarket('sa'))) {
                    setLive(false);
                    return;
                }
                setLive(true);
                load(true);
            }, REFRESH_MS);
        }
        return () => {
            cancelled = true;
            if (timer) clearInterval(timer);
        };
    }, [symbol, range]);

    // Push data into the series (fit only on range/symbol change or Reset,
    // never on silent auto-refresh, so the user's zoom never jumps)
    const fitRef = useRef(true);
    useEffect(() => {
        fitRef.current = true;
    }, [symbol, range]);
    useEffect(() => {
        if (!candleRef.current || !chartRef.current || candles.length === 0) return;
        const intraday = typeof candles[0].time === 'number';
        chartRef.current.applyOptions({
            timeScale: { timeVisible: intraday, secondsVisible: false },
        });
        candleRef.current.setData(
            candles.map(({ time, open, high, low, close }) => ({
                time: time as UTCTimestamp | string,
                open,
                high,
                low,
                close,
            })),
        );
        if (fitRef.current) {
            chartRef.current.timeScale().fitContent();
            fitRef.current = false;
        }
    }, [candles]);

    // Studies: overlays live on the price chart, oscillators get their own panes
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart || candles.length === 0) return;
        const closes = candles.map((c) => c.close);
        const times = candles.map((c) => c.time as UTCTimestamp | string);
        const overlay = overlayRef.current;

        // Volume bars under the candles, toggleable like any study
        if (inds.volume) {
            if (!volumeRef.current) {
                volumeRef.current = chart.addSeries(HistogramSeries, {
                    priceFormat: { type: 'volume' },
                    priceScaleId: '',
                });
                chart.priceScale('').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
            }
            volumeRef.current.setData(
                candles.map(({ time, close, open, volume }) => ({
                    time: time as UTCTimestamp | string,
                    value: volume,
                    color: close >= open ? 'rgba(38, 166, 154, 0.4)' : 'rgba(239, 83, 80, 0.4)',
                })),
            );
        } else if (volumeRef.current) {
            chart.removeSeries(volumeRef.current);
            volumeRef.current = null;
        }

        const ensureLine = (key: 'ma20' | 'ema50' | 'bbBasis' | 'bbUpper' | 'bbLower', color: string, dashed = false) => {
            let s = overlay[key];
            if (!s) {
                s = trackLine(chart.addSeries(LineSeries, {
                    color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false,
                    ...(dashed ? { lineStyle: LineStyle.Dashed } : {}),
                }));
                overlay[key] = s;
            } else {
                try { s.applyOptions({ color }); } catch { /* ignore */ }
            }
            return s;
        };
        const dropLine = (key: 'ma20' | 'ema50' | 'bbBasis' | 'bbUpper' | 'bbLower') => {
            overlay[key]?.applyOptions({ visible: false });
        };

        if (inds.ma20 && closes.length >= indParams.ma20.period) {
            ensureLine('ma20', indColors.ma20).setData(studyPoints(times, sma(closes, indParams.ma20.period)));
            overlay.ma20?.applyOptions({ visible: true });
        } else dropLine('ma20');
        if (inds.ema50 && closes.length >= indParams.ema50.period) {
            ensureLine('ema50', indColors.ema50).setData(studyPoints(times, ema(closes, indParams.ema50.period)));
            overlay.ema50?.applyOptions({ visible: true });
        } else dropLine('ema50');
        if (inds.bb && closes.length >= indParams.bb.period) {
            const bb = bollinger(closes, indParams.bb.period, indParams.bb.mult);
            ensureLine('bbBasis', indColors.bb).setData(studyPoints(times, bb.map((b) => b.basis)));
            ensureLine('bbUpper', indColors.bb, true).setData(studyPoints(times, bb.map((b) => b.upper)));
            ensureLine('bbLower', indColors.bb, true).setData(studyPoints(times, bb.map((b) => b.lower)));
            (['bbBasis', 'bbUpper', 'bbLower'] as const).forEach((k) => overlay[k]?.applyOptions({ visible: true }));
        } else (['bbBasis', 'bbUpper', 'bbLower'] as const).forEach(dropLine);

        const dropPane = (ref: { pane: PaneApi } | null) => {
            if (!ref) return null;
            const idx = chart.panes().indexOf(ref.pane);
            if (idx > 0) chart.removePane(idx);
            return null;
        };

        if (inds.rsi && closes.length > indParams.rsi.period) {
            if (!rsiRef.current) {
                const pane = chart.addPane();
                pane.setStretchFactor(0.25);
                const series = trackLine(pane.addSeries(LineSeries, { color: indColors.rsi, lineWidth: 1, priceLineVisible: false, lastValueVisible: true }));
                series.createPriceLine({ price: 70, color: '#787B86', lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: true, title: '' });
                series.createPriceLine({ price: 30, color: '#787B86', lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: true, title: '' });
                rsiRef.current = { pane, series };
            }
            rsiRef.current.series.applyOptions({ color: indColors.rsi });
            rsiRef.current.series.setData(studyPoints(times, rsi(closes, indParams.rsi.period)));
        } else rsiRef.current = dropPane(rsiRef.current);

        if (inds.macd && closes.length >= indParams.macd.slow + indParams.macd.signal) {
            if (!macdRef.current) {
                const pane = chart.addPane();
                pane.setStretchFactor(0.25);
                const hist = pane.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false });
                const line = trackLine(pane.addSeries(LineSeries, { color: indColors.macd, lineWidth: 1, priceLineVisible: false, lastValueVisible: false }));
                const signal = trackLine(pane.addSeries(LineSeries, { color: '#FF6D00', lineWidth: 1, priceLineVisible: false, lastValueVisible: false }));
                macdRef.current = { pane, line, signal, hist };
            }
            const m = macd(closes, indParams.macd.fast, indParams.macd.slow, indParams.macd.signal);
            macdRef.current.line.applyOptions({ color: indColors.macd });
            macdRef.current.line.setData(studyPoints(times, m.map((p) => p.line)));
            macdRef.current.signal.setData(studyPoints(times, m.map((p) => p.signal)));
            macdRef.current.hist.setData(
                times.flatMap((time, i) => {
                    const h = m[i].hist;
                    return h == null ? [] : [{ time, value: h, color: h >= 0 ? 'rgba(38, 166, 154, 0.6)' : 'rgba(239, 83, 80, 0.6)' }];
                }),
            );
        } else macdRef.current = dropPane(macdRef.current);
    }, [candles, inds, indParams, indColors]);

    // Oscillator panes for CCI / Stochastic / ADX (same create-feed-remove pattern)
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart || candles.length === 0) return;
        const closes = candles.map((c) => c.close);
        const highs = candles.map((c) => c.high);
        const lows = candles.map((c) => c.low);
        const times = candles.map((c) => c.time as UTCTimestamp | string);

        const dropPane = (ref: { pane: PaneApi } | null) => {
            if (!ref) return null;
            const idx = chart.panes().indexOf(ref.pane);
            if (idx > 0) chart.removePane(idx);
            return null;
        };
        const refLine = (series: ISeriesApi<'Line'>, price: number) => {
            series.createPriceLine({ price, color: '#787B86', lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: true, title: '' });
        };

        if (inds.cci && closes.length >= indParams.cci.period) {
            if (!cciRef.current) {
                const pane = chart.addPane();
                pane.setStretchFactor(0.25);
                const series = trackLine(pane.addSeries(LineSeries, { color: indColors.cci, lineWidth: 1, priceLineVisible: false, lastValueVisible: true }));
                refLine(series, 100);
                refLine(series, -100);
                cciRef.current = { pane, series };
            }
            cciRef.current.series.applyOptions({ color: indColors.cci });
            cciRef.current.series.setData(studyPoints(times, cci(highs, lows, closes, indParams.cci.period)));
        } else cciRef.current = dropPane(cciRef.current);

        if (inds.stoch && closes.length >= indParams.stoch.k + indParams.stoch.d) {
            if (!stochRef.current) {
                const pane = chart.addPane();
                pane.setStretchFactor(0.25);
                const k = trackLine(pane.addSeries(LineSeries, { color: indColors.stoch, lineWidth: 1, priceLineVisible: false, lastValueVisible: false }));
                const d = trackLine(pane.addSeries(LineSeries, { color: '#FF6D00', lineWidth: 1, priceLineVisible: false, lastValueVisible: false }));
                refLine(k, 80);
                refLine(k, 20);
                stochRef.current = { pane, k, d };
            }
            const s = stochastic(highs, lows, closes, indParams.stoch.k, indParams.stoch.d);
            stochRef.current.k.applyOptions({ color: indColors.stoch });
            stochRef.current.k.setData(studyPoints(times, s.k));
            stochRef.current.d.setData(studyPoints(times, s.d));
        } else stochRef.current = dropPane(stochRef.current);

        if (inds.adx && closes.length > 2 * indParams.adx.period) {
            if (!adxRef.current) {
                const pane = chart.addPane();
                pane.setStretchFactor(0.25);
                const adxLine = trackLine(pane.addSeries(LineSeries, { color: indColors.adx, lineWidth: 2, priceLineVisible: false, lastValueVisible: true }));
                const plus = trackLine(pane.addSeries(LineSeries, { color: '#26A69A', lineWidth: 1, priceLineVisible: false, lastValueVisible: false }));
                const minus = trackLine(pane.addSeries(LineSeries, { color: '#EF5350', lineWidth: 1, priceLineVisible: false, lastValueVisible: false }));
                refLine(adxLine, 25);
                adxRef.current = { pane, adx: adxLine, plus, minus };
            }
            const a = adx(highs, lows, closes, indParams.adx.period);
            adxRef.current.adx.applyOptions({ color: indColors.adx });
            adxRef.current.adx.setData(studyPoints(times, a.adx));
            adxRef.current.plus.setData(studyPoints(times, a.plusDI));
            adxRef.current.minus.setData(studyPoints(times, a.minusDI));
        } else adxRef.current = dropPane(adxRef.current);
    }, [candles, inds, indParams, indColors]);

    // Elliott wave labels as native chart markers (1-5 blue, A-B-C orange).
    // No clean impulse fit -> markers cleared instead of showing a wrong count.
    useEffect(() => {
        const series = candleRef.current;
        if (!series) return;
        if (!waveMarkersRef.current) waveMarkersRef.current = createSeriesMarkers(series, []);
        const markers = waveMarkersRef.current;
        if (!inds.elliott || candles.length < 30) {
            markers.setMarkers([]);
            return;
        }
        const labels = elliottWaves(
            zigzag(
                candles.map((c) => c.high),
                candles.map((c) => c.low),
                candles.map((c) => c.close),
                indParams.elliott.dev,
            ),
        );
        const times = candles.map((c) => c.time as UTCTimestamp | string);
        markers.setMarkers(
            labels.flatMap((l) => {
                const time = times[l.index];
                if (time == null) return [];
                const corrective = l.label === 'A' || l.label === 'B' || l.label === 'C';
                return [{
                    time,
                    position: l.position,
                    color: corrective ? '#FF6D00' : indColors.elliott,
                    shape: 'circle' as const,
                    text: l.label,
                }];
            }),
        );
    }, [candles, inds, indParams, indColors]);

    // Full-screen chart mode: the container grows via CSS and autoSize follows it.
    // Refit after layout settles so data is always in view. Close with Exit or Esc.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setExpanded(false);
        };
        window.addEventListener('keydown', onKey);
        if (!expanded) return () => window.removeEventListener('keydown', onKey);
        const frame = requestAnimationFrame(() => chartRef.current?.timeScale().fitContent());
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('keydown', onKey);
        };
    }, [expanded]);

    // Drawings persist per symbol + timeframe
    useEffect(() => {
        setDrawings(loadDrawings(symbol, range));
        setPatterns(loadPatterns(symbol, range));
        setDraftA(null);
        setPreviewB(null);
        setTool(null);
        setPatternDraft([]);
        setPatternPreview(null);
        setPatternTool(null);
    }, [symbol, range]);

    const deleteDrawing = (id: string) => {
        setDrawings((prev) => {
            const next = prev.filter((d) => d.id !== id);
            saveDrawings(symbol, range, next);
            return next;
        });
    };

    const clearDrawings = () => {
        setDrawings([]);
        saveDrawings(symbol, range, []);
        setDraftA(null);
        setPreviewB(null);
    };

    const cycleDrawingColor = (id: string) => {
        setDrawings((prev) => {
            const next = prev.map((d) => {
                if (d.id !== id) return d;
                const cur = drawingColor(d);
                const idx = PALETTE.indexOf(cur);
                return { ...d, color: PALETTE[(idx + 1 + PALETTE.length) % PALETTE.length] };
            });
            saveDrawings(symbol, range, next);
            return next;
        });
    };

    const pickTool = (t: DrawingTool) => {
        setTool((prev) => (prev === t ? null : t));
        setDraftA(null);
        setPreviewB(null);
        setPatternTool(null);
        setPatternDraft([]);
        setPatternPreview(null);
    };

    const pickPattern = (t: PatternTool) => {
        setPatternTool((prev) => (prev === t ? null : t));
        setPatternDraft([]);
        setPatternPreview(null);
        setTool(null);
        setDraftA(null);
        setPreviewB(null);
    };

    const cancelDrawing = () => {
        setTool(null);
        setDraftA(null);
        setPreviewB(null);
        setPatternTool(null);
        setPatternDraft([]);
        setPatternPreview(null);
    };

    const zoomBy = (factor: number) => {
        const ts = chartRef.current?.timeScale();
        if (!ts) return;
        const range = ts.getVisibleLogicalRange();
        if (!range) return;
        const next = zoomRange(range, factor);
        if (!next) return;
        // Never zoom past a 5-bar window: deeper looks like "missing data"
        const span = next.to - next.from;
        if (span < 5) {
            const center = (next.from + next.to) / 2;
            ts.setVisibleLogicalRange({ from: center - 2.5, to: center + 2.5 });
            return;
        }
        ts.setVisibleLogicalRange(next);
    };

    const resetView = () => chartRef.current?.timeScale().fitContent();
    const goLatest = () => chartRef.current?.timeScale().scrollToRealTime();

    const bumpHeight = (dir: 1 | -1) => {
        setHeightDelta((prev) => {
            const next = clampHeightDelta(prev + dir * 120);
            try { localStorage.setItem('tadawul-chart-height', String(next)); } catch { /* ignore */ }
            return next;
        });
    };

    const deletePattern = (id: string) => {
        setPatterns((prev) => {
            const next = prev.filter((d) => d.id !== id);
            savePatterns(symbol, range, next);
            return next;
        });
    };

    const clearPatterns = () => {
        setPatterns([]);
        savePatterns(symbol, range, []);
        setPatternDraft([]);
        setPatternPreview(null);
    };

    const first = candles.length > 0 ? candles[0] : null;
    const change = last && first && typeof first.open === 'number' ? last.close - first.open : null;
    const changePct = change != null && first?.open ? (change / first.open) * 100 : null;

    // ---- Drawing overlay geometry (SVG over the price pane) ----
    const chart = chartRef.current;
    const viewW = containerRef.current?.clientWidth ?? 0;
    const viewH = containerRef.current?.clientHeight ?? 480;
    const mainH = chart && chart.panes().length > 0 ? chart.panes()[0].getHeight() : 0;
    // Keep drawings clear of the price axis so level labels never sit on top of it.
    const axisW = chart ? chart.priceScale('right').width() : 0;
    const rightEdge = Math.max(0, viewW - axisW);
    const clipId = `drawclip-${symbol.replace(/[^A-Za-z0-9]/g, '')}`;
    const X = (t: string | number): number | null =>
        chart ? chart.timeScale().timeToCoordinate(t as UTCTimestamp) : null;
    const Y = (p: number): number | null => candleRef.current?.priceToCoordinate(p) ?? null;

    const drawingElements = (d: Drawing, keyPrefix: string, preview = false) => {
        const els: React.ReactNode[] = [];
        const dc = drawingColor(d);
        const x1 = X(d.a.time);
        const y1 = Y(d.a.price);
        const x2 = X(d.b.time);
        const y2 = Y(d.b.price);
        if (x1 == null || y1 == null || x2 == null || y2 == null) return null;
        const dot = (x: number, y: number, k: string, c: string) => (
            <circle key={k} cx={x} cy={y} r={4} fill={c} opacity={preview ? 0.6 : 1} />
        );
        if (d.tool === 'trend') {
            const dx = x2 - x1;
            const ex = rightEdge;
            const ey = Math.abs(dx) > 1 ? y1 + ((y2 - y1) / dx) * (rightEdge - x1) : y1;
            els.push(<line key={`${keyPrefix}-l`} x1={x1} y1={y1} x2={ex} y2={ey} stroke={dc} strokeWidth={2} opacity={preview ? 0.6 : 1} />);
            els.push(dot(x1, y1, `${keyPrefix}-a`, dc));
            els.push(dot(x2, y2, `${keyPrefix}-b`, dc));
        } else if (d.tool === 'fibo') {
            let lastLabelY: number | null = null;
            for (const { ratio, price } of fibLevelPrices(d.a, d.b)) {
                const y = Y(price);
                if (y == null) continue;
                els.push(<line key={`${keyPrefix}-f${ratio}`} x1={x1} y1={y} x2={rightEdge} y2={y} stroke={dc} strokeWidth={1} opacity={preview ? 0.6 : 0.9} />);
                // Declutter: skip labels stacked on top of each other
                if (lastLabelY != null && Math.abs(y - lastLabelY) < 14) continue;
                lastLabelY = y;
                els.push(
                    <text key={`${keyPrefix}-t${ratio}`} x={rightEdge - 4} y={y - 4} textAnchor="end" fontSize={11} fill={dc}>
                        {ratio} ({price.toFixed(2)})
                    </text>,
                );
            }
            els.push(dot(x1, y1, `${keyPrefix}-a`, dc));
            els.push(dot(x2, y2, `${keyPrefix}-b`, dc));
        } else {
            const { corners, midPrice } = gannGuides(d.a, d.b);
            const px = corners.map((c) => X(c.time));
            const top = Y(Math.max(d.a.price, d.b.price));
            const bot = Y(Math.min(d.a.price, d.b.price));
            const mid = Y(midPrice);
            if (px.some((v) => v == null) || top == null || bot == null || mid == null) return null;
            const [xa, xb] = [px[0] as number, px[1] as number];
            const rx = Math.min(xa, xb);
            const rw = Math.abs(xb - xa);
            els.push(<rect key={`${keyPrefix}-r`} x={rx} y={top} width={rw} height={bot - top} fill="none" stroke={dc} strokeWidth={1.5} opacity={preview ? 0.6 : 1} />);
            els.push(<line key={`${keyPrefix}-d1`} x1={xa} y1={top} x2={xb} y2={bot} stroke={dc} strokeWidth={1} opacity={0.7} />);
            els.push(<line key={`${keyPrefix}-d2`} x1={xa} y1={bot} x2={xb} y2={top} stroke={dc} strokeWidth={1} opacity={0.7} />);
            els.push(<line key={`${keyPrefix}-mh`} x1={xa} y1={mid} x2={xb} y2={mid} stroke={dc} strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />);
            els.push(<line key={`${keyPrefix}-mv`} x1={(xa + xb) / 2} y1={top} x2={(xa + xb) / 2} y2={bot} stroke={dc} strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />);
            els.push(dot(x1, y1, `${keyPrefix}-a`, dc));
            els.push(dot(x2, y2, `${keyPrefix}-b`, dc));
        }
        return els;
    };

    const draftPair: Drawing | null =
        draftA && previewB ? { id: 'draft', tool: tool ?? 'trend', a: draftA, b: previewB } : null;
    const draftSingle: DrawPoint | null = draftA && !previewB ? draftA : null;
    const patternDraftPair: PatternDrawing | null =
        patternTool && patternDraft.length > 0 && patternPreview
            ? { id: 'patterndraft', pattern: patternTool, pts: [...patternDraft, patternPreview] }
            : null;
    const patternDraftDots: DrawPoint[] = patternTool && patternDraft.length > 0 && !patternPreview ? patternDraft : [];

    // ---- Manual pattern geometry (TradingView-style patterns panel) ----
    const timeIndex = new Map<string, number>();
    candles.forEach((c, i) => timeIndex.set(String(c.time), i));
    const PATTERN_COLORS: Record<string, string> = { patterns: '#B2B5BE', elliott: '#4FC3F7', cycles: '#787B86' };

    const patternElements = (d: PatternDrawing, keyPrefix: string, preview = false) => {
        const def = patternById(d.pattern);
        const color = def.group === 'elliott' ? PATTERN_COLORS.elliott : def.group === 'cycles' ? PATTERN_COLORS.cycles : PATTERN_COLORS.patterns;
        const els: React.ReactNode[] = [];
        const op = preview ? 0.6 : 1;
        const dot = (x: number, y: number, k: string, c: string = color) => (
            <circle key={k} cx={x} cy={y} r={4} fill={c} opacity={op} />
        );
        const tag = (x: number, y: number, k: string, text: string) => (
            <text key={k} x={x} y={y - 8} textAnchor="middle" fontSize={12} fontWeight={700} fill={color} opacity={op}>
                {text}
            </text>
        );
        const pts = d.pts.map((p) => ({ x: X(p.time), y: Y(p.price), p }));
        if (def.kind === 'vlines') {
            if (pts.length < 2) return null;
            const a = timeIndex.get(String(d.pts[0].time));
            const b = timeIndex.get(String(d.pts[1].time));
            if (a == null || b == null) return null;
            for (const idx of cycleIndices(candles.length, a, b)) {
                const x = X(candles[idx].time as UTCTimestamp | string);
                if (x == null) continue;
                els.push(<line key={`${keyPrefix}-c${idx}`} x1={x} y1={0} x2={x} y2={mainH} stroke={color} strokeWidth={1} strokeDasharray="4 3" opacity={op} />);
            }
            return els;
        }
        if (def.kind === 'sine') {
            if (pts.length < 2 || pts.some((q) => q.x == null || q.y == null)) return null;
            const [p0, p1] = pts as { x: number; y: number; p: DrawPoint }[];
            const span = p1.x - p0.x;
            if (Math.abs(span) < 4) return null;
            const amp = Math.abs(p1.y - p0.y) / 2 || 8;
            const mid = (p0.y + p1.y) / 2;
            const phase0 = p0.y >= mid ? Math.PI / 2 : -Math.PI / 2;
            const xEnd = Math.min(p0.x + span * 3, rightEdge);
            let path = '';
            for (let x = p0.x; x <= xEnd; x += 4) {
                const y = mid + amp * Math.sin((Math.PI * (x - p0.x)) / span + phase0);
                path += `${x === p0.x ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `;
            }
            els.push(<path key={`${keyPrefix}-s`} d={path} fill="none" stroke="#BA68C8" strokeWidth={1.5} opacity={op} />);
            els.push(dot(p0.x, p0.y, `${keyPrefix}-a`, '#BA68C8'));
            els.push(dot(p1.x, p1.y, `${keyPrefix}-b`, '#BA68C8'));
            return els;
        }
        // Point-based tools: dots + labels always, connectors when available
        pts.forEach((q, i) => {
            if (q.x == null || q.y == null) return;
            els.push(dot(q.x, q.y, `${keyPrefix}-d${i}`, color));
            const label = def.pointLabels[i];
            if (label) els.push(tag(q.x, q.y, `${keyPrefix}-t${i}`, label));
        });
        const seg = (i: number, j: number, k: string, dashed = false, c = color) => {
            const a = pts[i];
            const b = pts[j];
            if (!a || !b || a.x == null || a.y == null || b.x == null || b.y == null) return;
            els.push(<line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={c} strokeWidth={1.5} opacity={op} {...(dashed ? { strokeDasharray: '5 3' } : {})} />);
        };
        if (def.kind === 'poly') {
            for (let i = 0; i + 1 < pts.length; i++) seg(i, i + 1, `${keyPrefix}-s${i}`);
        } else if (def.kind === 'hs') {
            for (let i = 0; i + 1 < pts.length; i++) seg(i, i + 1, `${keyPrefix}-s${i}`);
            if (pts.length >= 4 && pts[1].x != null && pts[3].x != null) {
                const n1 = pts[1] as { x: number; y: number };
                const n2 = pts[3] as { x: number; y: number };
                els.push(<line key={`${keyPrefix}-neck`} x1={n1.x} y1={n1.y} x2={rightEdge} y2={n2.y + ((n2.y - n1.y) / Math.max(1, n2.x - n1.x)) * (rightEdge - n1.x)} stroke="#F23645" strokeWidth={1.5} strokeDasharray="5 3" opacity={op} />);
            }
        } else if (def.kind === 'triangle-lines') {
            const ray = (i: number, j: number, k: string, c: string) => {
                const a = pts[i];
                const b = pts[j];
                if (!a || !b || a.x == null || a.y == null || b.x == null || b.y == null) return;
                const dx = (b.x as number) - (a.x as number);
                const ex = rightEdge;
                const ey = Math.abs(dx) > 1 ? (a.y as number) + (((b.y as number) - (a.y as number)) / dx) * (rightEdge - (a.x as number)) : (a.y as number);
                els.push(<line key={k} x1={a.x} y1={a.y} x2={ex} y2={ey} stroke={c} strokeWidth={1.5} opacity={op} />);
            };
            ray(0, 1, `${keyPrefix}-up`, '#EF5350');
            ray(2, 3, `${keyPrefix}-lo`, '#26A69A');
        }
        return els;
    };

    return (
        <div className={expanded ? 'fixed inset-0 z-[70] overflow-y-auto bg-page/95 p-3 backdrop-blur-sm sm:p-6' : ''}>
            <div className={expanded ? 'card mx-auto max-w-[1400px] p-3' : ''}>
            <div className="mb-2 flex flex-wrap items-center gap-3 px-1 pt-1">
                <div className="flex gap-1">
                    {RANGE_IDS.map((id) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => changeRange(id)}
                            aria-pressed={range === id}
                            className={range === id ? 'pill is-up' : 'pill'}
                        >
                            {lang === 'ar' ? CANDLE_RANGES[id].labelAr : CANDLE_RANGES[id].label}
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setMenuOpen((v) => !v)}
                        aria-expanded={menuOpen}
                        className={activeIndCount ? 'pill is-up' : 'pill'}
                    >
                        {tx(lang, 'chart.indicators')}{activeIndCount ? ` · ${activeIndCount}` : ''}
                    </button>
                    {menuOpen && (
                        <div className="card absolute z-20 mt-1 flex max-h-80 min-w-60 flex-col gap-0.5 overflow-y-auto p-1.5">
                            <div className="flex items-center gap-1 rounded-[10px] px-2 py-1">
                                <span className="flex-1 text-[12.5px] font-semibold text-faint">{tx(lang, 'chart.lineWidth')}</span>
                                <button type="button" aria-label={tx(lang, 'chart.lineWidth')} onClick={() => stepLineWidth(-1)} className="pill h-6 px-2">−</button>
                                <span className="mono num min-w-6 text-center text-[12px] font-semibold">{lineWidth}</span>
                                <button type="button" aria-label={tx(lang, 'chart.lineWidth')} onClick={() => stepLineWidth(1)} className="pill h-6 px-2">+</button>
                            </div>
                            <button
                                type="button"
                                onClick={togglePriceLine}
                                aria-pressed={priceLine}
                                className="search-item-link w-full"
                            >
                                <span className={`flex size-4 items-center justify-center rounded border ${priceLine ? 'border-brand-ink bg-brand-soft text-brand-ink' : 'border-line-strong text-transparent'}`}>✓</span>
                                <span className="flex-1 text-start text-[13px] font-semibold">{tx(lang, 'chart.priceLine')}</span>
                            </button>
                            <div className="mx-1 my-1 border-t border-line" />
                            {INDICATORS.map(({ key, label, labelAr, params, noColor }) => (
                                <div key={key} className="rounded-[10px] px-1 py-0.5">
                                    <button
                                        type="button"
                                        onClick={() => toggleInd(key)}
                                        aria-pressed={inds[key]}
                                        className="search-item-link w-full"
                                    >
                                        <span className={`flex size-4 items-center justify-center rounded border ${inds[key] ? 'border-brand-ink bg-brand-soft text-brand-ink' : 'border-line-strong text-transparent'}`}>✓</span>
                                        <span className="flex-1 text-start text-[13px] font-semibold">{lang === 'ar' && labelAr ? labelAr : label}</span>
                                        {!noColor && (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); cycleColor(key); }}
                                            title={indColors[key]}
                                            aria-label={`Change ${label} color`}
                                            className="size-5 shrink-0 rounded-full border border-line-strong"
                                            style={{ backgroundColor: indColors[key] }}
                                        />
                                        )}
                                        <span className="mono text-[11.5px] text-faint">{params.map((p) => indParams[key][p.key]).join(' · ')}</span>
                                    </button>
                                    {inds[key] && (
                                        <div className="flex flex-wrap gap-x-3 gap-y-1 px-6 pb-1.5 pt-0.5">
                                            {params.map((p) => (
                                                <span key={p.key} className="flex items-center gap-1">
                                                    <span className="text-[11px] text-faint">{p.labelKey ? tx(lang, p.labelKey) : p.label}</span>
                                                    <button type="button" aria-label={`Decrease ${label} ${p.label}`} onClick={() => stepParam(key, p, -1)} className="pill h-6 px-2">−</button>
                                                    <span className="mono num min-w-8 text-center text-[12px] font-semibold">{indParams[key][p.key]}</span>
                                                    <button type="button" aria-label={`Increase ${label} ${p.label}`} onClick={() => stepParam(key, p, 1)} className="pill h-6 px-2">+</button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {drawings.length > 0 && (
                                <>
                                    <div className="mx-1 my-1 border-t border-line" />
                                    <p className="px-2 pt-0.5 text-[11px] font-semibold text-faint">{tx(lang, 'draw.list')} · {drawings.length}</p>
                                    {drawings.map((d) => (
                                        <div key={d.id} className="search-item-link w-full">
                                            <button
                                                type="button"
                                                onClick={() => cycleDrawingColor(d.id)}
                                                title={drawingColor(d)}
                                                aria-label="Change drawing color"
                                                className="size-4 shrink-0 rounded-full border border-line-strong"
                                                style={{ backgroundColor: drawingColor(d) }}
                                            />
                                            <span className="flex-1 truncate text-start text-[12.5px]">
                                                {tx(lang, d.tool === 'trend' ? 'draw.trend' : d.tool === 'fibo' ? 'draw.fibo' : 'draw.gann')} · {d.a.price.toFixed(2)} → {d.b.price.toFixed(2)}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => deleteDrawing(d.id)}
                                                aria-label="Delete drawing"
                                                className="rounded px-1.5 text-faint hover:bg-hover hover:text-foreground"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={clearDrawings} className="search-item-link w-full">
                                        <span className="flex-1 text-start text-[12.5px] text-down">{tx(lang, 'draw.clear')}</span>
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex gap-1">
                    {(['trend', 'fibo', 'gann'] as DrawingTool[]).map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => pickTool(t)}
                            aria-pressed={tool === t}
                            title={tx(lang, t === 'trend' ? 'draw.trend' : t === 'fibo' ? 'draw.fibo' : 'draw.gann')}
                            className={tool === t ? 'pill is-up' : 'pill'}
                        >
                            {tx(lang, t === 'trend' ? 'draw.trend' : t === 'fibo' ? 'draw.fibo' : 'draw.gann')}
                        </button>
                    ))}
                    {(tool || draftA || patternTool || patternDraft.length > 0) && (
                        <button type="button" onClick={cancelDrawing} className="pill">
                            {tx(lang, 'draw.cancel')}
                        </button>
                    )}
                </div>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setPatternsOpen((v) => !v)}
                        aria-expanded={patternsOpen}
                        className={patternTool ? 'pill is-up' : 'pill'}
                    >
                        {tx(lang, 'draw.patterns')}{patternTool ? ` · ${patternById(patternTool).label}` : patterns.length ? ` · ${patterns.length}` : ''}
                    </button>
                    {patternsOpen && (
                        <div className="card absolute z-20 mt-1 flex max-h-80 min-w-60 flex-col gap-0.5 overflow-y-auto p-1.5">
                            {(['patterns', 'elliott', 'cycles'] as const).map((g) => (
                                <div key={g}>
                                    <p className="px-2 pt-1.5 text-[11px] font-semibold text-faint">{tx(lang, g === 'patterns' ? 'draw.gPatterns' : g === 'elliott' ? 'draw.gElliott' : 'draw.gCycles')}</p>
                                    {PATTERNS.filter((p) => p.group === g).map((p) => (
                                        <button
                                            key={p.tool}
                                            type="button"
                                            onClick={() => { pickPattern(p.tool); setPatternsOpen(false); }}
                                            aria-pressed={patternTool === p.tool}
                                            className="search-item-link w-full"
                                        >
                                            <span className={`flex size-4 items-center justify-center rounded border ${patternTool === p.tool ? 'border-brand-ink bg-brand-soft text-brand-ink' : 'border-line-strong text-transparent'}`}>✓</span>
                                            <span className="flex-1 text-start text-[13px] font-semibold">{lang === 'ar' ? p.ar : p.label}</span>
                                            <span className="mono text-[11.5px] text-faint">{p.clicks}✦</span>
                                        </button>
                                    ))}
                                </div>
                            ))}
                            {patterns.length > 0 && (
                                <>
                                    <div className="mx-1 my-1 border-t border-line" />
                                    {patterns.map((d) => (
                                        <div key={d.id} className="search-item-link w-full">
                                            <span className="flex-1 truncate text-start text-[12.5px]">
                                                {patternById(d.pattern).label} · {d.pts.length}✦
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => deletePattern(d.id)}
                                                aria-label="Delete pattern"
                                                className="rounded px-1.5 text-faint hover:bg-hover hover:text-foreground"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => { clearPatterns(); }} className="search-item-link w-full">
                                        <span className="flex-1 text-start text-[12.5px] text-down">{tx(lang, 'draw.clear')}</span>
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
                    {tool && (
                    <span className="text-[11.5px] text-brand-ink">
                        {draftA ? tx(lang, 'draw.hint2') : tx(lang, 'draw.hint1')}
                    </span>
                )}
                {patternTool && (
                    <span className="text-[11.5px] text-brand-ink">
                        {patternDraft.length}/{patternById(patternTool).clicks} · {tx(lang, 'draw.hint1')}
                    </span>
                )}
                {last && (
                    <p className="num text-[15px] font-bold">
                        {last.close.toFixed(2)} <span className="text-[12px font-normal] text-faint">SAR</span>{' '}
                        {changePct != null && (
                            <span className={changePct >= 0 ? 'text-up' : 'text-down'}>
                                {changePct >= 0 ? '+' : ''}
                                {changePct.toFixed(2)}%
                            </span>
                        )}
                        {live && source === 'live' && <span className="ms-2 text-[11px] font-semibold text-up">● {tx(lang, 'chart.live')}</span>}
                        {live && source === 'delayed' && <span className="ms-2 text-[11px] font-semibold text-down">● {tx(lang, 'chart.delayed')}</span>}
                    </p>
                )}
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    title={expanded ? tx(lang, 'chart.exit') : tx(lang, 'chart.expand')}
                    aria-label={expanded ? tx(lang, 'chart.exit') : tx(lang, 'chart.expand')}
                    aria-pressed={expanded}
                    className={expanded ? 'pill is-up' : 'pill'}
                >
                    {expanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                    {expanded ? tx(lang, 'chart.exit') : tx(lang, 'chart.expand')}
                </button>
                <div className="flex gap-1" role="group" aria-label="Chart view">
                    <button type="button" onClick={() => zoomBy(0.7)} title={tx(lang, 'chart.zoomIn')} aria-label={tx(lang, 'chart.zoomIn')} className="pill h-9 w-9 justify-center px-0">
                        <ZoomIn className="size-3.5" />
                    </button>
                    <button type="button" onClick={() => zoomBy(1.43)} title={tx(lang, 'chart.zoomOut')} aria-label={tx(lang, 'chart.zoomOut')} className="pill h-9 w-9 justify-center px-0">
                        <ZoomOut className="size-3.5" />
                    </button>
                    <button type="button" onClick={resetView} title={tx(lang, 'chart.reset')} aria-label={tx(lang, 'chart.reset')} className="pill h-9 w-9 justify-center px-0">
                        <RotateCcw className="size-3.5" />
                    </button>
                    <button type="button" onClick={goLatest} title={tx(lang, 'chart.latest')} aria-label={tx(lang, 'chart.latest')} className="pill h-9 w-9 justify-center px-0">
                        <ArrowRightToLine className="size-3.5" />
                    </button>
                    {!expanded && (
                        <>
                            <button type="button" onClick={() => bumpHeight(1)} title={tx(lang, 'chart.taller')} aria-label={tx(lang, 'chart.taller')} className="pill h-9 w-9 justify-center px-0">
                                <UnfoldVertical className="size-3.5" />
                            </button>
                            <button type="button" onClick={() => bumpHeight(-1)} title={tx(lang, 'chart.shorter')} aria-label={tx(lang, 'chart.shorter')} className="pill h-9 w-9 justify-center px-0">
                                <FoldVertical className="size-3.5" />
                            </button>
                        </>
                    )}
                </div>
                <a href={tvUrl} target="_blank" rel="noopener noreferrer" className="ms-auto text-[12.5px] text-brand-ink hover:underline">
                    {tx(lang, 'stock.openTV')}
                </a>
            </div>
            <div className="relative">
                <div
                    ref={containerRef}
                    className="w-full"
                    style={{ height: expanded ? '78vh' : CHART_BASE_HEIGHT + heightDelta, cursor: tool || patternTool ? 'crosshair' : undefined }}
                    onDoubleClick={() => {
                        // Double-click restores the full view (disabled while placing drawings)
                        if (!toolRef.current && !patternToolRef.current) resetView();
                    }}
                />
                {(() => {
                    const c = hover?.candle ?? last;
                    if (!c) return null;
                    const up = c.close >= c.open;
                    const item = (k: string, v: number, color?: string) => (
                        <span key={k} className="num flex items-center gap-1">
                            <span className="text-faint">{k}</span>
                            <span className={color ?? 'text-foreground'}>{v.toFixed(2)}</span>
                        </span>
                    );
                    return (
                        <div className="pointer-events-none absolute left-2 top-2 z-10 flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-[10px] bg-card/80 px-3 py-1.5 text-[12px] backdrop-blur-sm">
                            <span className="num font-semibold text-faint">
                                {typeof c.time === 'number'
                                    ? riyadhDateTime.format(c.time * 1000).replace(',', ' ·')
                                    : formatTickTime(c.time)}
                            </span>
                            {item('O', c.open)}
                            {item('H', c.high)}
                            {item('L', c.low)}
                            {item('C', c.close, up ? 'text-up' : 'text-down')}
                        </div>
                    );
                })()}
                {viewW > 0 && mainH > 0 && (
                    <svg className="pointer-events-none absolute inset-0" width={viewW} height={viewH}>
                        <defs>
                            <clipPath id={clipId}><rect x={0} y={0} width={viewW} height={mainH} /></clipPath>
                        </defs>
                        <g clipPath={`url(#${clipId})`}>
                            {drawings.map((d) => drawingElements(d, d.id))}
                            {draftPair && drawingElements(draftPair, 'draft', true)}
                            {draftSingle && (() => {
                                const x = X(draftSingle.time);
                                const y = Y(draftSingle.price);
                                return x != null && y != null
                                    ? <circle cx={x} cy={y} r={5} fill="none" stroke="#fff" strokeWidth={1.5} /> : null;
                            })()}
                            {patterns.map((d) => patternElements({ ...d, pts: d.pts }, d.id))}
                            {patternDraftPair && patternElements(patternDraftPair, 'patterndraft', true)}
                            {patternDraftDots.map((p, i) => {
                                const x = X(p.time);
                                const y = Y(p.price);
                                return x != null && y != null
                                    ? <circle key={`pd${i}`} cx={x} cy={y} r={4} fill="#B2B5BE" opacity={0.8} /> : null;
                            })}
                        </g>
                    </svg>
                )}
                {loading && (
                    <div className="absolute inset-0 grid place-items-center">
                        <span className="h-24 w-full animate-pulse rounded-lg bg-hover/60" />
                    </div>
                )}
                {hover && (() => {
                    const w = 176;
                    const h = 132;
                    const x = hover.x + 16 + w > viewW ? hover.x - w - 16 : hover.x + 16;
                    const y = Math.min(Math.max(hover.y - 20, 8), Math.max(8, viewH - h - 8));
                    const c = hover.candle;
                    const rows: [string, number][] = [['O', c.open], ['H', c.high], ['L', c.low], ['C', c.close]];
                    return (
                        <div
                            className="card pointer-events-none absolute z-10 p-2.5 text-[12px]"
                            style={{ left: x, top: y, width: w }}
                        >
                            <p className="num mb-1.5 truncate font-semibold text-foreground">
                                {typeof c.time === 'number'
                                    ? riyadhDateTime.format(c.time * 1000).replace(',', ' ·')
                                    : formatTickTime(c.time)}
                            </p>
                            {rows.map(([k, v]) => (
                                <p key={k} className="num flex items-center justify-between gap-3 text-faint">
                                    <span>{k}</span>
                                    <span className={k === 'C' ? (c.close >= c.open ? 'text-up' : 'text-down') : 'text-foreground'}>
                                        {v.toFixed(2)}
                                    </span>
                                </p>
                            ))}
                        </div>
                    );
                })()}
                {failed && !loading && (
                    <div className="empty-state py-14">
                        <h3>{tx(lang, 'chart.unavailable')}</h3>
                        <p className="max-w-80 text-[13px]">{tx(lang, 'chart.unavailableSub')}</p>
                    </div>
                )}
            </div>
            </div>
        </div>
    );
}
