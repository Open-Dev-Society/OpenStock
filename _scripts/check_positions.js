const { MongoClient } = require('mongodb');
const undici = require('undici');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const USER_ID = '6a17b7387348b73526f6a170';
const PROXY = 'http://127.0.0.1:7890';
const dispatcher = new undici.ProxyAgent(PROXY);
const fetch = (url) => undici.fetch(url, { dispatcher });
const token = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').match(/NEXT_PUBLIC_FINNHUB_API_KEY=(\S+)/)?.[1] || '';
const cacheDir = path.join(process.env.HOME, '.hermes', 'cache', 'finnhub');
fs.mkdirSync(cacheDir, { recursive: true });

async function getQuote(sym) {
  const hash = crypto.createHash('md5').update('quote_' + sym + '_' + token).digest('hex');
  const cf = path.join(cacheDir, hash + '.json');
  try {
    const c = JSON.parse(fs.readFileSync(cf, 'utf8'));
    if (Date.now() - c.ts < 60 * 1000) return c.data;
  } catch {}
  const r = await fetch('https://finnhub.io/api/v1/quote?symbol=' + sym + '&token=' + token);
  const d = await r.json();
  fs.writeFileSync(cf, JSON.stringify({ ts: Date.now(), data: d }));
  return d;
}

async function main() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('openstock');
  const accounts = db.collection('paperaccounts');
  const trades = db.collection('papertrades');

  const acc = await accounts.findOne({ userId: USER_ID });
  if (!acc) { console.log('No account found'); await client.close(); return; }

  const openPositions = await trades.aggregate([
    { $match: { userId: USER_ID } },
    { $group: { _id: '$symbol', shares: { $sum: { $cond: [{ $eq: ['$type', 'BUY'] }, '$shares', { $multiply: ['$shares', -1] }] } }, totalCost: { $sum: { $cond: [{ $eq: ['$type', 'BUY'] }, '$total', 0] } }, company: { $first: '$company' } } },
    { $match: { shares: { $gt: 0 } } }
  ]).toArray();

  console.log('=== PAPER TRADING PORTFOLIO ===');
  console.log('Date:', new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }));
  console.log('');

  let totalMV = 0;
  let totalPL = 0;
  const positionLines = [];

  for (const pos of openPositions) {
    const q = await getQuote(pos._id);
    const price = q?.c || 0;
    const avgCost = pos.totalCost / pos.shares;
    const marketValue = +(pos.shares * price).toFixed(2);
    const pl = +(marketValue - pos.totalCost).toFixed(2);
    const plPct = pos.totalCost > 0 ? +((pl / pos.totalCost) * 100).toFixed(2) : 0;

    totalMV += marketValue;
    totalPL += pl;

    const emoji = pl >= 0 ? '🟢' : '🔴';
    const warn = plPct <= -10 ? ' ⚠️ STOP LOSS' : plPct <= -7 ? ' ⚠️ Watch' : '';
    positionLines.push(`${emoji} ${pos._id.padEnd(6)} ${(pos.company || '').padEnd(25)} ${String(pos.shares).padStart(4)} sh @ $${String(avgCost.toFixed(2)).padStart(8)} → $${String(price.toFixed(2)).padStart(8)} | MV: $${String(marketValue.toFixed(2)).padStart(10)} | P&L: ${pl >= 0 ? '+' : ''}${pl.toFixed(2)} (${plPct >= 0 ? '+' : ''}${plPct}%)${warn}`);
  }

  if (positionLines.length === 0) {
    console.log('No open positions.');
  } else {
    positionLines.forEach(l => console.log(l));
  }

  const totalValue = totalMV + acc.balance;
  const totalPLPct = acc.initialCapital > 0 ? +((totalValue / acc.initialCapital - 1) * 100).toFixed(2) : 0;

  console.log('');
  console.log('=== SUMMARY ===');
  console.log('Cash Balance:    $' + acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 }));
  console.log('Market Value:    $' + totalMV.toLocaleString(undefined, { minimumFractionDigits: 2 }));
  console.log('Total Value:     $' + totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 }));
  console.log('Total P&L:       ' + (totalPL >= 0 ? '+' : '') + '$' + totalPL.toLocaleString(undefined, { minimumFractionDigits: 2 }) + ' (' + (totalPLPct >= 0 ? '+' : '') + totalPLPct + '%)');
  console.log('');
  console.log('GRADE TARGET:');
  console.log('  S ($200k+): ' + (totalValue >= 200000 ? '✅' : '$' + (200000 - totalValue).toLocaleString() + ' away'));
  console.log('  A ($120k+): ' + (totalValue >= 120000 ? '✅' : '$' + (120000 - totalValue).toLocaleString() + ' away'));
  console.log('  B ($50k+):  ' + (totalValue >= 50000 ? '✅' : '$' + (50000 - totalValue).toLocaleString() + ' away'));
  console.log('  C (<$50k):  ' + (totalValue < 50000 ? '⚠️ DANGER' : 'Safe'));

  await client.close();
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
