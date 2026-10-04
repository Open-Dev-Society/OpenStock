import { describe, expect, it } from 'vitest';
import { formatSpan, sessionOf } from '@/lib/market-session';

const at = (h: number, m = 0) => h * 60 + m;

describe('NYSE session', () => {
    it('knows each weekday phase', () => {
        expect(sessionOf(2, at(3)).phase).toBe('closed');
        expect(sessionOf(2, at(4)).phase).toBe('pre');
        expect(sessionOf(2, at(9, 30)).phase).toBe('open');
        expect(sessionOf(2, at(15, 59)).phase).toBe('open');
        expect(sessionOf(2, at(16)).phase).toBe('after');
        expect(sessionOf(2, at(20)).phase).toBe('closed');
    });

    it('counts down to the right open', () => {
        expect(sessionOf(2, at(9)).line).toBe('Pre-market · opens in 30m');
        expect(sessionOf(2, at(14)).line).toBe('Market open · closes in 2h 00m');
        // Friday night and Saturday wait for Monday 9:30
        expect(sessionOf(5, at(21)).line).toBe('Market closed · opens in 2d 12h');
        expect(sessionOf(6, at(12)).line).toBe('Market closed · opens in 1d 21h');
    });

    it('formats spans', () => {
        expect(formatSpan(45)).toBe('45m');
        expect(formatSpan(125)).toBe('2h 05m');
    });
});

import { getMarket, hasFinnhubQuotes, isMarketOpen } from '@/lib/markets';

describe('markets', () => {
    it('knows which symbols Finnhub free can price', () => {
        expect(hasFinnhubQuotes('AAPL')).toBe(true);
        expect(hasFinnhubQuotes('BRK.B')).toBe(true);
        expect(hasFinnhubQuotes('BINANCE:BTCUSDT')).toBe(true);
        expect(hasFinnhubQuotes('2222.SR')).toBe(false);
        expect(hasFinnhubQuotes('1120.SR')).toBe(false);
        expect(hasFinnhubQuotes('TADAWUL:2222')).toBe(false);
        expect(hasFinnhubQuotes('FX:EURUSD')).toBe(false);
    });

    it('opens Saudi market Sun-Thu in Riyadh time', () => {
        // Sun 2026-09-27 11:00 Riyadh = 08:00 UTC -> open (10:00-15:00 Sun-Thu)
        expect(isMarketOpen(getMarket('sa'), new Date('2026-09-27T08:00:00Z'))).toBe(true);
        expect(isMarketOpen(getMarket('sa'), new Date('2026-09-23T04:30:00Z'))).toBe(false);
        // Fri 2026-09-25: Tadawul closed (weekend Fri-Sat)
        expect(isMarketOpen(getMarket('sa'), new Date('2026-09-25T08:00:00Z'))).toBe(false);
        // Sat 2026-09-26: closed
        expect(isMarketOpen(getMarket('sa'), new Date('2026-09-26T08:00:00Z'))).toBe(false);
    });
});
