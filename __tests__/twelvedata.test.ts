import { describe, it, expect } from 'vitest';
import {
    TWELVE_RANGE_MAP,
    isPlanLocked,
    parseTwelveQuote,
    parseTwelveSeries,
    riyadhToUnix,
    twelveSymbol,
} from '@/lib/twelvedata';

describe('twelveSymbol', () => {
    it('maps app symbols to bare Twelve numbers', () => {
        expect(twelveSymbol('2222.SR')).toBe('2222');
        expect(twelveSymbol('TADAWUL:1120')).toBe('1120');
        expect(twelveSymbol('2222')).toBe('2222');
    });

    it('rejects non-Tadawul symbols', () => {
        expect(twelveSymbol('AAPL')).toBeNull();
        expect(twelveSymbol('TADAWUL:TASI')).toBeNull();
    });
});

describe('riyadhToUnix', () => {
    it('converts Riyadh wall time to unix seconds', () => {
        // 2026-10-01 15:00 Riyadh = 12:00 UTC
        expect(riyadhToUnix('2026-10-01 15:00:00')).toBe(Date.UTC(2026, 9, 1, 12, 0, 0) / 1000);
    });

    it('returns null for malformed input', () => {
        expect(riyadhToUnix('')).toBeNull();
        expect(riyadhToUnix('2026-10-01')).toBeNull();
    });
});

describe('parseTwelveSeries', () => {
    const fixture = {
        status: 'ok',
        meta: { currency: 'SAR' },
        values: [
            { datetime: '2026-10-01 15:00:00', open: '568', high: '568', low: '568', close: '568', volume: '0' },
            { datetime: '2026-10-01 14:59:00', open: '566', high: '566.5', low: '566', close: '566', volume: '194' },
        ],
    };

    it('reverses newest-first into ascending candles', () => {
        const parsed = parseTwelveSeries(fixture);
        expect(parsed?.candles).toHaveLength(2);
        expect(parsed?.candles[0].close).toBe(566);
        expect(parsed?.candles[1].close).toBe(568);
        expect(parsed?.candles[1].time).toBe(Date.UTC(2026, 9, 1, 12, 0, 0) / 1000);
        expect(parsed?.currency).toBe('SAR');
    });

    it('returns null for errors and empty values', () => {
        expect(parseTwelveSeries({ status: 'error' })).toBeNull();
        expect(parseTwelveSeries({ status: 'ok', values: [] })).toBeNull();
    });
});

describe('parseTwelveQuote', () => {
    it('parses quote payloads', () => {
        const q = parseTwelveQuote({ close: '25.28', change: '0.06', percent_change: '0.238', currency: 'SAR', exchange: 'Tadawul' });
        expect(q).toMatchObject({ price: 25.28, currency: 'SAR' });
    });

    it('rejects error payloads', () => {
        expect(parseTwelveQuote({ status: 'error' })).toBeNull();
    });
});

describe('isPlanLocked', () => {
    it('detects Pro-plan locks', () => {
        expect(isPlanLocked({ code: 404, message: 'This symbol is available starting with the Pro or Venture plan.' })).toBe(true);
        expect(isPlanLocked({ price: '568' })).toBe(false);
    });
});

describe('TWELVE_RANGE_MAP', () => {
    it('covers every intraday timeframe', () => {
        expect(TWELVE_RANGE_MAP['1m']).toMatchObject({ interval: '1min' });
        expect(TWELVE_RANGE_MAP['30m']).toMatchObject({ interval: '30min' });
        expect(TWELVE_RANGE_MAP['1H']).toMatchObject({ interval: '1h' });
        expect(TWELVE_RANGE_MAP['D']).toBeUndefined();
        expect(TWELVE_RANGE_MAP['M']).toBeUndefined();
    });
});
