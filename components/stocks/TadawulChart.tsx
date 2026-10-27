'use client';

import { useEffect, useRef, useState, useCallback, type PointerEvent as ReactPointerEvent } from 'react';
import { 
    ArrowRightToLine, FoldVertical, Maximize2, Minimize2, RefreshCw, 
    RotateCcw, UnfoldVertical, ZoomIn, ZoomOut, Camera, HelpCircle 
} from 'lucide-react';
import { CHART_BASE_HEIGHT, clampHeightDelta, GLOBAL_TF_KEY, resolveTimeframe, zoomRange } from '@/lib/chart-view';
import {
    createChart,
    createSeriesMarkers,
    CandlestickSeries,
    HistogramSeries,
    LineSeries,
    LineStyle,
    ColorType,
    type IChartApi,
    type ISeriesApi,
    type ISeriesMarkersPluginApi,
    type UTCTimestamp,
    type BusinessDay,
    type LineWidth,
    type SeriesMarker,
    type Time,
} from 'lightweight-charts';

type PaneApi = ReturnType<IChartApi['addPane']>;
declare global {
    interface Window {
        __ewdbg?: { sym: string; candles: number; labels: number; held: number };
    }
}
import { CANDLE_RANGES, OhlcCandle, validCandles, type CandleRangeId } from '@/lib/yahoo';
import { bollinger, cci, donchian, elliottMarkers, elliottWaveLabels, ema, macd, rsi, sma, stochastic, adx, studyPoints, autoDevPct, ELLIOTT_ENGINE_VERSION } from '@/lib/indicators';
import { handCount, handCountMarkers } from '@/lib/hand-elliott';
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
    COUNT_GLYPHS,
    COUNT_CLICKS,
    buildTransferPayload,
    parseTransferPayload,
    TEXT_MAX,
    loadTexts,
    makeTextNote,
    moveTextNote,
    saveTexts,
    updateTextNoteText,
    type TextNote,
    type CountDegree,
    type CountKind,
    type Drawing,
    type DrawingTool,
    type DrawPoint,
    type PatternDrawing,
    type PatternTool,
} from '@/lib/drawings';
import { getMarket, isMarketOpen } from '@/lib/markets';
import { detectPatterns, patternBarTime, projectToEdge, type DetectedPattern } from '@/lib/patterns';
import { getTadawulCandles } from '@/lib/actions/yahoo.actions';
import { getTwelveIntraday } from '@/lib/actions/twelvedata.actions';

const RANGE_IDS = Object.keys(CANDLE_RANGES) as CandleRangeId[];
// Refetch cadence: Twelve Data follows its 15s server TTL (polling faster
// re-reads the same payload and burns free quota — it dies in minutes at 1s);
// Yahoo candles are fetched fresh server-side, so 60s is a throttle so polls
// don't hammer Yahoo — not a cache TTL.
// A separate 1s UI tick keeps the "updated Ns ago" label feeling live.
const POLL_MS = 15_000;
const DELAYED_REFETCH_MS = 60_000;
// Closed-market cadence: no live ticks to follow, but every session still
// prints new bars — a tab left open for days must keep picking them up.
const CLOSED_REFETCH_MS = 5 * 60_000;
const AGE_TICK_MS = 1_000;

type IndKey = 'ma20' | 'ema50' | 'bb' | 'sr' | 'rsi' | 'macd' | 'cci' | 'stoch' | 'adx' | 'elliott' | 'volume';
type ParamDef = { key: string; label: string; labelKey?: 'param.length' | 'param.mult' | 'param.fast' | 'param.slow' | 'param.signal' | 'param.dev'; def: number; min: number; max: number; step?: number };
const INDICATORS: { key: IndKey; label: string; labelAr?: string; params: ParamDef[]; defOn?: boolean; noColor?: boolean }[] = [
    { key: 'ma20', label: 'MA', params: [{ key: 'period', label: 'Length', labelKey: 'param.length', def: 20, min: 2, max: 200 }] },
    { key: 'ema50', label: 'EMA', params: [{ key: 'period', label: 'Length', labelKey: 'param.length', def: 50, min: 2, max: 200 }] },
    { key: 'bb', label: 'Bollinger', params: [{ key: 'period', label: 'Length', labelKey: 'param.length', def: 20, min: 2, max: 100 }, { key: 'mult', label: 'Mult', labelKey: 'param.mult', def: 2, min: 0.5, max: 5, step: 0.5 }] },
    { key: 'sr', label: 'S/R zones', labelAr: 'دعم/مقاومة', params: [{ key: 'period', label: 'Length', labelKey: 'param.length', def: 100, min: 20, max: 500 }], noColor: true },
    { key: 'rsi', label: 'RSI', params: [{ key: 'period', label: 'Length', labelKey: 'param.length', def: 14, min: 2, max: 100 }] },
    { key: 'macd', label: 'MACD', params: [{ key: 'fast', label: 'Fast', labelKey: 'param.fast', def: 12, min: 1, max: 100 }, { key: 'slow', label: 'Slow', labelKey: 'param.slow', def: 26, min: 2, max: 200 }, { key: 'signal', label: 'Signal', labelKey: 'param.signal', def: 9, min: 1, max: 50 }] },
    { key: 'cci', label: 'CCI', params: [{ key: 'period', label: 'Length', labelKey: 'param.length', def: 20, min: 2, max: 100 }] },
    { key: 'stoch', label: 'Stochastic', params: [{ key: 'k', label: '%K', def: 14, min: 1, max: 100 }, { key: 'd', label: '%D', def: 3, min: 1, max: 50 }] },
    { key: 'adx', label: 'ADX', params: [{ key: 'period', label: 'Length', labelKey: 'param.length', def: 14, min: 2, max: 100 }] },
    { key: 'elliott', label: 'Elliott waves', labelAr: 'موجات اليوت', params: [{ key: 'dev', label: 'Deviation', labelKey: 'param.dev', def: 5, min: 1, max: 20, step: 0.5 }], defOn: true },
    { key: 'volume', label: 'Volume', labelAr: 'الحجم', params: [], defOn: true, noColor: true },
];
const DEFAULT_PARAMS: Record<IndKey, Record<string, number>> = Object.fromEntries(
    INDICATORS.map(({ key, params }) => [key, Object.fromEntries(params.map((p) => [p.key, p.def]))]),
) as Record<IndKey, Record<string, number>>;
const PALETTE = ['#2962FF', '#FF6D00', '#26A69A', '#EF5350', '#7E57C2', '#00BCD4', '#EAB308', '#F0F3FA', '#0B6B3A', '#B71C1C'];
const DEFAULT_COLORS: Record<string, string> = {
    ma20: '#2962FF', ema50: '#FF6D00', bb: '#787B86', sr: '#787B86', srUpper: '#EF5350', srLower: '#26A69A', rsi: '#7E57C2',
    macd: '#2962FF', cci: '#00BCD4', stoch: '#2962FF', adx: '#AD8CFF', elliott: '#2962FF', volume: '#26A69A',
};
const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
const CANDLE_UP_DEFAULT = '#26A69A';
const CANDLE_DOWN_DEFAULT = '#EF5350';
const CHART_BG_DEFAULT = 'transparent';
const CHART_BG_OPTIONS = ['transparent', '#0B0E11', '#131722', '#1E222D', '#FFFFFF', '#F0F3FA'];
const isBg = (v: unknown): v is string => v === 'transparent' || isHex(v);
const IND_STORAGE = 'tadawul-indicators-v2';
// Bumped when a new default must reach existing users: payloads saved before
// version 3 predate auto Elliott numbering (it defaulted off), so the
// migration switches it on once. Anything the user saves afterwards carries
// version 3, and from then on an explicit off is respected.
const IND_STORAGE_VERSION = 3;
const SR_COLOR_KEYS = ['srUpper', 'srLower'] as const;
const loadState = (): { enabled: Record<IndKey, boolean>; params: Record<IndKey, Record<string, number>>; colors: Record<string, string> } => {
    const enabled = Object.fromEntries(INDICATORS.map(({ key, defOn }) => [key, defOn ?? false])) as Record<IndKey, boolean>;
    const params = structuredClone(DEFAULT_PARAMS);
    const colors = { ...DEFAULT_COLORS };
    try {
        const saved = JSON.parse(localStorage.getItem(IND_STORAGE) ?? '{}') as {
            version?: number;
            enabled?: Partial<Record<IndKey, boolean>>;
            params?: Partial<Record<IndKey, Record<string, number>>>;
            colors?: Partial<Record<string, string>>;
        };
        for (const { key } of INDICATORS) {
            if (typeof saved.enabled?.[key] === 'boolean') enabled[key] = saved.enabled[key] as boolean;
            for (const [pk, pv] of Object.entries(saved.params?.[key] ?? {})) {
                if (typeof pv === 'number' && Number.isFinite(pv) && pk in params[key]) params[key][pk] = pv;
            }
            if (isHex(saved.colors?.[key])) colors[key] = saved.colors[key] as string;
        }
        for (const ck of SR_COLOR_KEYS) {
            if (isHex(saved.colors?.[ck])) colors[ck] = saved.colors[ck] as string;
        }
        if ((saved.version ?? 0) < IND_STORAGE_VERSION) enabled.elliott = true;
    } catch { /* fresh defaults */ }
    return { enabled, params, colors };
};

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
// candle charts. Data: Yahoo Finance (delayed, SAR) + Twelve Data live trial.
// Intraday refetches while the market is open (live 15s / delayed 60s — the
// server cache TTLs), and a 1s ticker keeps the data-age label feeling live.
export default function TadawulChart({ symbol, tvUrl, lang, initialRange = '1m' }: { symbol: string; tvUrl: string; lang: Lang; initialRange?: CandleRangeId }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null);
    const [range, setRange] = useState<CandleRangeId>(initialRange);

    // Timeframe survives refreshes/bookmarks via ?tf= (no server round-trip).
    // The explicitly picked frame is also remembered globally, so switching
    // symbols (whose links carry no ?tf=) never snaps the frame — numbering
    // and studies stay on the frame the user chose.
    const changeRange = (id: CandleRangeId) => {
        setRange(id);
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('tf', id);
            window.history.replaceState(null, '', url);
            localStorage.setItem(GLOBAL_TF_KEY, id);
        } catch { /* ignore */ }
    };
    // On symbol switch only an explicit ?tf= may change the frame; otherwise
    // the current frame is kept as-is, so 15m never snaps back to 1m and the
    // Elliott count continues on the same frame for the new company.
    useEffect(() => {
        try {
            const url = new URL(window.location.href);
            const next = resolveTimeframe({
                urlTf: url.searchParams.get('tf'),
                globalTf: localStorage.getItem(GLOBAL_TF_KEY),
                current: rangeRef.current,
            });
            if (next) setRange(next);
        } catch { /* ignore */ }
        // Run once per symbol; refs mirror the latest values.
    }, [symbol]);
    const manualRefresh = useRef<(() => void) | null>(null);
    const [candles, setCandles] = useState<OhlcCandle[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [last, setLast] = useState<OhlcCandle | null>(null);
    const [live, setLive] = useState(false);
    const [source, setSource] = useState<'live' | 'delayed' | null>(null);
    const [updatedAt, setUpdatedAt] = useState<number | null>(null);
    // Set when the older part of an index chart was reconstructed rather than
    // fetched (see backfillIndexHistory). Shown on the chart, never hidden.
    const [estimateFrom, setEstimateFrom] = useState<string | null>(null);
    const [nowSec, setNowSec] = useState(() => Date.now());
    const sourceRef = useRef<'live' | 'delayed' | null>(null);
    const lastFetchAt = useRef(0);
    const [indState, setIndState] = useState(() => ({
        enabled: Object.fromEntries(INDICATORS.map(({ key }) => [key, false])) as Record<IndKey, boolean>,
        params: structuredClone(DEFAULT_PARAMS),
        colors: { ...DEFAULT_COLORS },
    }));
    const inds = indState.enabled;
    const indParams = indState.params;
    const indColors = indState.colors;
    const [priceLine, setPriceLine] = useState(true);
    const [elliottAuto, setElliottAuto] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [, setExporting] = useState(false);

    // Shortcut keys listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '?') {
                e.preventDefault();
                setHelpOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const takeScreenshot = useCallback(async () => {
        if (!containerRef.current) return;
        setExporting(true);
        try {
            // Finding the canvas element inside the lightweight-charts container
            const canvas = containerRef.current.querySelector('canvas');
            if (canvas) {
                const link = document.createElement('a');
                link.download = `chart-${symbol}-${range}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
        } catch (err) {
            console.error('Export failed', err);
        } finally {
            setExporting(false);
        }
    }, [symbol, range]);
    const [elliottDev, setElliottDev] = useState(5);
    const [elliottCount, setElliottCount] = useState(0);
    // Alternate counts the engine found for the same swings (shown next to the
    // primary count so the badge matches what the chart draws).
    const [elliottAltCount, setElliottAltCount] = useState(0);
    // Automatic classical patterns: on by default, remembered globally, and
    // re-detected per symbol + frame (same auto sensitivity as Elliott).
    const [patternsAuto, setPatternsAuto] = useState(true);
    const [detected, setDetected] = useState<DetectedPattern[]>([]);
    const [candleUp, setCandleUp] = useState(CANDLE_UP_DEFAULT);
    const [candleDown, setCandleDown] = useState(CANDLE_DOWN_DEFAULT);
    const [chartBg, setChartBg] = useState(CHART_BG_DEFAULT);
    const [gridV, setGridV] = useState(true);
    const [gridH, setGridH] = useState(true);
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
            if (localStorage.getItem('tadawul-elliott-auto') === '0') setElliottAuto(false);
            if (localStorage.getItem('tadawul-patterns-auto') === '0') setPatternsAuto(false);
            const cu = localStorage.getItem('tadawul-candle-up');
            if (isHex(cu)) setCandleUp(cu as string);
            const cd = localStorage.getItem('tadawul-candle-down');
            if (isHex(cd)) setCandleDown(cd as string);
            const bg = localStorage.getItem('tadawul-chart-bg');
            if (isBg(bg)) setChartBg(bg as string);
            if (localStorage.getItem('tadawul-grid-v') === '0') setGridV(false);
            if (localStorage.getItem('tadawul-grid-h') === '0') setGridH(false);
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

    // Candle / background / grid style -> chart + candle series
    useEffect(() => {
        try {
            candleRef.current?.applyOptions({
                upColor: candleUp,
                downColor: candleDown,
                wickUpColor: candleUp,
                wickDownColor: candleDown,
            });
        } catch { /* ignore */ }
    }, [candleUp, candleDown]);

    useEffect(() => {
        try {
            chartRef.current?.applyOptions({
                layout: { background: { type: ColorType.Solid, color: chartBg } },
                grid: {
                    vertLines: { visible: gridV, color: 'rgba(255, 255, 255, 0.04)' },
                    horzLines: { visible: gridH, color: 'rgba(255, 255, 255, 0.04)' },
                },
            });
        } catch { /* ignore */ }
    }, [chartBg, gridV, gridH]);

    const cycleCandleUp = () => {
        setCandleUp((prev) => {
            const idx = PALETTE.indexOf(prev);
            const next = PALETTE[(idx + 1 + PALETTE.length) % PALETTE.length];
            try { localStorage.setItem('tadawul-candle-up', next); } catch { /* ignore */ }
            return next;
        });
    };
    const cycleCandleDown = () => {
        setCandleDown((prev) => {
            const idx = PALETTE.indexOf(prev);
            const next = PALETTE[(idx + 1 + PALETTE.length) % PALETTE.length];
            try { localStorage.setItem('tadawul-candle-down', next); } catch { /* ignore */ }
            return next;
        });
    };
    const cycleChartBg = () => {
        setChartBg((prev) => {
            const idx = CHART_BG_OPTIONS.indexOf(prev);
            const next = CHART_BG_OPTIONS[(idx + 1 + CHART_BG_OPTIONS.length) % CHART_BG_OPTIONS.length];
            try { localStorage.setItem('tadawul-chart-bg', next); } catch { /* ignore */ }
            return next;
        });
    };
    const toggleGridV = () => {
        setGridV((prev) => {
            const next = !prev;
            try { localStorage.setItem('tadawul-grid-v', next ? '1' : '0'); } catch { /* ignore */ }
            return next;
        });
    };
    const toggleGridH = () => {
        setGridH((prev) => {
            const next = !prev;
            try { localStorage.setItem('tadawul-grid-h', next ? '1' : '0'); } catch { /* ignore */ }
            return next;
        });
    };

    const toggleElliottAuto = () => {
        setElliottAuto((prev) => {
            const next = !prev;
            try { localStorage.setItem('tadawul-elliott-auto', next ? '1' : '0'); } catch { /* ignore */ }
            return next;
        });
    };

    const togglePatternsAuto = () => {
        setPatternsAuto((prev) => {
            const next = !prev;
            try { localStorage.setItem('tadawul-patterns-auto', next ? '1' : '0'); } catch { /* ignore */ }
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
    // ---- Manual Elliott count (زر "مانوال كاونت") ----
    const [countOpen, setCountOpen] = useState(false);
    const [countKind, setCountKind] = useState<CountKind | null>(null);
    const [countDegree, setCountDegree] = useState<CountDegree>('minor');
    const [countDraft, setCountDraft] = useState<DrawPoint[]>([]);
    // ---- Chart transfer (زرّا نسخ/استيراد الإعدادات) ----
    const [transferOpen, setTransferOpen] = useState(false);
    const [transferText, setTransferText] = useState('');
    const [transferMsg, setTransferMsg] = useState<string | null>(null);
    // Set right after Copy so the effect below can select the fresh text once
    // the textarea actually holds it (selecting in the same tick grabs the old value).
    const [selectAllNext, setSelectAllNext] = useState(false);
    const transferBoxRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (!selectAllNext) return;
        const ta = transferBoxRef.current;
        if (!ta || !transferText) return;
        ta.focus();
        ta.setSelectionRange(0, transferText.length);
        setSelectAllNext(false);
    }, [selectAllNext, transferText]);
    // ---- Free-text notes ----
    const [textMode, setTextMode] = useState(false);
    const [textDraft, setTextDraft] = useState<DrawPoint | null>(null);
    const [textValue, setTextValue] = useState('');
    const [texts, setTexts] = useState<TextNote[]>([]);
    // Which saved note the edit box is rewriting (null = the box adds new notes).
    const [editTextId, setEditTextId] = useState<string | null>(null);
    // The note under the cursor on the chart (highlighted ring while set).
    const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
    const dragTextRef = useRef<{ id: string; moved: boolean } | null>(null);
    const [hover, setHover] = useState<{ x: number; y: number; candle: OhlcCandle } | null>(null);
    const candlesRef = useRef<OhlcCandle[]>([]);
    candlesRef.current = candles;
    const [, setViewTick] = useState(0);
    // Mirrors for stable chart subscriptions (registered once)
    const toolRef = useRef<DrawingTool | null>(null);
    const draftRef = useRef<DrawPoint | null>(null);
    const patternToolRef = useRef<PatternTool | null>(null);
    const patternDraftRef = useRef<DrawPoint[]>([]);
    // Count mirrors — same reason: the chart click handler subscribes once.
    const countKindRef = useRef<CountKind | null>(null);
    const countDegreeRef = useRef<CountDegree>('minor');
    const countDraftRef = useRef<DrawPoint[]>([]);
    const textModeRef = useRef(false);
    const textDraftRef = useRef<DrawPoint | null>(null);
    const symbolRef = useRef(symbol);
    const rangeRef = useRef(range);
    toolRef.current = tool;
    draftRef.current = draftA;
    patternToolRef.current = patternTool;
    patternDraftRef.current = patternDraft;
    countKindRef.current = countKind;
    countDegreeRef.current = countDegree;
    countDraftRef.current = countDraft;
    textModeRef.current = textMode;
    textDraftRef.current = textDraft;
    symbolRef.current = symbol;
    rangeRef.current = range;
    const overlayRef = useRef<Partial<Record<'ma20' | 'ema50' | 'bbBasis' | 'bbUpper' | 'bbLower' | 'srUpper' | 'srLower', ISeriesApi<'Line'> | null>>>({});
    const rsiRef = useRef<{ pane: PaneApi; series: ISeriesApi<'Line'> } | null>(null);
    const macdRef = useRef<{ pane: PaneApi; line: ISeriesApi<'Line'>; signal: ISeriesApi<'Line'>; hist: ISeriesApi<'Histogram'> } | null>(null);
    const cciRef = useRef<{ pane: PaneApi; series: ISeriesApi<'Line'> } | null>(null);
    const stochRef = useRef<{ pane: PaneApi; k: ISeriesApi<'Line'>; d: ISeriesApi<'Line'> } | null>(null);
    const adxRef = useRef<{ pane: PaneApi; adx: ISeriesApi<'Line'>; plus: ISeriesApi<'Line'>; minus: ISeriesApi<'Line'> } | null>(null);
    const waveMarkersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
    // the reader's own count is drawn on its own series so its badges never
    // collide with the engine's markers (one marker per bar per series)
    const handSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
    const handMarkersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
    // The zoom-floor listener is parked here so data passes can mute it
    // (see feedSeries below).
    const rangeCbRef = useRef<(() => void) | null>(null);

    // Diagnostic tally for study feeds (see feedStudy). Deliberately tiny
    // and side-effect free apart from the window slot.
    const recordFeed = useCallback((name: string, ok: boolean, error?: unknown) => {
        try {
            const w = window as unknown as {
                __chartFeeds?: { ok: Record<string, number>; fail: Record<string, string> };
            };
            w.__chartFeeds ??= { ok: {}, fail: {} };
            if (ok) w.__chartFeeds.ok[name] = (w.__chartFeeds.ok[name] ?? 0) + 1;
            else w.__chartFeeds.fail[name] = String(error).slice(0, 120);
        } catch { /* diagnostics must never break the chart */ }
    }, []);

    // The library evaluates getVisibleRange() eagerly whenever time-range
    // listeners exist — including mid-setData while points are being swapped,
    // when the scale is transiently empty and the call throws "Value is null"
    // (lightweight-charts: visibleBarsChanged -> getVisibleRange ->
    // timeRangeForLogicalRange -> ensureNotNull). Our zoom-floor listener is
    // the only subscriber, so parking it across our own data passes removes
    // the throw path without touching user-zoom behaviour: wheel, pinch and
    // the zoom buttons still trip the floor, setData never can.
    const feedSeries = useCallback((fn: () => void) => {
        const chart = chartRef.current;
        const cb = rangeCbRef.current;
        if (!chart || !cb) {
            fn();
            return;
        }
        try {
            chart.timeScale().unsubscribeVisibleTimeRangeChange(cb);
        } catch { /* chart gone mid-pass */ }
        try {
            fn();
        } finally {
            try {
                chart.timeScale().subscribeVisibleTimeRangeChange(cb);
            } catch { /* chart gone mid-pass */ }
        }
    }, []);

    // A single failing study must never blank the whole chart: each feed
    // is isolated and logs its own name, so a library hiccup degrades to
    // one missing study (visible in the console) instead of empty panes.
    // Results are also tallied on window.__chartFeeds so a failing study
    // can be identified from the console with one line, without guessing.
    const feedStudy = useCallback((name: string, fn: () => void) => {
        try {
            fn();
            recordFeed(name, true);
        } catch (e) {
            recordFeed(name, false, e);
            console.warn(`[chart] study feed failed (${name}):`, e);
        }
    }, [recordFeed]);

    const persist = (next: { enabled: Record<IndKey, boolean>; params: Record<IndKey, Record<string, number>>; colors: Record<string, string> }) => {
        try { localStorage.setItem(IND_STORAGE, JSON.stringify({ ...next, version: IND_STORAGE_VERSION })); } catch { /* ignore */ }
    };

    const toggleInd = (key: IndKey) => {
        setIndState((prev) => {
            const next = { ...prev, enabled: { ...prev.enabled, [key]: !prev.enabled[key] } };
            persist(next);
            return next;
        });
    };

    // One-click Pine "TASI Swing" setup: MA50 + EMA200 + RSI14 + MACD + Volume + S/R100
    const applySwingPreset = () => {
        setIndState((prev) => {
            const enabled = { ...prev.enabled, ma20: true, ema50: true, sr: true, rsi: true, macd: true, volume: true,
                bb: false, cci: false, stoch: false, adx: false, elliott: false };
            const params = structuredClone(prev.params);
            params.ma20.period = 50;
            params.ema50.period = 200;
            params.sr.period = 100;
            params.rsi.period = 14;
            params.macd.fast = 12; params.macd.slow = 26; params.macd.signal = 9;
            const next = { ...prev, enabled, params };
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

    const trackLine = useCallback((s: ISeriesApi<'Line'>) => {
        lineRegistry.current.add(s);
        try { s.applyOptions({ lineWidth }); } catch { /* ignore */ }
        return s;
    }, [lineWidth]);

    const cycleColor = (key: string) => {
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
        // carrier series for the hand-count labels: no line, markers only
        const handSeries = chart.addSeries(LineSeries, {
            color: 'rgba(0,0,0,0)',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
        });
        chart.priceScale('').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
        chartRef.current = chart;
        candleRef.current = candleSeries;
        handSeriesRef.current = handSeries;
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
            // Any bare chart click drops the note selection (a drag on a note
            // never reaches here — the SVG overlay captures it first).
            setSelectedTextId(null);
            const pt = toPoint(param.point.x, param.point.y);
            if (!pt) return;
            // Free-text note: one click plants the anchor; the text is
            // typed in the panel and committed with Enter.
            if (textModeRef.current) {
                textDraftRef.current = pt;
                setTextDraft(pt);
                return;
            }
            // Manual Elliott count: place one pivot per click, glyphs advance
            // in the chosen degree, and the set commits on the final pivot.
            const ck = countKindRef.current;
            if (ck) {
                const glyphs = COUNT_GLYPHS[countDegreeRef.current][ck];
                const countTool: PatternTool = ck === 'impulse' ? 'ew-count' : 'ew-count-abc';
                const next = [...countDraftRef.current, pt];
                if (next.length >= COUNT_CLICKS[ck]) {
                    const done = next.slice(0, COUNT_CLICKS[ck]);
                    setPatterns((prev) => {
                        const upd = [...prev, {
                            id: newDrawingId(),
                            pattern: countTool,
                            pts: done,
                            labels: glyphs,
                        }].slice(-50);
                        savePatterns(symbolRef.current, rangeRef.current, upd);
                        return upd;
                    });
                    setCountDraft([]);
                    setPatternPreview(null);
                } else {
                    setCountDraft(next);
                }
                return;
            }
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
            if (countKindRef.current && countDraftRef.current.length > 0 && param.point) {
                setPatternPreview(toPoint(param.point.x, param.point.y));
            } else if (patternToolRef.current && patternDraftRef.current.length > 0 && param.point) {
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
        rangeCbRef.current = onRange;

        return () => {
            chart.unsubscribeClick(onClick);
            chart.unsubscribeCrosshairMove(onCrosshair);
            chart.timeScale().unsubscribeVisibleTimeRangeChange(onRange);
            rangeCbRef.current = null;
            chart.remove();
            chartRef.current = null;
            // Drop per-chart handles: a later mount must create a fresh
            // markers plugin, never reuse one bound to a removed chart.
            candleRef.current = null;
            waveMarkersRef.current = null;
        };
    }, []);

    // Load candles per range. Twelve refetches on its 15s server TTL; Yahoo
    // is always fresh upstream and refetched at most every 60s (throttle).
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
                    // Intraday frames never carry the index backfill; clear the
                    // notice so it cannot linger from a previous frame.
                    setEstimateFrom(null);
                    setSource('live');
                    sourceRef.current = 'live';
                    lastFetchAt.current = Date.now();
                    setUpdatedAt(lastFetchAt.current);
                    if (!silent) setLoading(false);
                    return;
                }
            }
            const res = await getTadawulCandles(symbol, range);
            if (cancelled) return;
            // Yahoo's index endpoints intermittently answer with a single bar
            // (the same glitch that broke D/W/M history — a 1-bar cache entry
            // lives an hour). One bar is not a chart: keep what we have and
            // surface the retry instead of collapsing the frame to one candle.
            if (res && res.candles.length < 3) {
                console.warn('Degenerate candle payload', symbol, range, res.candles.length);
                if (!silent) {
                    setFailed(true);
                    setLoading(false);
                }
                return;
            }
            if (!res) {
                if (!silent) {
                    setFailed(true);
                    setLoading(false);
                }
                setLive(false);
                setSource(null);
                sourceRef.current = null;
                setEstimateFrom(null);
                return;
            }
            setCandles(validCandles(res.candles));
            setLast(res.candles[res.candles.length - 1] ?? null);
            setEstimateFrom((res as { estimatedFrom?: string }).estimatedFrom ?? null);
            setSource(intraday ? 'delayed' : null);
            sourceRef.current = intraday ? 'delayed' : null;
            lastFetchAt.current = Date.now();
            setUpdatedAt(lastFetchAt.current);
            if (!silent) setLoading(false);
        };
        setLive(isMarketOpen(getMarket('sa')));
        load(false);
        // Manual refresh button re-runs a full (non-silent) load.
        manualRefresh.current = () => load(false);

        // Re-check the session on every tick: pages opened before 10:00 must
        // still go live at the open instead of staying frozen all session.
        // Live source refetches every 15s tick; Yahoo only every 60s (fresh
        // upstream, throttled so polls don't hammer it). Hidden tabs skip
        // refetch to save API quota.
        let timer: ReturnType<typeof setInterval> | null = null;
        const onVisible = () => {
            // A tab hidden through whole sessions never polls; heal it the
            // moment the user comes back instead of showing the old snapshot.
            if (document.hidden) return;
            if (Date.now() - lastFetchAt.current >= DELAYED_REFETCH_MS) load(true);
        };
        if (intraday) {
            timer = setInterval(() => {
                const open = isMarketOpen(getMarket('sa'));
                setLive(open);
                if (document.hidden) return;
                const stale = Date.now() - lastFetchAt.current;
                if (!open) {
                    // Market closed: keep a slow cadence so a long-lived tab
                    // still picks up each new session's bars when it opens.
                    if (stale >= CLOSED_REFETCH_MS) load(true);
                    return;
                }
                if (sourceRef.current === 'live' || stale >= DELAYED_REFETCH_MS) {
                    load(true);
                }
            }, POLL_MS);
            document.addEventListener('visibilitychange', onVisible);
        }
        return () => {
            cancelled = true;
            manualRefresh.current = null;
            document.removeEventListener('visibilitychange', onVisible);
            if (timer) clearInterval(timer);
        };
    }, [symbol, range]);

    // 1s age ticker (label only — no network): the "updated Ns ago" badge
    // counts every second while the market is open on an intraday frame.
    useEffect(() => {
        if (!live || updatedAt == null || !(CANDLE_RANGES[range]?.intraday ?? false)) return;
        const t = setInterval(() => setNowSec(Date.now()), AGE_TICK_MS);
        return () => clearInterval(t);
    }, [live, updatedAt, range]);

    // Elliott wave numbering as native chart markers (1-5 blue, A-B-C orange):
    // the whole chart is numbered (every accepted impulse plus its A-B-C), and
    // sensitivity is derived from the loaded candles unless the user pins a
    // manual deviation — so 1m and daily frames both produce a real count out
    // of the box. Kept as a stable callback so the data effect can apply it
    // in the same pass as setData.
    const applyElliott = useCallback((sec: OhlcCandle[]) => {
        const series = candleRef.current;
        if (!series) return;
        if (!waveMarkersRef.current) waveMarkersRef.current = createSeriesMarkers(series, []);
        const markers = waveMarkersRef.current;
        // Young listings can have fewer than 30 bars on high timeframes;
        // 12 is twice the 6-pivot minimum for one impulse, so numbering is
        // still attempted instead of staying blank on every frame.
        if (!inds.elliott || sec.length < 12) {
            markers.setMarkers([]);
            return;
        }
        const highs = sec.map((c) => c.high);
        const lows = sec.map((c) => c.low);
        const closes = sec.map((c) => c.close);
        const dev = elliottAuto ? undefined : indParams.elliott.dev;
        const labels = elliottWaveLabels(highs, lows, closes, dev);
        setElliottDev(elliottAuto ? autoDevPct(highs, lows, closes) : indParams.elliott.dev);
        // Alternates are part of the count the UI reports: they are what the
        // engine draws (merged as "1 or A"), so the badge must match the chart.
        setElliottCount(labels.filter((l) => !l.alternate).length);
        setElliottAltCount(labels.filter((l) => l.alternate).length);
        markers.setMarkers(elliottMarkers(labels, sec.map((c) => c.time), '#7F1D1D', '#7F1D1D', { sub: '#C62828', major: '#C62828' }) as SeriesMarker<Time>[]);

        // the reader's own count (fine 3% zigzag, iron rules enforced) as a
        // second layer in red squares
        const handSeries = handSeriesRef.current;
        if (handSeries) {
            if (!handMarkersRef.current) handMarkersRef.current = createSeriesMarkers(handSeries, []);
            const hand = handCount(highs, lows, closes, { marketOpen: isMarketOpen(getMarket('sa')) });
            handMarkersRef.current.setMarkers(
                (hand ? handCountMarkers(hand, sec.map((c) => c.time), '#C62828', 0, 1) : []) as SeriesMarker<Time>[],
            );
        }
        if (!window.__ewdbg) window.__ewdbg = { sym: symbolRef.current, candles: sec.length, labels: labels.length, held: markers.markers().length };
    }, [inds.elliott, indParams.elliott.dev, elliottAuto]);

    // Push data into the series (fit only on range/symbol change or Reset,
    // never on silent auto-refresh, so the user's zoom never jumps).
    // Elliott numbering is applied here, in the same pass as setData, so
    // markers are always attached after the new symbol's bars exist.
    const fitRef = useRef(true);
    useEffect(() => {
        fitRef.current = true;
        // Drop stale auto shapes immediately: the new snapshot is shorter on
        // frame switches and the render guard below is the backstop, not the plan.
        setDetected([]);
    }, [symbol, range]);
    useEffect(() => {
        if (!candleRef.current || !chartRef.current || candles.length === 0) return;
        feedSeries(() => {
        const intraday = typeof candles[0].time === 'number';
        chartRef.current!.applyOptions({
            timeScale: { timeVisible: intraday, secondsVisible: false },
        });
        feedStudy('candles', () => candleRef.current!.setData(
            candles.map(({ time, open, high, low, close }) => ({
                time: time as UTCTimestamp | string,
                open,
                high,
                low,
                close,
            })),
        ));
        if (fitRef.current) {
            chartRef.current!.timeScale().fitContent();
            fitRef.current = false;
        }
        feedStudy('elliott-markers', () => applyElliott(candles));
        // Pattern detection rides along with the same data pass, so switching
        // symbols or frames both redraw shapes on the new bars.
        if (patternsAuto) {
            setDetected(candles.length < 30 ? [] : detectPatterns(candles.map((c) => c.high), candles.map((c) => c.low), candles.map((c) => c.close)));
        } else {
            setDetected([]);
        }
        });
    }, [candles, applyElliott, patternsAuto, feedSeries, feedStudy]);

    // Studies: overlays live on the price chart, oscillators get their own panes
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart || candles.length === 0) return;
        feedSeries(() => {
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
            feedStudy('volume', () => volumeRef.current!.setData(
                candles.map(({ time, close, open, volume }) => ({
                    time: time as UTCTimestamp | string,
                    value: volume,
                    color: close >= open ? 'rgba(38, 166, 154, 0.4)' : 'rgba(239, 83, 80, 0.4)',
                })),
            ));
        } else if (volumeRef.current) {
            chart.removeSeries(volumeRef.current);
            volumeRef.current = null;
        }

        const ensureLine = (key: 'ma20' | 'ema50' | 'bbBasis' | 'bbUpper' | 'bbLower' | 'srUpper' | 'srLower', color: string, dashed = false) => {
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
        const dropLine = (key: 'ma20' | 'ema50' | 'bbBasis' | 'bbUpper' | 'bbLower' | 'srUpper' | 'srLower') => {
            overlay[key]?.applyOptions({ visible: false });
        };

        if (inds.ma20 && closes.length >= indParams.ma20.period) {
            feedStudy('ma20', () => ensureLine('ma20', indColors.ma20).setData(studyPoints(times, sma(closes, indParams.ma20.period))));
            overlay.ma20?.applyOptions({ visible: true });
        } else dropLine('ma20');
        if (inds.ema50 && closes.length >= indParams.ema50.period) {
            feedStudy('ema50', () => ensureLine('ema50', indColors.ema50).setData(studyPoints(times, ema(closes, indParams.ema50.period))));
            overlay.ema50?.applyOptions({ visible: true });
        } else dropLine('ema50');
        if (inds.bb && closes.length >= indParams.bb.period) {
            feedStudy('bollinger', () => {
            const bb = bollinger(closes, indParams.bb.period, indParams.bb.mult);
            ensureLine('bbBasis', indColors.bb).setData(studyPoints(times, bb.map((b) => b.basis)));
            ensureLine('bbUpper', indColors.bb, true).setData(studyPoints(times, bb.map((b) => b.upper)));
            ensureLine('bbLower', indColors.bb, true).setData(studyPoints(times, bb.map((b) => b.lower)));
            });
            (['bbBasis', 'bbUpper', 'bbLower'] as const).forEach((k) => overlay[k]?.applyOptions({ visible: true }));
        } else (['bbBasis', 'bbUpper', 'bbLower'] as const).forEach(dropLine);
        if (inds.sr && closes.length >= indParams.sr.period) {
            feedStudy('support-resistance', () => {
            const dc = donchian(candles.map((c) => c.high), candles.map((c) => c.low), indParams.sr.period);
            ensureLine('srUpper', indColors.srUpper).setData(studyPoints(times, dc.upper));
            ensureLine('srLower', indColors.srLower, true).setData(studyPoints(times, dc.lower));
            });
            (['srUpper', 'srLower'] as const).forEach((k) => overlay[k]?.applyOptions({ visible: true }));
        } else (['srUpper', 'srLower'] as const).forEach(dropLine);

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
            feedStudy('rsi', () => rsiRef.current!.series.setData(studyPoints(times, rsi(closes, indParams.rsi.period))));
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
            feedStudy('macd', () => {
            macdRef.current!.line.applyOptions({ color: indColors.macd });
            macdRef.current!.line.setData(studyPoints(times, m.map((p) => p.line)));
            macdRef.current!.signal.setData(studyPoints(times, m.map((p) => p.signal)));
            macdRef.current!.hist.setData(
                times.flatMap((time, i) => {
                    const h = m[i].hist;
                    return h == null ? [] : [{ time, value: h, color: h >= 0 ? 'rgba(38, 166, 154, 0.6)' : 'rgba(239, 83, 80, 0.6)' }];
                }),
            );
            });
        } else macdRef.current = dropPane(macdRef.current);
        });
    }, [candles, inds, indParams, indColors, feedSeries, feedStudy, trackLine]);

    // Oscillator panes for CCI / Stochastic / ADX (same create-feed-remove pattern)
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart || candles.length === 0) return;
        feedSeries(() => {
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
            feedStudy('cci', () => cciRef.current!.series.setData(studyPoints(times, cci(highs, lows, closes, indParams.cci.period))));
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
            feedStudy('stochastic', () => {
            stochRef.current!.k.setData(studyPoints(times, s.k));
            stochRef.current!.d.setData(studyPoints(times, s.d));
            });
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
            feedStudy('adx', () => {
            adxRef.current!.adx.setData(studyPoints(times, a.adx));
            adxRef.current!.plus.setData(studyPoints(times, a.plusDI));
            adxRef.current!.minus.setData(studyPoints(times, a.minusDI));
            });
        } else adxRef.current = dropPane(adxRef.current);
        });
    }, [candles, inds, indParams, indColors, feedSeries, feedStudy, trackLine]);

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
        setTexts(loadTexts(symbol, range));
        // Saved notes belong to the previous frame; selection/editing follow them.
        setSelectedTextId(null);
        setEditTextId(null);
        setDraftA(null);
        setPreviewB(null);
        setTool(null);
        setPatternDraft([]);
        setPatternPreview(null);
        setPatternTool(null);
        setTextDraft(null);
        setTextValue('');
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
        setCountKind(null);
        setCountDraft([]);
        setCountOpen(false);
        setTextMode(false);
        setEditTextId(null);
        setTextDraft(null);
    };

    const pickPattern = (t: PatternTool) => {
        setPatternTool((prev) => (prev === t ? null : t));
        setPatternDraft([]);
        setPatternPreview(null);
        setTool(null);
        setDraftA(null);
        setPreviewB(null);
        setCountKind(null);
        setCountDraft([]);
        setCountOpen(false);
        setTextMode(false);
        setEditTextId(null);
        setTextDraft(null);
    };

    // ---- Manual count controls ----
    // Starting a count cancels any other drawing tool so one interaction never
    // feeds two modes at once (both read the same chart click).
    const startCount = (kind: CountKind) => {
        setCountKind((prev) => (prev === kind ? null : kind));
        setCountDraft([]);
        setPatternPreview(null);
        setPatternTool(null);
        setPatternDraft([]);
        setPatternsOpen(false);
        setTool(null);
        setDraftA(null);
        setPreviewB(null);
        setCountOpen(true);
        setTextMode(false);
        setEditTextId(null);
        setTextDraft(null);
    };

    const cancelCount = () => {
        setCountKind(null);
        setCountDraft([]);
        setPatternPreview(null);
        setCountOpen(false);
    };

    // ---- Free-text notes ----
    // Text mode cancels every other tool (all read the same chart click),
    // and every other tool cancels text mode for the same reason.
    const pickText = () => {
        setTextMode((prev) => !prev);
        setEditTextId(null);
        setTextDraft(null);
        setPatternTool(null);
        setPatternDraft([]);
        setPatternsOpen(false);
        setTool(null);
        setDraftA(null);
        setPreviewB(null);
        setCountKind(null);
        setCountDraft([]);
        setCountOpen(false);
        setTransferOpen(false);
    };

    const commitText = () => {
        // Editing an existing note: rewrite its text in place (same gate as create).
        if (editTextId) {
            setTexts((prev) => {
                const upd = updateTextNoteText(prev, editTextId, textValue);
                saveTexts(symbolRef.current, rangeRef.current, upd);
                return upd;
            });
            setEditTextId(null);
            setTextValue('');
            return;
        }
        const draft = textDraftRef.current;
        if (!draft) return;
        const note = makeTextNote(draft.time, draft.price, textValue);
        if (!note) return;
        setTexts((prev) => {
            const upd = [...prev, note].slice(-50);
            saveTexts(symbolRef.current, rangeRef.current, upd);
            return upd;
        });
        setTextDraft(null);
        textDraftRef.current = null;
        setTextValue('');
    };

    // Load a saved note into the edit box (✎ in the list, double-click on the chart).
    const startEditText = (id: string) => {
        const note = texts.find((t) => t.id === id);
        if (!note) return;
        setTextMode(true);
        setTextDraft(null);
        textDraftRef.current = null;
        setEditTextId(id);
        setTextValue(note.text);
    };

    const cancelEditText = () => {
        setEditTextId(null);
        setTextValue('');
    };

    // ---- Drag-to-move for notes on the chart ----
    const noteFromPixel = (x: number, y: number): DrawPoint | null => {
        const c = chartRef.current;
        if (!c) return null;
        const time = normalizeTimeKey(c.timeScale().coordinateToTime(x));
        const price = candleRef.current?.coordinateToPrice(y) ?? null;
        if (time == null || price == null || !Number.isFinite(price)) return null;
        return { time, price };
    };

    const onTextPointerDown = (e: ReactPointerEvent<SVGGElement>, id: string) => {
        // Capture keeps move events flowing once the cursor leaves the note,
        // and stopping propagation keeps the chart from panning under it.
        e.stopPropagation();
        try { e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId); } catch { /* unsupported */ }
        dragTextRef.current = { id, moved: false };
        setSelectedTextId(id);
    };

    const onTextPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
        const drag = dragTextRef.current;
        if (!drag) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pt = noteFromPixel(e.clientX - rect.left, e.clientY - rect.top);
        if (!pt) return;
        drag.moved = true;
        // Live position while dragging; persisted once on release below.
        setTexts((prev) => moveTextNote(prev, drag.id, pt.time, pt.price));
    };

    const onTextPointerUp = () => {
        const drag = dragTextRef.current;
        if (!drag) return;
        dragTextRef.current = null;
        if (drag.moved) {
            setTexts((prev) => {
                saveTexts(symbolRef.current, rangeRef.current, prev);
                return prev;
            });
        }
    };

    const deleteText = (id: string) => {
        if (editTextId === id) cancelEditText();
        if (selectedTextId === id) setSelectedTextId(null);
        setTexts((prev) => {
            const next = prev.filter((t) => t.id !== id);
            saveTexts(symbolRef.current, rangeRef.current, next);
            return next;
        });
    };

    const clearTexts = () => {
        setTexts([]);
        setEditTextId(null);
        setSelectedTextId(null);
        saveTexts(symbolRef.current, rangeRef.current, []);
    };

    // ---- Chart transfer handlers ----
    // Export carries this chart's indicators + drawings + patterns
    // (manual counts included) as one JSON string the user pastes
    // into another browser. Import validates with the same gates
    // the loaders use, so a foreign payload can't crash the chart.
    const copySetup = async () => {
        const payload = buildTransferPayload({
            symbol: symbolRef.current,
            range: rangeRef.current,
            indicators: {
                enabled: { ...indState.enabled },
                params: JSON.parse(JSON.stringify(indState.params)) as Record<IndKey, Record<string, number>>,
                colors: { ...indState.colors },
            },
            drawings,
            patterns,
        });
        const text = JSON.stringify(payload);
        let copied = false;
        try {
            await navigator.clipboard.writeText(text);
            copied = true;
        } catch {
            // Clipboard API needs a secure context; fall back to a
            // temporary textarea so HTTP LAN testing still works.
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            try { copied = document.execCommand('copy'); } catch { copied = false; }
            ta.remove();
        }
        setTransferText(text);
        // Select the payload so a manual Ctrl+C copies ALL of it. A partial copy
        // is what produces the "not-transfer" rejection on the other side.
        setSelectAllNext(true);
        setTransferMsg(copied ? tx(lang, 'draw.copied') : tx(lang, 'draw.copySelectAll'));
    };

    // ---- File transfer (بديل النسخ/اللصق) ----
    // Same payload as the clipboard route, but through a .json file. Copy/paste
    // is where this feature kept breaking: long payloads get cut, the wrong
    // text gets pasted, and nothing tells the user which. A file cannot be
    // truncated by accident.
    const exportSetupFile = () => {
        const payload = buildTransferPayload({
            symbol: symbolRef.current,
            range: rangeRef.current,
            indicators: {
                enabled: { ...indState.enabled },
                params: JSON.parse(JSON.stringify(indState.params)) as Record<IndKey, Record<string, number>>,
                colors: { ...indState.colors },
            },
            drawings,
            patterns,
        });
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const safe = symbolRef.current.replace(/[^\w.-]+/g, '_');
        a.href = url;
        a.download = `openstock-${safe}-${rangeRef.current}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        // Revoke on the next tick so the download has started.
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setTransferMsg(tx(lang, 'draw.exported'));
    };

    const importSetupFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            const text = String(reader.result ?? '');
            setTransferText(text);
            // Reuse the same validation path as the paste route. The text is
            // passed in explicitly: applyImport reads the `transferText` state,
            // which React has not published yet at this point, so it would
            // parse the PREVIOUS (empty) value and import nothing.
            window.setTimeout(() => applyImport(text), 0);
        };
        reader.onerror = () => setTransferMsg(tx(lang, 'draw.importErrNoJson'));
        reader.readAsText(file);
    };

    const applyImport = (overrideText?: string) => {
        const source = overrideText ?? transferText;
        let raw: unknown;
        try {
            raw = JSON.parse(source);
        } catch {
            // Not parseable at all — the paste is mid-string or cut in half.
            setTransferMsg(tx(lang, 'draw.importErrNoJson'));
            return;
        }
        const parsed = parseTransferPayload(raw);
        if (!parsed.ok) {
            const key = ({
                'truncated': 'draw.importErrTruncated',
                'not-transfer': 'draw.importErrNotTransfer',
                'not-object': 'draw.importErrNoJson',
                'version': 'draw.importErrVersion',
                'no-source': 'draw.importErrNoSource',
            } as const)[parsed.error as 'truncated' | 'not-transfer' | 'not-object' | 'version' | 'no-source'];
            setTransferMsg(key ? tx(lang, key) : tx(lang, 'draw.importBad'));
            return;
        }
        // Keep the textarea in step with what was just applied, so the user
        // can see (and re-copy) the payload that is now live on the chart.
        setTransferText(source);
        // Indicators: accept only known keys, current chart keeps the rest.
        if (parsed.payload.indicators) {
            const src = parsed.payload.indicators;
            setIndState((prev) => {
                const enabled = { ...prev.enabled };
                if (src.enabled) for (const { key } of INDICATORS) {
                    if (typeof src.enabled[key] === 'boolean') enabled[key] = src.enabled[key];
                }
                const params = JSON.parse(JSON.stringify(prev.params)) as Record<IndKey, Record<string, number>>;
                if (src.params) for (const { key, params: defs } of INDICATORS) {
                    for (const d of defs) {
                        const v = src.params[key]?.[d.key];
                        if (typeof v === 'number' && Number.isFinite(v)) params[key][d.key] = v;
                    }
                }
                const colors = { ...prev.colors };
                if (src.colors) for (const k of Object.keys(prev.colors)) {
                    if (typeof src.colors[k] === 'string') colors[k] = src.colors[k];
                }
                const next = { enabled, params, colors };
                persist(next);
                return next;
            });
        }
        // Drawings + patterns land on the OPEN chart (whatever symbol/range
        // the user opened before importing) and persist under its key.
        const nextDrawings = [...parsed.drawings].slice(-50);
        setDrawings(nextDrawings);
        saveDrawings(symbolRef.current, rangeRef.current, nextDrawings);
        const nextPatterns = [...parsed.patterns].slice(-50);
        setPatterns(nextPatterns);
        savePatterns(symbolRef.current, rangeRef.current, nextPatterns);
        const from = `${parsed.payload.symbol}/${parsed.payload.range}`;
        setTransferMsg(`${tx(lang, 'draw.importOk')} · ${from} → ${parsed.drawings.length + parsed.patterns.length}✦`);
    };

    // Counts are stored as patterns, so they inherit persistence and the
    // delete/clear affordances — no second list to maintain.
    const countDrawings = patterns.filter((d) => d.pattern === 'ew-count' || d.pattern === 'ew-count-abc');

    const cancelDrawing = () => {
        setTool(null);
        setDraftA(null);
        setPreviewB(null);
        setPatternTool(null);
        setPatternDraft([]);
        setPatternPreview(null);
        setCountKind(null);
        setCountDraft([]);
        setCountOpen(false);
        setTransferOpen(false);
        setTransferMsg(null);
        setTextMode(false);
        setEditTextId(null);
        setTextDraft(null);
        setTextValue('');
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
    const ageSec = updatedAt != null ? Math.max(0, Math.round((nowSec - updatedAt) / 1000)) : null;

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

    // ---- Auto-detected classical patterns (SVG over the price pane) ----
    // Pattern pivots are bar indices into the snapshot they were detected on.
    // During a symbol/frame switch React first renders the new (possibly
    // shorter) candles with the previous snapshot's shapes, so every lookup
    // goes through patternBarTime: out-of-range renders nothing instead of
    // throwing inside timeToCoordinate and unmounting the chart.
    const PATTERN_COLOR = { bullish: '#26A69A', bearish: '#EF5350' } as const;
    const patternOverlay = (p: DetectedPattern, keyPrefix: string) => {
        const els: React.ReactNode[] = [];
        const color = PATTERN_COLOR[p.direction];
        const op = 0.55 + p.confidence * 0.45;
        const times = candles.map((c) => c.time);
        const lines = p.lines.map((ln, i) => {
            const t1 = patternBarTime(times, ln.from.index);
            const t2 = patternBarTime(times, ln.to.index);
            if (t1 == null || t2 == null) return null;
            const x1 = X(t1);
            const y1 = Y(ln.from.price);
            let x2 = X(t2);
            let y2 = Y(ln.to.price);
            if (x1 == null || y1 == null || x2 == null || y2 == null) return null;
            // Necklines / channel bounds project to the right edge: the pattern
            // reads as a level price is expected to react at, not just a chord.
            // Clamped to the visible price range so a steep line cannot shoot
            // off-scale (projectToEdge).
            if (ln.extend) {
                const lo = Math.min(...candles.map((c) => c.low));
                const hi = Math.max(...candles.map((c) => c.high));
                const pad = (hi - lo) * 0.08;
                const e = projectToEdge(x1, y1, x2, y2, rightEdge, lo - pad, hi + pad);
                x2 = e.x;
                y2 = e.y;
            }
            return (
                <line
                    key={`${keyPrefix}-l${i}`}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={color} strokeWidth={1.5} opacity={op}
                    {...(ln.dashed ? { strokeDasharray: '5 4' } : {})}
                />
            );
        });
        lines.forEach((l) => els.push(l));
        const dots = p.pivots.map((pt, i) => {
            const t = patternBarTime(times, pt.index);
            if (t == null) return null;
            const x = X(t);
            const y = Y(pt.price);
            if (x == null || y == null) return null;
            return (
                <g key={`${keyPrefix}-p${i}`}>
                    <circle cx={x} cy={y} r={3.5} fill={color} opacity={op} />
                    {pt.role && (
                        <text x={x} y={pt.type === 'high' ? y - 8 : y + 15} textAnchor="middle" fontSize={10} fill={color} opacity={op}>
                            {pt.role}
                        </text>
                    )}
                </g>
            );
        });
        dots.forEach((d) => els.push(d));
        // Badge at the first pivot so the shape is identifiable on the chart
        const bt = patternBarTime(times, p.pivots[0].index);
        const bx = bt == null ? null : X(bt);
        const by = Y(p.pivots[0].price);
        if (bx != null && by != null) {
            const text = lang === 'ar' ? p.labelAr : p.label;
            els.push(
                <text key={`${keyPrefix}-t`} x={bx + 6} y={p.direction === 'bullish' ? by + 18 : by - 8} fontSize={11} fontWeight={700} fill={color} opacity={op}>
                    {text}
                </text>,
            );
        }
        return els;
    };

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

    // In-progress manual count: same preview shape, labels taken from the
    // degree glyph set so the user sees the number landing before committing.
    const countDraftPair: PatternDrawing | null =
        countKind && countDraft.length > 0
            ? {
                id: 'countdraft',
                pattern: countKind === 'impulse' ? 'ew-count' : 'ew-count-abc',
                pts: [...countDraft, ...(patternPreview ? [patternPreview] : [])],
                labels: COUNT_GLYPHS[countDegree][countKind],
            }
            : null;

    // ---- Manual pattern geometry (TradingView-style patterns panel) ----
    const timeIndex = new Map<string, number>();
    candles.forEach((c, i) => timeIndex.set(String(c.time), i));
    const PATTERN_COLORS: Record<string, string> = { patterns: '#B2B5BE', elliott: '#4FC3F7', cycles: '#787B86' };

    const patternElements = (d: PatternDrawing, keyPrefix: string, preview = false) => {
        const def = patternById(d.pattern);
        const color = def.group === 'elliott' || def.group === 'count' ? PATTERN_COLORS.elliott : def.group === 'cycles' ? PATTERN_COLORS.cycles : PATTERN_COLORS.patterns;
        // Manual counts read like the engine's own output: motive glyphs and
        // connectors in green, corrective in orange (matches the Pine port).
        const labelSet = d.labels ?? def.pointLabels;
        const isCorr = d.pattern === 'ew-count-abc';
        const glyphColor = isCorr ? '#FF6D00' : '#089981';
        // Manual counts use the glyph color for everything (green impulse /
        // orange correction, like the engine and the Pine port) so a hand
        // count reads as one object, not a blue line with green words.
        const countColor = def.group === 'count' ? glyphColor : color;
        const els: React.ReactNode[] = [];
        const op = preview ? 0.6 : 1;
        const dot = (x: number, y: number, k: string, c: string = color) => (
            <circle key={k} cx={x} cy={y} r={4} fill={c} opacity={op} />
        );
        const tag = (x: number, y: number, k: string, text: string) => (
            <text key={k} x={x} y={y - 8} textAnchor="middle" fontSize={12} fontWeight={700} fill={countColor} opacity={op}>
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
            els.push(dot(q.x, q.y, `${keyPrefix}-d${i}`, countColor));
            const label = labelSet[i];
            if (label) els.push(tag(q.x, q.y, `${keyPrefix}-t${i}`, label));
        });
        const seg = (i: number, j: number, k: string, dashed = false, c = countColor) => {
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
                    <button
                        type="button"
                        onClick={() => toggleInd('elliott')}
                        aria-pressed={inds.elliott}
                        title={tx(lang, 'chart.elliottBadge')}
                        className={inds.elliott ? 'pill is-up' : 'pill'}
                    >
                        {tx(lang, 'chart.elliottBadge')} v{ELLIOTT_ENGINE_VERSION}{elliottCount + elliottAltCount ? ` · ${elliottCount + elliottAltCount}` : ''}
                    </button>
                    {menuOpen && (
                        <div className="card absolute z-20 mt-1 flex max-h-80 min-w-60 flex-col gap-0.5 overflow-y-auto p-1.5">
                            <button
                                type="button"
                                onClick={applySwingPreset}
                                title={tx(lang, 'chart.swingSub')}
                                className="search-item-link w-full"
                            >
                                <span className="flex-1 text-start text-[13px] font-semibold text-brand-ink">⚡ {tx(lang, 'chart.swing')}</span>
                            </button>
                            <div className="mx-1 my-1 border-t border-line" />
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
                            <p className="px-2 pt-0.5 text-[11px] font-semibold text-faint">{tx(lang, 'chart.style')}</p>
                            <div className="search-item-link w-full">
                                <span className="flex-1 text-start text-[13px] font-semibold">{tx(lang, 'chart.candleUp')}</span>
                                <button
                                    type="button"
                                    onClick={cycleCandleUp}
                                    title={candleUp}
                                    aria-label={tx(lang, 'chart.candleUp')}
                                    className="size-5 shrink-0 rounded-full border border-line-strong"
                                    style={{ backgroundColor: candleUp }}
                                />
                            </div>
                            <div className="search-item-link w-full">
                                <span className="flex-1 text-start text-[13px] font-semibold">{tx(lang, 'chart.candleDown')}</span>
                                <button
                                    type="button"
                                    onClick={cycleCandleDown}
                                    title={candleDown}
                                    aria-label={tx(lang, 'chart.candleDown')}
                                    className="size-5 shrink-0 rounded-full border border-line-strong"
                                    style={{ backgroundColor: candleDown }}
                                />
                            </div>
                            <div className="search-item-link w-full">
                                <span className="flex-1 text-start text-[13px] font-semibold">{tx(lang, 'chart.chartBg')}</span>
                                <button
                                    type="button"
                                    onClick={cycleChartBg}
                                    title={chartBg}
                                    aria-label={tx(lang, 'chart.chartBg')}
                                    className="size-5 shrink-0 rounded-full border border-line-strong"
                                    style={{ backgroundColor: chartBg === 'transparent' ? 'transparent' : chartBg }}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={toggleGridV}
                                aria-pressed={gridV}
                                className="search-item-link w-full"
                            >
                                <span className={`flex size-4 items-center justify-center rounded border ${gridV ? 'border-brand-ink bg-brand-soft text-brand-ink' : 'border-line-strong text-transparent'}`}>✓</span>
                                <span className="flex-1 text-start text-[13px] font-semibold">{tx(lang, 'chart.gridV')}</span>
                            </button>
                            <button
                                type="button"
                                onClick={toggleGridH}
                                aria-pressed={gridH}
                                className="search-item-link w-full"
                            >
                                <span className={`flex size-4 items-center justify-center rounded border ${gridH ? 'border-brand-ink bg-brand-soft text-brand-ink' : 'border-line-strong text-transparent'}`}>✓</span>
                                <span className="flex-1 text-start text-[13px] font-semibold">{tx(lang, 'chart.gridH')}</span>
                            </button>
                            <button
                                type="button"
                                onClick={togglePatternsAuto}
                                aria-pressed={patternsAuto}
                                className="search-item-link w-full"
                            >
                                <span className={`flex size-4 items-center justify-center rounded border ${patternsAuto ? 'border-brand-ink bg-brand-soft text-brand-ink' : 'border-line-strong text-transparent'}`}>✓</span>
                                <span className="flex-1 text-start text-[13px] font-semibold">{tx(lang, 'chart.patternsAuto')}</span>
                                <span className="mono num text-[11px] text-faint">{detected.length ? `${detected.length}◆` : ''}</span>
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
                                        {key === 'sr' ? (
                                        <>
                                            {SR_COLOR_KEYS.map((ck) => (
                                                <button
                                                    key={ck}
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); cycleColor(ck); }}
                                                    title={indColors[ck]}
                                                    aria-label={`Change ${label} ${ck === 'srUpper' ? 'resistance' : 'support'} color`}
                                                    className="size-5 shrink-0 rounded-full border border-line-strong"
                                                    style={{ backgroundColor: indColors[ck] }}
                                                />
                                            ))}
                                        </>
                                        ) : !noColor && (
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
                                            {key === 'elliott' && (
                                                <span className="flex items-center gap-1">
                                                    <span className="text-[11px] text-faint">{tx(lang, 'chart.elliottAuto')}</span>
                                                    <button
                                                        type="button"
                                                        aria-pressed={elliottAuto}
                                                        onClick={toggleElliottAuto}
                                                        className="pill h-6 px-2"
                                                        title={tx(lang, 'chart.elliottAuto')}
                                                    >
                                                        {elliottAuto ? '✓' : '—'}
                                                    </button>
                                                    <span className="mono num text-[11px] text-faint" title={tx(lang, 'chart.elliottNoWave')}>
                                                        {elliottCount ? `${elliottCount}✦` : `0 · ${tx(lang, 'chart.elliottNoWaveShort')}`}
                                                        {elliottAltCount > 0 && <span className="ml-1 text-[11px] text-faint">(+{elliottAltCount} alt)</span>}
                                                    </span>
                                                </span>
                                            )}
                                            {params.map((p) => (
                                                <span key={p.key} className="flex items-center gap-1">
                                                    <span className="text-[11px] text-faint">{p.labelKey ? tx(lang, p.labelKey) : p.label}</span>
                                                    <button type="button" aria-label={`Decrease ${label} ${p.label}`} onClick={() => stepParam(key, p, -1)} className="pill h-6 px-2">−</button>
                                                    <span className="mono num min-w-8 text-center text-[12px] font-semibold">
                                                        {key === 'elliott' ? elliottDev.toFixed(2) : indParams[key][p.key]}
                                                    </span>
                                                    <button type="button" aria-label={`Increase ${label} ${p.label}`} onClick={() => stepParam(key, p, 1)} className="pill h-6 px-2">+</button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {key === 'elliott' && (
                                        <button
                                            type="button"
                                            onClick={() => startCount(countKind ?? 'impulse')}
                                            aria-pressed={countKind != null}
                                            title={tx(lang, 'draw.count')}
                                            className="search-item-link w-full"
                                        >
                                            <span className={`flex size-4 items-center justify-center rounded border ${countKind != null ? 'border-brand-ink bg-brand-soft text-brand-ink' : 'border-line-strong text-transparent'}`}>✓</span>
                                            <span className="flex-1 text-start text-[13px] font-semibold">{tx(lang, 'draw.count')}</span>
                                            <span className="mono text-[11.5px] text-faint">{countDrawings.length ? `${countDrawings.length}✦` : ''}</span>
                                        </button>
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
                    <button
                        type="button"
                        onClick={pickText}
                        aria-pressed={textMode}
                        title={tx(lang, 'draw.textHint')}
                        className={textMode ? 'pill is-up' : 'pill'}
                    >
                        {tx(lang, 'draw.text')}
                        {texts.length ? ` · ${texts.length}` : ''}
                    </button>
                    {(tool || draftA || patternTool || patternDraft.length > 0 || countKind || textMode) && (
                        <button type="button" onClick={cancelDrawing} className="pill">
                            {tx(lang, 'draw.cancel')}
                        </button>
                    )}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => {
                                // Opening the panel arms impulse mode at once so
                                // chart clicks work immediately — no second step
                                // needed. Re-clicking the button closes it.
                                if (!countOpen) setCountKind((prev) => prev ?? 'impulse');
                                setCountOpen((v) => !v);
                                setPatternsOpen(false);
                            }}
                            aria-expanded={countOpen}
                            title={tx(lang, 'draw.count')}
                            className={countKind ? 'pill is-up' : 'pill'}
                        >
                            {tx(lang, 'draw.count')}
                            {countKind && countDraft.length > 0 ? ` · ${countDraft.length}/${COUNT_CLICKS[countKind]}` : countDrawings.length ? ` · ${countDrawings.length}` : ''}
                        </button>
                        {countOpen && (
                            <div className="card absolute end-0 z-20 mt-1 flex w-60 flex-col gap-2 p-2.5">
                                {/* الدرجات الثلاث نفس درجات المحرك، فالعدّ اليدوي
                                    والترقيم التلقائي يُقرآن بنفس الطريقة */}
                                <div>
                                    <p className="px-0.5 pb-1 text-[11px] font-semibold text-faint">{tx(lang, 'draw.countDegree')}</p>
                                    <div className="flex gap-1">
                                        {(['minor', 'major', 'minute'] as CountDegree[]).map((dg) => (
                                            <button
                                                key={dg}
                                                type="button"
                                                onClick={() => setCountDegree(dg)}
                                                aria-pressed={countDegree === dg}
                                                title={COUNT_GLYPHS[dg].impulse.join(' · ')}
                                                className={`pill h-7 flex-1 px-1 ${countDegree === dg ? 'is-up' : ''}`}
                                            >
                                                <span className="mono text-[11.5px]">
                                                    {dg === 'major' ? 'I·V' : dg === 'minute' ? 'i·v' : '1·5'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="px-0.5 pb-1 text-[11px] font-semibold text-faint">{tx(lang, 'draw.countKind')}</p>
                                    <div className="flex gap-1">
                                        {(['impulse', 'correction'] as CountKind[]).map((kd) => (
                                            <button
                                                key={kd}
                                                type="button"
                                                onClick={() => startCount(kd)}
                                                aria-pressed={countKind === kd}
                                                className={`pill h-7 flex-1 px-1.5 ${countKind === kd ? 'is-up' : ''}`}
                                            >
                                                {tx(lang, kd === 'impulse' ? 'draw.countImpulse' : 'draw.countCorrection')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {countKind && (
                                    <p className="px-0.5 text-[11.5px] leading-snug text-faint">
                                        {countDraft.length}/{COUNT_CLICKS[countKind]} · {tx(lang, 'draw.hint1')}
                                        <span className="mono block pt-0.5 text-brand-ink">
                                            {COUNT_GLYPHS[countDegree][countKind].join(' · ')}
                                        </span>
                                    </p>
                                )}
                                {countDrawings.length > 0 && (
                                    <>
                                        <div className="border-t border-line" />
                                        {countDrawings.map((d) => (
                                            <div key={d.id} className="search-item-link w-full">
                                                <span className="flex-1 truncate text-start text-[12.5px]">
                                                    {(d.labels ?? []).join(' · ')} · {d.pts.length}✦
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => deletePattern(d.id)}
                                                    aria-label="Delete count"
                                                    className="rounded px-1.5 text-faint hover:bg-hover hover:text-foreground"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                        <button type="button" onClick={clearPatterns} className="search-item-link w-full">
                                            <span className="flex-1 text-start text-[12.5px] text-down">{tx(lang, 'draw.clear')}</span>
                                        </button>
                                    </>
                                )}
                                {countKind && (
                                    <button type="button" onClick={cancelCount} className="pill w-full">
                                        {tx(lang, 'draw.cancel')}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => { setTransferOpen((v) => !v); setTransferMsg(null); setPatternsOpen(false); }}
                            aria-expanded={transferOpen}
                            title={tx(lang, 'draw.transfer')}
                            className={transferOpen ? 'pill is-up' : 'pill'}
                        >
                            {tx(lang, 'draw.transfer')}
                        </button>
                        {transferOpen && (
                            <div className="card absolute end-0 z-20 mt-1 flex w-72 flex-col gap-2 p-2.5">
                                <p className="px-0.5 text-[11.5px] leading-snug text-faint">
                                    {tx(lang, 'draw.transferHint')}
                                </p>
                                <div className="flex gap-1.5">
                                    <button type="button" onClick={() => void copySetup()} className="pill flex-1">
                                        {tx(lang, 'draw.copySetup')}
                                    </button>
                                    <button type="button" onClick={exportSetupFile} className="pill flex-1">
                                        {tx(lang, 'draw.exportFile')}
                                    </button>
                                </div>
                                <label className="pill w-full cursor-pointer text-center">
                                    {tx(lang, 'draw.importFile')}
                                    <input
                                        type="file"
                                        accept="application/json,.json"
                                        className="hidden"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) importSetupFile(f);
                                            e.target.value = '';
                                        }}
                                    />
                                </label>
                                <textarea
                                    ref={transferBoxRef}
                                    value={transferText}
                                    onChange={(e) => { setTransferText(e.target.value); setTransferMsg(null); }}
                                    placeholder={tx(lang, 'draw.pastePayload')}
                                    rows={3}
                                    spellCheck={false}
                                    className="mono w-full resize-y rounded border border-line bg-transparent p-1.5 text-[11px] text-foreground"
                                />
                                <button type="button" onClick={() => applyImport()} className="pill w-full">
                                    {tx(lang, 'draw.applyImport')}
                                </button>
                                {transferMsg && (
                                    <p className="px-0.5 text-[11.5px] leading-snug text-brand-ink">{transferMsg}</p>
                                )}
                            </div>
                        )}
                    </div>
                    {textMode && (
                    <div className="relative">
                        <div className="card absolute end-0 z-20 mt-1 flex w-72 flex-col gap-2 p-2.5">
                            <p className="px-0.5 text-[11.5px] leading-snug text-faint">
                                {editTextId
                                    ? tx(lang, 'draw.textEditing')
                                    : textDraft ? tx(lang, 'draw.textType') : tx(lang, 'draw.textHint')}
                            </p>
                            <input
                                // key remounts per anchor/edit target so typing always starts fresh
                                key={editTextId ?? (textDraft ? `${textDraft.time}` : 'empty')}
                                autoFocus
                                value={textValue}
                                onChange={(e) => setTextValue(e.target.value.slice(0, TEXT_MAX))}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') commitText();
                                    else if (e.key === 'Escape') { if (editTextId) cancelEditText(); else cancelDrawing(); }
                                }}
                                placeholder={tx(lang, 'draw.textPh')}
                                maxLength={TEXT_MAX}
                                className="w-full rounded border border-line bg-transparent p-1.5 text-[13px] text-foreground"
                            />
                            <button
                                type="button"
                                onClick={commitText}
                                disabled={editTextId ? !textValue.trim() : !textDraft || !textValue.trim()}
                                className="pill w-full"
                            >
                                {editTextId ? tx(lang, 'draw.textUpdate') : tx(lang, 'draw.textSave')}
                            </button>
                            {texts.length > 0 && (
                                <>
                                    <div className="border-t border-line" />
                                    <p className="px-0.5 text-[11px] leading-snug text-faint">{tx(lang, 'draw.textMove')}</p>
                                    {texts.map((t) => (
                                        <div key={t.id} className={`search-item-link w-full ${editTextId === t.id ? 'bg-hover' : ''}`}>
                                            <span className="flex-1 truncate text-start text-[12.5px]">
                                                {t.text}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => startEditText(t.id)}
                                                aria-label={tx(lang, 'draw.textEdit')}
                                                title={tx(lang, 'draw.textEdit')}
                                                className="rounded px-1.5 text-faint hover:bg-hover hover:text-foreground"
                                            >
                                                ✎
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteText(t.id)}
                                                aria-label="Delete note"
                                                className="rounded px-1.5 text-faint hover:bg-hover hover:text-foreground"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={clearTexts} className="search-item-link w-full">
                                        <span className="flex-1 text-start text-[12.5px] text-down">{tx(lang, 'draw.clear')}</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
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
                {estimateFrom && (
                    <span className="pill h-6 px-2 text-[11px] text-brand-ink" title={tx(lang, 'chart.estimatedSub')}>
                        ⚠ {tx(lang, 'chart.estimatedFrom').replace('{d}', estimateFrom)}
                    </span>
                )}
                {last && (
                    <p className="num text-[15px] font-bold">
                        {last.close.toFixed(2)} <span className="text-[12px font-normal] text-faint]">SAR</span>{' '}
                        {changePct != null && (
                            <span className={changePct >= 0 ? 'text-up' : 'text-down'}>
                                {changePct >= 0 ? '+' : ''}
                                {changePct.toFixed(2)}%
                            </span>
                        )}
                        {live && source === 'live' && <span className="ms-2 text-[11px] font-semibold text-up">● {tx(lang, 'chart.live')}{ageSec != null ? ` · ${tx(lang, 'chart.updatedAgo').replace('{n}', String(ageSec))}` : ''}</span>}
                        {live && source === 'delayed' && <span className="ms-2 text-[11px] font-semibold text-down">● {tx(lang, 'chart.delayed')}{ageSec != null ? ` · ${tx(lang, 'chart.updatedAgo').replace('{n}', String(ageSec))}` : ''}</span>}
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
                    <button type="button" onClick={takeScreenshot} title={tx(lang, 'chart.export')} aria-label={tx(lang, 'chart.export')} className="pill h-9 w-9 justify-center px-0">
                        <Camera className="size-3.5" />
                    </button>
                    <button type="button" onClick={() => setHelpOpen(true)} title={tx(lang, 'chart.help')} aria-label={tx(lang, 'chart.help')} className="pill h-9 w-9 justify-center px-0">
                        <HelpCircle className="size-3.5" />
                    </button>
                    <button type="button" onClick={resetView} title={tx(lang, 'chart.reset')} aria-label={tx(lang, 'chart.reset')} className="pill h-9 w-9 justify-center px-0">
                        <RotateCcw className="size-3.5" />
                    </button>
                    <button type="button" onClick={goLatest} title={tx(lang, 'chart.latest')} aria-label={tx(lang, 'chart.latest')} className="pill h-9 w-9 justify-center px-0">
                        <ArrowRightToLine className="size-3.5" />
                    </button>
                    <button type="button" onClick={() => manualRefresh.current?.()} title={tx(lang, 'chart.refresh')} aria-label={tx(lang, 'chart.refresh')} className="pill h-9 w-9 justify-center px-0">
                        <RefreshCw className="size-3.5" />
                    </button>
                    <button type="button" onClick={() => bumpHeight(1)} title={tx(lang, 'chart.taller')} aria-label={tx(lang, 'chart.taller')} className="pill h-9 w-9 justify-center px-0">
                        <UnfoldVertical className="size-3.5" />
                    </button>
                    <button type="button" onClick={() => bumpHeight(-1)} title={tx(lang, 'chart.shorter')} aria-label={tx(lang, 'chart.shorter')} className="pill h-9 w-9 justify-center px-0">
                        <FoldVertical className="size-3.5" />
                    </button>
                </div>
                <a href={tvUrl} target="_blank" rel="noopener noreferrer" className="ms-auto text-[12.5px] text-brand-ink hover:underline">
                    {tx(lang, 'stock.openTV')}
                </a>
            </div>
            <div className="relative">
                <div
                    ref={containerRef}
                    className="w-full"
                    style={{ height: expanded ? `calc(78vh + ${heightDelta}px)` : CHART_BASE_HEIGHT + heightDelta, cursor: tool || patternTool || countKind || textMode ? 'crosshair' : undefined }}
                    onDoubleClick={() => {
                        // Double-click restores the full view (disabled while placing drawings)
                        if (!toolRef.current && !patternToolRef.current) resetView();
                    }}
                />
                {/* Floating zoom + height: always visible over the chart (mobile-friendly), mirrors toolbar */}
                <div className="absolute bottom-3 end-3 z-20 flex gap-2" role="group" aria-label="Chart zoom">
                    <button
                        type="button"
                        onClick={() => zoomBy(0.7)}
                        title={tx(lang, 'chart.zoomIn')}
                        aria-label={tx(lang, 'chart.zoomIn')}
                        className="grid h-11 w-11 place-items-center rounded-full border border-line-strong bg-card/90 shadow-lg backdrop-blur-sm hover:bg-hover active:scale-95"
                    >
                        <ZoomIn className="size-5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => zoomBy(1.43)}
                        title={tx(lang, 'chart.zoomOut')}
                        aria-label={tx(lang, 'chart.zoomOut')}
                        className="grid h-11 w-11 place-items-center rounded-full border border-line-strong bg-card/90 shadow-lg backdrop-blur-sm hover:bg-hover active:scale-95"
                    >
                        <ZoomOut className="size-5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => bumpHeight(1)}
                        title={tx(lang, 'chart.taller')}
                        aria-label={tx(lang, 'chart.taller')}
                        className="grid h-11 w-11 place-items-center rounded-full border border-line-strong bg-card/90 shadow-lg backdrop-blur-sm hover:bg-hover active:scale-95"
                    >
                        <UnfoldVertical className="size-5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => bumpHeight(-1)}
                        title={tx(lang, 'chart.shorter')}
                        aria-label={tx(lang, 'chart.shorter')}
                        className="grid h-11 w-11 place-items-center rounded-full border border-line-strong bg-card/90 shadow-lg backdrop-blur-sm hover:bg-hover active:scale-95"
                    >
                        <FoldVertical className="size-5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => manualRefresh.current?.()}
                        title={tx(lang, 'chart.refresh')}
                        aria-label={tx(lang, 'chart.refresh')}
                        className="grid h-11 w-11 place-items-center rounded-full border border-line-strong bg-card/90 shadow-lg backdrop-blur-sm hover:bg-hover active:scale-95"
                    >
                        <RefreshCw className="size-5" />
                    </button>
                </div>
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
                    <svg
                        className="pointer-events-none absolute inset-0"
                        width={viewW}
                        height={viewH}
                        onPointerMove={onTextPointerMove}
                        onPointerUp={onTextPointerUp}
                    >
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
                            {texts.map((t) => {
                                const x = X(t.time);
                                const y = Y(t.price);
                                if (x == null || y == null) return null;
                                const selected = selectedTextId === t.id;
                                return (
                                    <g
                                        key={t.id}
                                        // The overlay is pointer-events-none so the chart
                                        // stays interactive; only the notes opt back in,
                                        // with a generous grab zone around the anchor dot.
                                        style={{ pointerEvents: 'auto', cursor: 'move', touchAction: 'none' }}
                                        onPointerDown={(e) => onTextPointerDown(e, t.id)}
                                        onDoubleClick={(e) => { e.stopPropagation(); startEditText(t.id); }}
                                    >
                                        <circle cx={x} cy={y} r={12} fill="transparent" />
                                        {selected && <circle cx={x} cy={y} r={7} fill="none" stroke="#EAB308" strokeWidth={1.5} />}
                                        <circle cx={x} cy={y} r={3.5} fill="#EAB308" />
                                        <text
                                            x={x} y={y - 8} textAnchor="middle" fontSize={13} fontWeight={600}
                                            fill={selected ? '#EAB308' : '#F5F5F5'} style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.85)', strokeWidth: 3 }}
                                        >
                                            {t.text}
                                        </text>
                                    </g>
                                );
                            })}
                            {textDraft && (() => {
                                const x = X(textDraft.time);
                                const y = Y(textDraft.price);
                                return x != null && y != null
                                    ? <circle cx={x} cy={y} r={5} fill="none" stroke="#EAB308" strokeWidth={1.5} strokeDasharray="3 2" /> : null;
                            })()}
                            {detected.map((p) => patternOverlay(p, `auto-${p.id}`))}
                            {patternDraftPair && patternElements(patternDraftPair, 'patterndraft', true)}
                            {countDraftPair && patternElements(countDraftPair, 'countdraft', true)}
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
                {helpOpen && (
                    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm" onClick={() => setHelpOpen(false)}>
                        <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
                            <div className="mb-3 flex items-center justify-between">
                                <h2 className="text-[16px] font-bold">{tx(lang, 'chart.help')}</h2>
                                <button type="button" onClick={() => setHelpOpen(false)} className="rounded-full p-1 hover:bg-hover" aria-label="Close">✕</button>
                            </div>
                            <div className="flex flex-col gap-2 text-[13px]">
                                {[
                                    ['?', tx(lang, 'chart.help')],
                                    ['Esc', 'Cancel drawing / Close panels'],
                                    ['Click', 'Place drawings & text notes'],
                                    ['Text btn', 'Type notes on the chart'],
                                    ['Export btn', 'Save chart as PNG'],
                                    ['Scroll / Pinch', 'Zoom in & out'],
                                    ['Drag', 'Pan the chart'],
                                ].map(([key, desc]) => (
                                    <div key={key} className="flex items-center gap-3">
                                        <kbd className="rounded border border-line bg-hover px-2 py-0.5 text-[11px] font-semibold">{key}</kbd>
                                        <span className="text-faint">{desc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            </div>
        </div>
    );
}
