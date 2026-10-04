// Refreshes lib/tadawul-companies.ts from Yahoo Finance screener (exchange SAU).
// Usage: node scripts/fetch-tadawul-list.mjs
// No key needed; uses Yahoo's cookie+crumb flow like a browser.

const UA = 'Mozilla/5.0';

const cookieRes = await fetch('https://fc.yahoo.com/', { headers: { 'User-Agent': UA }, redirect: 'manual' });
const setCookie = cookieRes.headers.get('set-cookie') || '';
const cookie = setCookie.split(';')[0];

const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': UA, Cookie: cookie },
});
const crumb = await crumbRes.text();

const all = [];
for (const offset of [0, 250]) {
    const res = await fetch(`https://query1.finance.yahoo.com/v1/finance/screener?crumb=${crumb}`, {
        method: 'POST',
        headers: { 'User-Agent': UA, Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            offset, size: 250, sortField: 'ticker', sortType: 'ASC', quoteType: 'EQUITY',
            query: { operator: 'AND', operands: [{ operator: 'eq', operands: ['exchange', 'SAU'] }] },
        }),
    });
    if (!res.ok) throw new Error(`screener failed ${res.status}`);
    const json = await res.json();
    const result = json.finance.result[0];
    console.log(`offset ${offset}: ${result.count}/${result.total}`);
    all.push(...result.quotes);
}

const seen = new Set();
const rows = [];
for (const q of all) {
    const symbol = (q.symbol || '').toUpperCase();
    if (!/^\d+\.SR$/.test(symbol) || seen.has(symbol)) continue;
    seen.add(symbol);
    const name = (q.shortName || q.longName || '').trim() || symbol;
    rows.push({ symbol, name: name.replace(/\\/g, '\\\\').replace(/'/g, "\\'") });
}
rows.sort((a, b) => parseInt(a.symbol) - parseInt(b.symbol));
console.log(`unique numeric listings: ${rows.length}`);

const { writeFileSync, readFileSync, existsSync } = await import('fs');
const { resolve } = await import('path');

// Optional: TICKERCHART_MASTER=/path/to/MetaStock/MASTER re-merges Arabic names
// from a TickerChart MetaStock export (53-byte records, cp1256 names).
const arNames = new Map();
const masterPath = process.env.TICKERCHART_MASTER;
if (masterPath && existsSync(masterPath)) {
    const raw = readFileSync(resolve(masterPath));
    const decode = new TextDecoder('windows-1256');
    for (let i = 1; i < raw.length / 53; i++) {
        const r = raw.subarray(i * 53, (i + 1) * 53);
        const symbol = r.subarray(36, 52).toString('ascii').split('\0')[0];
        if (!/^\d+$/.test(symbol)) continue;
        let name = decode.decode(r.subarray(5, 22)).split('\0')[0];
        if (name.startsWith('Sa')) name = name.slice(2);
        if (name) arNames.set(`${symbol}.SR`, name);
    }
    console.log(`arabic names merged: ${arNames.size}`);
}

const esc = (t) => t.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const out = [
    '// Full Saudi Exchange directory (Tadawul main market).',
    `// Symbols + English names: Yahoo Finance screener (exchange SAU), ${new Date().toISOString().slice(0, 10)}: ${rows.length} numeric listings.`,
    "// Arabic names (ar): TickerChart MetaStock MASTER export.",
    '// Refresh: node scripts/fetch-tadawul-list.mjs (Yahoo); set TICKERCHART_MASTER to re-merge Arabic names.',
    '',
    'export type TadawulCompany = { symbol: string; name: string; ar?: string };',
    '',
    'export const TADAWUL_COMPANIES: TadawulCompany[] = [',
    ...rows.map((r) => {
        const ar = arNames.get(r.symbol);
        return `    { symbol: '${r.symbol}', name: '${esc(r.name)}'${ar ? `, ar: '${esc(ar)}'` : ''} },`;
    }),
    '];',
    '',
    'export const TADAWUL_COUNT = TADAWUL_COMPANIES.length;',
    '',
].join('\n');
writeFileSync(new URL('../lib/tadawul-companies.ts', import.meta.url), out);
console.log('wrote lib/tadawul-companies.ts');
