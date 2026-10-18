import { describe, expect, it } from 'vitest';
import {
    TRANSFER_VERSION,
    buildTransferPayload,
    parseTransferPayload,
} from '@/lib/drawings';

const drawing = (tool = 'trend') => ({
    id: 'd1',
    tool,
    a: { time: 1790848800, price: 10358.0 },
    b: { time: 1791356400, price: 10604.9 },
});

const count = () => ({
    id: 'seed-ew-iv',
    pattern: 'ew-count',
    pts: [
        { time: 1790848800, price: 10358.0 },
        { time: 1791356400, price: 10604.9 },
        { time: 1791702000, price: 10238.6 },
        { time: 1791714600, price: 10393.7 },
        { time: 1792051200, price: 10054.8 },
    ],
    labels: ['I', 'II', 'III', 'IV', 'V'],
});

describe('transfer payload', () => {
    it('round-trips drawings, counts and indicator settings', () => {
        const payload = buildTransferPayload({
            symbol: 'TASI',
            range: '30m',
            indicators: { enabled: { elliott: true }, params: {}, colors: {} },
            drawings: [drawing() as never],
            patterns: [count() as never],
        });
        expect(payload.v).toBe(TRANSFER_VERSION);
        expect(payload.app).toBe('openstock');
        // JSON is the actual wire format between browsers.
        const parsed = parseTransferPayload(JSON.parse(JSON.stringify(payload)));
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;
        expect(parsed.drawings).toHaveLength(1);
        expect(parsed.patterns).toHaveLength(1);
        expect(parsed.patterns[0].labels).toEqual(['I', 'II', 'III', 'IV', 'V']);
        expect(parsed.payload.symbol).toBe('TASI');
    });

    it('drops unknown tools and short point lists instead of crashing', () => {
        const payload = buildTransferPayload({ symbol: 'TASI', range: '30m' });
        const raw = {
            ...payload,
            drawings: [{ ...drawing(), tool: 'not-a-tool' }, { ...drawing(), a: { time: 1, price: 'bad' } }],
            patterns: [
                { ...count(), pattern: 'not-a-tool' },
                { ...count(), pts: [{ time: 1, price: 2 }] },
                { ...count(), pts: [{ time: 1, price: 'bad' }] },
            ],
        };
        const parsed = parseTransferPayload(raw);
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;
        // Nothing renderable survives, and nothing undefined leaks through
        // to patternElements (which would crash on def.group).
        expect(parsed.drawings).toEqual([]);
        expect(parsed.patterns).toEqual([]);
    });

    it('rejects foreign shapes without touching the chart', () => {
        for (const bad of [
            null,
            'string',
            42,
            { app: 'other', kind: 'chart-transfer', v: TRANSFER_VERSION },
            { app: 'openstock', kind: 'other', v: TRANSFER_VERSION },
            { app: 'openstock', kind: 'chart-transfer', v: 999 },
            { app: 'openstock', kind: 'chart-transfer', v: TRANSFER_VERSION },
        ]) {
            const r = parseTransferPayload(bad);
            expect(r.ok).toBe(false);
            if (!r.ok) expect(typeof r.error).toBe('string');
        }
    });

    it('tells a truncated paste apart from a foreign payload', () => {
        // The realistic broken paste: the user copied only the tail, so the
        // payload keeps its payload-shaped keys but has lost "app"/"kind".
        const tailOnly = { v: 1, symbol: '2190.SR', range: 'D', indicators: { colors: { volume: '#26A69A' } } };
        const indicatorsFragment = { indicators: { colors: { volume: '#26A69A' } } };
        const foreign = { app: 'photoshop', kind: 'chart-transfer', v: TRANSFER_VERSION };
        // Anything that still carries payload keys is a botched copy, not a
        // foreign app, so the message can tell the user to re-copy.
        expect(parseTransferPayload(tailOnly)).toEqual({ ok: false, error: 'truncated' });
        expect(parseTransferPayload(indicatorsFragment)).toEqual({ ok: false, error: 'truncated' });
        expect(parseTransferPayload(foreign)).toEqual({ ok: false, error: 'not-transfer' });
        // Something with none of the payload keys is simply not our format.
        expect(parseTransferPayload({ hello: 'world' })).toEqual({ ok: false, error: 'not-transfer' });
    });

    it('omits empty sections and caps at 50 entries', () => {
        const empty = buildTransferPayload({ symbol: 'TASI', range: '30m' });
        expect(empty.drawings).toBeUndefined();
        expect(empty.patterns).toBeUndefined();
        const many = buildTransferPayload({
            symbol: 'TASI',
            range: '30m',
            drawings: Array.from({ length: 80 }, (_, i) => ({ ...drawing(), id: `d${i}` }) as never),
        });
        expect(many.drawings).toHaveLength(50);
    });
});
