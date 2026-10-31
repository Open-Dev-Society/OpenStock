import { describe, expect, it } from 'vitest';
import {
    MAX_LISTS,
    MAX_LIST_SYMBOLS,
    addSymbol,
    canAddList,
    canAddSymbol,
    normalizeCompany,
    normalizeListName,
    normalizeSymbol,
    removeSymbol,
    type ListSymbol,
} from '@/lib/watchlist-lists';

const entry = (symbol: string, company = symbol): ListSymbol => ({ symbol, company, addedAt: new Date() });

describe('normalizeListName', () => {
    it('trims and collapses inner whitespace', () => {
        expect(normalizeListName('  Banks  ')).toBe('Banks');
        expect(normalizeListName('My    Dividend\nideas')).toBe('My Dividend ideas');
    });

    it('accepts exactly sixty characters and refuses sixty-one', () => {
        expect(normalizeListName('x'.repeat(60))).toBe('x'.repeat(60));
        expect(normalizeListName('x'.repeat(61))).toBeNull();
    });

    it('refuses anything that is not a usable name', () => {
        expect(normalizeListName('')).toBeNull();
        expect(normalizeListName('   ')).toBeNull();
        expect(normalizeListName(null)).toBeNull();
        expect(normalizeListName(undefined)).toBeNull();
        expect(normalizeListName(42)).toBeNull();
    });
});

describe('normalizeSymbol', () => {
    it('accepts the shapes the starred watchlist accepts', () => {
        expect(normalizeSymbol('AAPL')).toBe('AAPL');
        expect(normalizeSymbol('BRK.B')).toBe('BRK.B');
        expect(normalizeSymbol('RELIANCE.NS')).toBe('RELIANCE.NS');
        expect(normalizeSymbol('M&M.NS')).toBe('M&M.NS');
        expect(normalizeSymbol('0700.HK')).toBe('0700.HK');
        expect(normalizeSymbol('BINANCE:BTCUSDT')).toBe('BINANCE:BTCUSDT');
    });

    it('upper-cases and trims what it accepts', () => {
        expect(normalizeSymbol(' aapl ')).toBe('AAPL');
        expect(normalizeSymbol('brk.b')).toBe('BRK.B');
    });

    it('refuses anything the starred watchlist would refuse', () => {
        expect(normalizeSymbol('')).toBeNull();
        expect(normalizeSymbol('   ')).toBeNull();
        expect(normalizeSymbol('-AAPL')).toBeNull();
        expect(normalizeSymbol('AAPL;DROP')).toBeNull();
        expect(normalizeSymbol('x'.repeat(26))).toBeNull();
        expect(normalizeSymbol(null)).toBeNull();
        expect(normalizeSymbol({} as unknown)).toBeNull();
    });
});

describe('normalizeCompany', () => {
    it('trims, caps at 120 and always yields a string', () => {
        expect(normalizeCompany('  Apple Inc  ')).toBe('Apple Inc');
        expect(normalizeCompany('x'.repeat(200))).toHaveLength(120);
        expect(normalizeCompany(undefined)).toBe('');
    });
});

describe('limits', () => {
    it('allows the last slot and refuses the one after', () => {
        expect(canAddList(MAX_LISTS - 1)).toBe(true);
        expect(canAddList(MAX_LISTS)).toBe(false);
        expect(canAddSymbol(MAX_LIST_SYMBOLS - 1)).toBe(true);
        expect(canAddSymbol(MAX_LIST_SYMBOLS)).toBe(false);
    });
});

describe('addSymbol', () => {
    it('appends to an empty list', () => {
        const next = addSymbol([], entry('AAPL', 'Apple Inc'));
        expect(next).toHaveLength(1);
        expect(next[0]).toMatchObject({ symbol: 'AAPL', company: 'Apple Inc' });
    });

    it('replaces instead of duplicating, keeping the other entries', () => {
        const start = [entry('AAPL', 'Apple'), entry('MSFT', 'Microsoft')];
        const next = addSymbol(start, entry('AAPL', 'Apple Inc'));
        expect(next).toHaveLength(2);
        expect(next[0]).toMatchObject({ symbol: 'AAPL', company: 'Apple Inc' });
        expect(next[1]).toMatchObject({ symbol: 'MSFT' });
    });

    it('does not mutate the list it was given', () => {
        const start = [entry('AAPL')];
        addSymbol(start, entry('MSFT'));
        expect(start).toHaveLength(1);
    });
});

describe('removeSymbol', () => {
    it('drops a present symbol and keeps the rest', () => {
        const next = removeSymbol([entry('AAPL'), entry('MSFT')], 'AAPL');
        expect(next.map((s) => s.symbol)).toEqual(['MSFT']);
    });

    it('is a no-op for a symbol that is not there', () => {
        const next = removeSymbol([entry('AAPL')], 'TSLA');
        expect(next.map((s) => s.symbol)).toEqual(['AAPL']);
    });
});
