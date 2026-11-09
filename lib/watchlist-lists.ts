// Rules for named watchlists, kept apart from the database so they can be tested on their own.
// The server actions wrap these; nothing here talks to Mongo or to Finnhub.

/** A symbol filed into a named list, with the company name that was current when it was added. */
export type ListSymbol = {
    symbol: string;
    company: string;
    addedAt: Date;
};

/** Lists one user may keep. */
export const MAX_LISTS = 10;
/** Symbols one list may hold. */
export const MAX_LIST_SYMBOLS = 50;
/** Longest accepted list name, after trimming and collapsing whitespace. */
export const MAX_LIST_NAME = 60;
/** Longest stored company name, matching lib/actions/watchlist.actions.ts. */
const MAX_COMPANY = 120;

// The same shape the starred watchlist accepts (AAPL, BRK.B, RELIANCE.NS, M&M.NS, 0700.HK,
// BINANCE:BTCUSDT). Everything from here reaches Finnhub, so the two must agree.
const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9.&:-]{0,24}$/;

/** Cleans a list name; null when the result would be empty or too long. */
export const normalizeListName = (raw: unknown): string | null => {
    if (typeof raw !== 'string') return null;
    const name = raw.trim().replace(/\s+/g, ' ');
    if (!name || name.length > MAX_LIST_NAME) return null;
    return name;
};

/** Cleans a ticker the way the watchlist does; null when it is not a ticker. */
export const normalizeSymbol = (raw: unknown): string | null => {
    if (typeof raw !== 'string') return null;
    const symbol = raw.trim().toUpperCase();
    return SYMBOL_PATTERN.test(symbol) ? symbol : null;
};

/** Cleans a company name; always returns a string, capped like the watchlist's own. */
export const normalizeCompany = (raw: unknown): string => String(raw ?? '').trim().slice(0, MAX_COMPANY);

export const canAddList = (currentCount: number): boolean => currentCount < MAX_LISTS;
export const canAddSymbol = (currentCount: number): boolean => currentCount < MAX_LIST_SYMBOLS;

/**
 * Files a symbol into a list. A symbol that is already there is replaced — the newer company name
 * wins, the original position and `addedAt` are kept — so a list can never hold the same ticker twice.
 */
export const addSymbol = (symbols: readonly ListSymbol[], entry: ListSymbol): ListSymbol[] => {
    const at = symbols.findIndex((s) => s.symbol === entry.symbol);
    if (at === -1) return [...symbols, entry];
    return symbols.map((s, i) => (i === at ? { ...entry, addedAt: s.addedAt } : s));
};

/** Removes a symbol; a symbol that is not in the list leaves it unchanged. */
export const removeSymbol = (symbols: readonly ListSymbol[], symbol: string): ListSymbol[] =>
    symbols.filter((s) => s.symbol !== symbol);
