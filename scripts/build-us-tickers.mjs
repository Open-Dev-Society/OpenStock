import { writeFileSync } from 'node:fs';

// Regenerates data/us-tickers.json. Static names, sectors and CIKs only: no prices.
// S&P 500: datasets/s-and-p-500-companies (GICS sector, sub-industry, CIK).
// Nasdaq-100: Wikipedia "List of NASDAQ-100 companies" (tickers not already in the S&P 500).
// Exchange: SEC company_tickers_exchange.json (public domain). SEC writes class shares as BRK-B;
// we keep the dotted form (BRK.B) used by the S&P list and by TradingView.
//
//   node scripts/build-us-tickers.mjs

// SEC fair-access rules: a User-Agent that names the app and a contact address. A URL in the
// header is what their edge blocks; the email form is the one their docs ask for.
const UA = 'OpenStock (opendevsociety@gmail.com)';
const SP500_URL = 'https://raw.githubusercontent.com/datasets/s-and-p-500-companies/master/data/constituents.csv';
const NDX_URL = 'https://en.wikipedia.org/wiki/List_of_NASDAQ-100_companies';
const SEC_URL = 'https://www.sec.gov/files/company_tickers_exchange.json';

const get = (url, accept) => fetch(url, { headers: { 'User-Agent': UA, Accept: accept } }).then((res) => {
    if (!res.ok) throw new Error(`${url} returned ${res.status}`);
    return res.text();
});

// Quoted CSV. The S&P file quotes headquarters that contain commas.
function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quoted) {
            if (ch === '"') {
                if (text[i + 1] === '"') { cell += '"'; i++; }
                else quoted = false;
            } else cell += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === ',') { row.push(cell); cell = ''; }
        else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
        else if (ch !== '\r') cell += ch;
    }
    if (cell.length || row.length) { row.push(cell); rows.push(row); }
    const [header, ...body] = rows.filter((r) => r.length > 1);
    return body.map((r) => Object.fromEntries(header.map((key, i) => [key, r[i] ?? ''])));
}

function textOf(html) {
    return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#039;|&apos;/g, "'").replace(/&quot;/g, '"').trim();
}

function parseNasdaq100(html) {
    const tableStart = html.indexOf('>Ticker<');
    if (tableStart < 0) throw new Error('Nasdaq-100 table not found');
    const table = html.slice(tableStart, html.indexOf('</table>', tableStart));
    const rows = [];
    for (const row of table.matchAll(/<tr[\s\S]*?<\/tr>/g)) {
        const cells = [...row[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => textOf(m[1]));
        if (cells.length >= 4 && /^[A-Z][A-Z0-9.-]{0,7}$/.test(cells[0])) {
            rows.push({ symbol: cells[0], name: cells[1], sector: cells[2], subIndustry: cells[3] });
        }
    }
    if (rows.length < 90) throw new Error(`Expected about 100 Nasdaq-100 rows, parsed ${rows.length}`);
    return rows;
}

const [spText, ndxHtml, secText] = await Promise.all([
    get(SP500_URL, 'text/csv'),
    get(NDX_URL, 'text/html'),
    get(SEC_URL, 'application/json'),
]);
const spRows = parseCsv(spText);
const ndxRows = parseNasdaq100(ndxHtml);
const sec = JSON.parse(secText);
const secByTicker = new Map();
for (const row of sec.data) {
    const [cik, , ticker, exchange] = row;
    if (ticker) secByTicker.set(String(ticker).toUpperCase(), { cik: String(cik), exchange: exchange || '' });
}

const tickers = new Map();
for (const row of spRows) {
    const symbol = row.Symbol.trim().toUpperCase();
    if (!symbol) continue;
    const secHit = secByTicker.get(symbol) || secByTicker.get(symbol.replace(/\./g, '-'));
    tickers.set(symbol, {
        symbol,
        name: row.Security.trim(),
        exchange: secHit?.exchange || '',
        sector: row['GICS Sector'].trim(),
        subIndustry: row['GICS Sub-Industry'].trim(),
        cik: String(row.CIK || secHit?.cik || '').replace(/^0+/, ''),
        indexes: ['SP500'],
    });
}

let ndxOnly = 0;
for (const row of ndxRows) {
    const existing = tickers.get(row.symbol);
    if (existing) {
        if (!existing.indexes.includes('NDX100')) existing.indexes.push('NDX100');
        continue;
    }
    const secHit = secByTicker.get(row.symbol) || secByTicker.get(row.symbol.replace(/\./g, '-'));
    tickers.set(row.symbol, {
        symbol: row.symbol,
        name: row.name,
        exchange: secHit?.exchange || 'Nasdaq',
        sector: row.sector,
        subIndustry: row.subIndustry,
        cik: secHit?.cik || '',
        indexes: ['NDX100'],
    });
    ndxOnly++;
}

const list = [...tickers.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
const missingCik = list.filter((t) => !t.cik).map((t) => t.symbol);
const file = {
    generated: new Date().toISOString().slice(0, 10),
    note: 'Static index membership, names, GICS or ICB sector, and SEC CIK. No market prices. Regenerate with scripts/build-us-tickers.mjs.',
    tickers: list,
};

writeFileSync(new URL('../data/us-tickers.json', import.meta.url), JSON.stringify(file, null, 2) + '\n');
console.log(`Wrote ${list.length} tickers (${spRows.length} S&P rows, ${ndxOnly} Nasdaq-100 only). Missing CIK: ${missingCik.join(', ') || 'none'}`);
