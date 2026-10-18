import { describe, expect, it } from 'vitest';
import {
    TEXT_MAX,
    loadTexts,
    makeTextNote,
    saveTexts,
    textsKey,
} from '@/lib/drawings';

describe('makeTextNote', () => {
    it('builds a note from a valid point and text', () => {
        const n = makeTextNote(1790848800, 10358.0, '  دعم  ');
        expect(n).toMatchObject({ time: 1790848800, price: 10358.0, text: 'دعم' });
        expect(typeof n?.id).toBe('string');
    });

    it('rejects blanks, overlong text and bad points', () => {
        expect(makeTextNote(1, 2, '')).toBeNull();
        expect(makeTextNote(1, 2, '   ')).toBeNull();
        expect(makeTextNote(1, 2, 'x'.repeat(TEXT_MAX + 1))).toBeNull();
        expect(makeTextNote(1, 2, 'x'.repeat(TEXT_MAX))).not.toBeNull();
        expect(makeTextNote(null, 2, 'a')).toBeNull();
        expect(makeTextNote(1, NaN, 'a')).toBeNull();
        expect(makeTextNote(1, Infinity, 'a')).toBeNull();
        expect(makeTextNote(1, 2, 42)).toBeNull();
    });

    it('collapses inner whitespace', () => {
        expect(makeTextNote('2026-10-15', 5, 'a  b\nc')?.text).toBe('a b c');
    });
});

describe('text persistence', () => {
    const key = textsKey('TASI', '30m');
    const store = new Map<string, string>();
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
        getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
        clear: () => store.clear(),
        key: () => null,
        length: 0,
    } as unknown as Storage;

    it('round-trips notes', () => {
        const n = makeTextNote(1790848800, 10358.0, 'قمة سابقة')!;
        saveTexts('TASI', '30m', [n]);
        const loaded = loadTexts('TASI', '30m');
        expect(loaded).toHaveLength(1);
        expect(loaded[0]).toEqual(n);
    });

    it('drops corrupt entries; save caps at 50', () => {
        const good = makeTextNote(1, 2, 'ok')!;
        localStorage.setItem(key, JSON.stringify([
            good,
            { id: 'x', pattern: 'nope' },
            { id: 'y', time: 1, price: 2, text: '' },
            { id: '', time: 1, price: 2, text: 'no-id' },
        ]));
        const loaded = loadTexts('TASI', '30m');
        expect(loaded).toEqual([good]);
        const many = Array.from({ length: 60 }, (_, i) => ({ ...good, id: `g${i}` }));
        saveTexts('TASI', '30m', many);
        expect(loadTexts('TASI', '30m')).toHaveLength(50);
    });

    it('returns [] for missing or broken storage', () => {
        localStorage.setItem(key, 'not-json');
        expect(loadTexts('TASI', '30m')).toEqual([]);
        localStorage.setItem(key, '{"a":1}');
        expect(loadTexts('TASI', '30m')).toEqual([]);
    });
});
