import { describe, it, expect } from 'vitest';
// The parser next-intl itself uses (via use-intl)
import { parse, type MessageFormatElement } from '@formatjs/icu-messageformat-parser';
import en from '@/messages/en.json';
import pl from '@/messages/pl.json';
import ar from '@/messages/ar.json';
import { LOCALES, localeDir } from '@/i18n/config';

type Tree = { [key: string]: string | Tree };
const flat = (tree: Tree, prefix = ''): Record<string, string> =>
    Object.fromEntries(Object.entries(tree).flatMap(([k, v]) =>
        typeof v === 'string' ? [[prefix + k, v]] : Object.entries(flat(v, `${prefix}${k}.`))));
// The arguments and rich-text tags a message uses, at any depth
const collect = (els: MessageFormatElement[], out: Set<string>): Set<string> => {
    for (const el of els) {
        if ('value' in el && typeof el.value === 'string' && el.type !== 0) out.add(el.type === 8 ? `<${el.value}>` : el.value);
        if ('options' in el) for (const option of Object.values(el.options)) collect(option.value, out);
        if ('children' in el) collect(el.children, out);
    }
    return out;
};
const args = (msg: string) => collect(parse(msg), new Set());

describe('message files', () => {
    const base = flat(en as Tree);
    for (const [locale, messages] of Object.entries({ pl, ar })) {
        const other = flat(messages as Tree);
        it(`${locale} has exactly the English keys`, () => {
            expect(Object.keys(other).sort()).toEqual(Object.keys(base).sort());
        });
        it(`${locale} parses, and keeps every argument English shows`, () => {
            // A translation may add one (a plural on {count} that English leaves out), never drop one
            for (const [key, msg] of Object.entries(base)) {
                const theirs = args(other[key]);
                for (const arg of args(msg)) expect(theirs.has(arg), `${locale}:${key} lost ${arg}`).toBe(true);
            }
        });
    }

    it('ships every locale it lists, and only Arabic is right to left', () => {
        expect([...LOCALES].sort()).toEqual(['ar', 'en', 'pl']);
        expect(LOCALES.filter((l) => localeDir(l) === 'rtl')).toEqual(['ar']);
    });
});
