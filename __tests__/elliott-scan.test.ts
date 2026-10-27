// Elliott wave scan for a real symbol/timeframe, using OpenStock's own engine
// (lib/indicators.ts) rather than a re-implementation, so the count obeys the
// same gates the app shows.
//
// Run with:  npx vitest run scripts/elliott-scan.ts -- --symbol TASI --range 30m
//
// It fetches Yahoo directly (same URL builder as lib/yahoo.ts), then calls
// elliottWaveLabels() and prints every count it found, per degree.

import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { parseYahooChart, normalizeYahooSymbol } from '@/lib/yahoo';
import { elliottWaveLabels, elliottMarkers, elliottNestedLevels, autoDevPct, ELLIOTT_ENGINE_VERSION } from '@/lib/indicators';

function arg(name: string, fallback: string) {
    // vitest does not forward `--flag value` past its own `--` separator, so
    // read the scan options from the environment instead.
    const env = process.env[`ELLIOTT_${name.toUpperCase().replace(/-/g, '_')}`];
    if (env) return env;
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

// rangeId -> Yahoo range/interval, mirroring CANDLE_RANGES in lib/yahoo.ts
const RANGES: Record<string, [string, string]> = {
    '1m': ['7d', '1m'], '5m': ['1mo', '5m'], '15m': ['60d', '15m'],
    '30m': ['60d', '30m'], '1H': ['2y', '1h'], 'D': ['1y', '1d'],
    'W': ['5y', '1wk'], 'M': ['max', '1mo'],
};

// Wall-clock minutes per bar, reported so the scan output says which frame
// the inner-degree rule (a fixed 10-bar floor) was applied to.
const MINUTES_PER_BAR: Record<string, number> = {
    '1m': 1, '5m': 5, '15m': 15, '30m': 30,
    '1H': 60, 'D': 60 * 24, 'W': 60 * 24 * 7, 'M': 60 * 24 * 30,
};

export async function scan() {
    const symbolArg = arg('symbol', 'TASI');
    const rangeId = arg('range', '30m');
    const devArg = arg('dev', '');
    const outFile = arg('out-json', '');

    const yahooSymbol = normalizeYahooSymbol(symbolArg);
    if (!yahooSymbol) throw new Error(`cannot normalize symbol: ${symbolArg}`);
    const [range, interval] = RANGES[rangeId] ?? RANGES['D'];

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`;
    console.log(`symbol=${yahooSymbol}  range=${range}  interval=${interval}`);

    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`Yahoo returned ${res.status}`);
    const parsed = parseYahooChart(await res.json(), interval.endsWith('m') || interval.endsWith('h'));
    if (!parsed) throw new Error('could not parse the Yahoo payload');

    const candles = parsed.candles;
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const closes = candles.map((c) => c.close);
    const times = candles.map((c) => c.time);

    const dev = devArg ? Number(devArg) : undefined;
    const usedDev = dev ?? autoDevPct(highs, lows, closes);

    console.log(`bars=${candles.length}  first=${times[0]}  last=${times[times.length - 1]}`);
    console.log(`frame=${rangeId}  minutesPerBar=${MINUTES_PER_BAR[rangeId] ?? '?'}`);
    console.log(`lastClose=${closes[closes.length - 1].toFixed(2)}  engine=${ELLIOTT_ENGINE_VERSION}`);
    console.log(`devPct=${devArg || `auto (${usedDev.toFixed(3)})`}`);

    const labels = elliottWaveLabels(highs, lows, closes, dev);
    const markers = elliottMarkers(labels, times, '#2962FF', '#EF5350');
    console.log(`labels=${labels.length}  markers=${markers.length}`);

    const byDegree = new Map<string, typeof labels>();
    for (const l of labels) {
        if (!byDegree.has(l.degree)) byDegree.set(l.degree, []);
        byDegree.get(l.degree)!.push(l);
    }
    for (const [degree, list] of byDegree) {
        list.sort((a, b) => a.index - b.index);
        console.log(`\n=== degree: ${degree}  (${list.length} labels) ===`);
        for (const l of list) {
            const p = l.price ?? closes[l.index];
            console.log(
                `  ${l.label.padEnd(5)} idx=${String(l.index).padStart(3)}  time=${times[l.index]}  price=${p?.toFixed(2)}  ${l.position}${l.alternate ? '  (alternate)' : ''}`,
            );
        }
    }

    console.log('\n=== markers ===');
    for (const m of markers) {
        console.log(`  ${m.text.padEnd(8)} time=${m.time}  pos=${m.position}  price=${m.price?.toFixed(2) ?? '-'}  size=${m.size}`);
    }

    if (outFile) {
        const levels = elliottNestedLevels(highs, lows, closes, dev);
        writeFileSync(outFile, JSON.stringify({ symbol: yahooSymbol, rangeId, candles, labels, markers, levels, dev: usedDev }));
        console.log(`\n=== nested levels (all degrees on one window) ===`);
        for (const lv of levels) {
            const seq = lv.labels
                .slice()
                .sort((a, b) => a.index - b.index)
                .map((l) => l.label)
                .join(' ');
            console.log(`  ${lv.degree.padEnd(6)} ${lv.labels.length}  ${seq}`);
        }
        console.log(`\nwrote ${outFile}`);
    }
}

// This is a tool, not a unit test: it hits Yahoo and prints a scan. It only
// runs when asked for explicitly, so the normal suite stays offline.
//
//   ELLIOTT_SYMBOL=TASI ELLIOTT_RANGE=30m \
//     npx vitest run __tests__/elliott-scan.test.ts
it('scans', async () => {
    if (!process.env.ELLIOTT_SYMBOL) {
        console.log('elliott-scan: skipped (set ELLIOTT_SYMBOL to run, e.g. ELLIOTT_SYMBOL=TASI)');
        return;
    }
    await scan();
}, 120_000);
