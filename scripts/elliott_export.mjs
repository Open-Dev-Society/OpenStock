#!/usr/bin/env node
// Export the app's own Elliott engine output for the chart renderer.
// Usage: node scripts/elliott_export.mjs <in.json> <out.json>
//   in.json  : { "4040.SR": { "times": [...], "highs": [...], "lows": [...], "closes": [...] } }
//   out.json : { "4040.SR": { "dev": 3.2, "labels": [...], "pivots": [...] } }
import { readFileSync, writeFileSync } from 'node:fs';
import { autoDevPct, elliottWaveLabels, zigzag } from '../lib/indicators.ts';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
    console.error('usage: node scripts/elliott_export.mjs <in.json> <out.json>');
    process.exit(1);
}

const input = JSON.parse(readFileSync(inPath, 'utf8'));
const out = {};

for (const [sym, d] of Object.entries(input)) {
    const { highs, lows, closes } = d;
    const dev = autoDevPct(highs, lows, closes);
    const labels = elliottWaveLabels(highs, lows, closes, dev);
    const pivots = zigzag(highs, lows, closes, dev).map((p) => ({
        index: p.index,
        price: p.price,
        type: p.type,
    }));
    out[sym] = {
        dev,
        labels: labels.map((l) => ({
            index: l.index,
            label: l.label,
            price: l.price,
            position: l.position,
            degree: l.degree,
            alternate: !!l.alternate,
        })),
        pivots,
    };
}

writeFileSync(outPath, JSON.stringify(out));
console.log(`exported ${Object.keys(out).length} symbols -> ${outPath}`);
