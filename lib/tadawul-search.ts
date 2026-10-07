import { TADAWUL_MAIN_COMPANIES, type TadawulCompany } from '@/lib/tadawul-companies';

// Local-first search over the main-market directory (no Finnhub quota spent).
// Nomu (9xxx) excluded — direct /stocks/[symbol] URLs still resolve via the full directory.
// Digits match the symbol ("2222" -> 2222.SR), Latin or Arabic text matches the name.
export function matchTadawulCompanies(query: string, limit = 15): TadawulCompany[] {
    const q = (query || '').trim().toUpperCase();
    if (!q) return [];
    const digits = q.replace(/[^0-9]/g, '');
    const startsSymbol: TadawulCompany[] = [];
    const startsName: TadawulCompany[] = [];
    const contains: TadawulCompany[] = [];
    for (const c of TADAWUL_MAIN_COMPANIES) {
        const sym = c.symbol.toUpperCase();
        const names = [c.name.toUpperCase(), (c.ar || '').toUpperCase()].filter(Boolean);
        if (digits && sym.replace(/[^0-9]/g, '').startsWith(digits)) {
            startsSymbol.push(c);
        } else if (names.some((n) => n.startsWith(q))) {
            startsName.push(c);
        } else if ((digits && sym.includes(digits)) || names.some((n) => n.includes(q))) {
            contains.push(c);
        }
    }
    return [...startsSymbol, ...startsName, ...contains].slice(0, limit);
}

// Display name: English + Arabic when available.
export const tadawulDisplayName = (c: Pick<TadawulCompany, 'name' | 'symbol'> & { ar?: string }) =>
    c.ar ? `${c.name} · ${c.ar}` : (c.name || c.symbol);
