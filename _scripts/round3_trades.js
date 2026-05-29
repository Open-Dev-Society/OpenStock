const { MongoClient } = require('mongodb');
const undici = require('undici');
const fs = require('fs');
const path = require('path');

const USER_ID = '6a17b7387348b73526f6a170';
const PROXY = 'http://127.0.0.1:7890';
const dispatcher = new undici.ProxyAgent(PROXY);
const fetch = (url) => undici.fetch(url, { dispatcher });
const token = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').match(/NEXT_PUBLIC_FINNHUB_API_KEY=(\S+)/)?.[1] || '';

const orders = [
  { sym: 'COHU', shares: 50, company: 'Cohu Inc' },
  { sym: 'VICR', shares: 10, company: 'Vicor Corp' },
];

async function main() {
  const prices = {};
  for (const o of orders) {
    const r = await fetch('https://finnhub.io/api/v1/quote?symbol=' + o.sym + '&token=' + token);
    const d = await r.json();
    const roundedPrice = Math.round((d.c || 0) * 100) / 100;
    prices[o.sym] = roundedPrice;
    console.log(o.sym + ': $' + roundedPrice);
  }

  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('openstock');
  const accounts = db.collection('paperaccounts');
  const trades = db.collection('papertrades');

  const acc = await accounts.findOne({ userId: USER_ID });
  if (!acc) { console.log('No account'); await client.close(); return; }
  console.log('\nBalance: $' + acc.balance.toFixed(2));

  let totalCost = 0;
  for (const o of orders) {
    const price = prices[o.sym];
    const cost = +(price * o.shares).toFixed(2);
    totalCost += cost;
    console.log('BUY ' + o.shares + ' x ' + o.sym + ' @ $' + price + ' = $' + cost.toFixed(2));
    await trades.insertOne({
      userId: USER_ID, symbol: o.sym, company: o.company, type: 'BUY',
      shares: o.shares, price: price, total: cost, timestamp: new Date(),
    });
  }

  const newBalance = +(acc.balance - totalCost).toFixed(2);
  await accounts.updateOne({ _id: acc._id }, { $set: { balance: newBalance, updatedAt: new Date() } });

  console.log('\n=== ROUND 3 DEPLOYMENT ===');
  console.log('Invested: $' + totalCost.toFixed(2));
  console.log('Cash left: $' + newBalance.toFixed(2));

  // Final portfolio
  const allTrades = await trades.find({ userId: USER_ID }).sort({ timestamp: -1 }).toArray();
  const posMap = {};
  for (const t of allTrades) {
    if (!posMap[t.symbol]) posMap[t.symbol] = { shares: 0, cost: 0 };
    posMap[t.symbol].shares += t.type === 'BUY' ? t.shares : -t.shares;
    posMap[t.symbol].cost += t.type === 'BUY' ? t.total : 0;
  }
  console.log('\n=== FINAL PORTFOLIO ===');
  let totalInvested = 0;
  for (const [sym, pos] of Object.entries(posMap)) {
    if (pos.shares > 0) {
      const avg = pos.cost / pos.shares;
      totalInvested += pos.cost;
      const pct = (pos.cost / (totalInvested + newBalance - pos.cost + pos.cost) * 100).toFixed(1);
      console.log(sym.padEnd(6) + pos.shares.toString().padStart(4) + ' sh @ $' + avg.toFixed(2).padStart(8) + ' = $' + pos.cost.toFixed(2).padStart(10));
    }
  }
  console.log('Cash'.padEnd(6) + '     $' + newBalance.toFixed(2).padStart(10));
  console.log('Total'.padEnd(6) + '     $' + (totalInvested + newBalance).toFixed(2).padStart(10));

  await client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
