const { MongoClient } = require('mongodb');
const undici = require('undici');
const fs = require('fs');
const path = require('path');

const USER_ID = '6a17b7387348b73526f6a170';
const PROXY = 'http://127.0.0.1:7890';
const dispatcher = new undici.ProxyAgent(PROXY);
const fetch = (url) => undici.fetch(url, { dispatcher });
const token = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').match(/NEXT_PUBLIC_FINNHUB_API_KEY=(\S+)/)?.[1] || '';

// New orders: MU (storage), add more NVDA (AI), add more SMCI (AI infra)
const orders = [
  { sym: 'MU', shares: 10, company: 'Micron Technology Inc' },
  { sym: 'NVDA', shares: 25, company: 'NVIDIA Corp' },
  { sym: 'SMCI', shares: 100, company: 'Super Micro Computer Inc' },
];

async function main() {
  // Get current prices
  const prices = {};
  for (const o of orders) {
    const r = await fetch('https://finnhub.io/api/v1/quote?symbol=' + o.sym + '&token=' + token);
    const d = await r.json();
    prices[o.sym] = d.c || 0;
    console.log(o.sym + ': $' + prices[o.sym].toFixed(2));
  }

  // Connect to MongoDB
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('openstock');
  const accounts = db.collection('paperaccounts');
  const trades = db.collection('papertrades');

  // Get account
  const acc = await accounts.findOne({ userId: USER_ID });
  if (!acc) { console.log('No account found'); await client.close(); return; }
  console.log('\nCurrent balance: $' + acc.balance.toFixed(2));

  // Calculate costs
  let totalCost = 0;
  const executed = [];
  for (const o of orders) {
    const price = prices[o.sym];
    if (price <= 0) { console.log('SKIP ' + o.sym + ': invalid price'); continue; }
    const cost = +(price * o.shares).toFixed(2);
    totalCost += cost;
    executed.push({ ...o, price, cost });
  }

  if (totalCost > acc.balance) {
    console.log('Insufficient funds. Need $' + totalCost.toFixed(2) + ', have $' + acc.balance.toFixed(2));
    await client.close();
    return;
  }

  // Execute
  for (const e of executed) {
    console.log('BUY ' + e.shares + ' x ' + e.sym + ' @ $' + e.price.toFixed(2) + ' = $' + e.cost.toFixed(2));
    await trades.insertOne({
      userId: USER_ID,
      symbol: e.sym,
      company: e.company,
      type: 'BUY',
      shares: e.shares,
      price: e.price,
      total: e.cost,
      timestamp: new Date(),
    });
  }

  // Update balance
  const newBalance = +(acc.balance - totalCost).toFixed(2);
  await accounts.updateOne(
    { _id: acc._id },
    { $set: { balance: newBalance, updatedAt: new Date() } }
  );

  console.log('\n=== SECOND ROUND DEPLOYMENT ===');
  console.log('New investment: $' + totalCost.toFixed(2));
  console.log('Cash remaining: $' + newBalance.toFixed(2));

  // Final verification
  const vAcc = await accounts.findOne({ userId: USER_ID });
  const allTrades = await trades.find({ userId: USER_ID }).sort({ timestamp: -1 }).toArray();
  console.log('\n=== ALL POSITIONS ===');
  const posMap = {};
  for (const t of allTrades) {
    if (!posMap[t.symbol]) posMap[t.symbol] = { shares: 0, cost: 0 };
    posMap[t.symbol].shares += t.type === 'BUY' ? t.shares : -t.shares;
    posMap[t.symbol].cost += t.type === 'BUY' ? t.total : 0;
  }
  for (const [sym, pos] of Object.entries(posMap)) {
    if (pos.shares > 0) {
      console.log(sym.padEnd(6) + pos.shares + ' shares @ $' + (pos.cost / pos.shares).toFixed(2) + ' avg');
    }
  }
  console.log('\nCash: $' + vAcc.balance.toFixed(2));

  await client.close();
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
