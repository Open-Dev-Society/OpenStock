const { MongoClient } = require('mongodb');
const undici = require('undici');
const fs = require('fs');
const path = require('path');

const USER_ID = '6a17b7387348b73526f6a170';
const PROXY = 'http://127.0.0.1:7890';
const dispatcher = new undici.ProxyAgent(PROXY);
const fetch = (url) => undici.fetch(url, { dispatcher });
const token = fs.readFileSync('.env', 'utf8').match(/NEXT_PUBLIC_FINNHUB_API_KEY=(\S+)/)?.[1] || '';

const stockData = {
  'META': { shares: 50, company: 'Meta Platforms Inc', price: 0 },
  'NVDA': { shares: 100, company: 'NVIDIA Corp', price: 0 },
  'AMZN': { shares: 50, company: 'Amazon.com Inc', price: 0 },
  'SMCI': { shares: 200, company: 'Super Micro Computer Inc', price: 0 },
};

async function main() {
  // Get prices
  for (const sym of Object.keys(stockData)) {
    const r = await fetch('https://finnhub.io/api/v1/quote?symbol=' + sym + '&token=' + token);
    const d = await r.json();
    stockData[sym].price = d.c || 0;
    if (stockData[sym].price <= 0) {
      console.log('ERROR: Invalid price for', sym, JSON.stringify(d));
      process.exit(1);
    }
    console.log(sym + ': $' + stockData[sym].price.toFixed(2));
  }

  // Connect to MongoDB
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('openstock');
  const accounts = db.collection('paperaccounts');
  const trades = db.collection('papertrades');

  // Get account
  let acc = await accounts.findOne({ userId: USER_ID });
  if (!acc) {
    console.log('Creating new account...');
    const r = await accounts.insertOne({
      userId: USER_ID,
      balance: 100000,
      initialCapital: 100000,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    acc = await accounts.findOne({ userId: USER_ID });
  }

  console.log('Current balance: $' + acc.balance.toFixed(2));

  // Calculate total cost
  let totalCost = 0;
  const orders = [];
  for (const [sym, data] of Object.entries(stockData)) {
    const cost = +(data.price * data.shares).toFixed(2);
    totalCost += cost;
    orders.push({ sym, shares: data.shares, price: data.price, cost, company: data.company });
  }

  if (totalCost > acc.balance) {
    console.log('ERROR: Insufficient funds. Need $' + totalCost.toFixed(2) + ', have $' + acc.balance.toFixed(2));
    process.exit(1);
  }

  // Execute trades
  for (const o of orders) {
    console.log('BUY ' + o.shares + ' x ' + o.sym + ' @ $' + o.price.toFixed(2) + ' = $' + o.cost.toFixed(2));
    await trades.insertOne({
      userId: USER_ID,
      symbol: o.sym,
      company: o.company,
      type: 'BUY',
      shares: o.shares,
      price: o.price,
      total: o.cost,
      timestamp: new Date(),
    });
  }

  // Update balance
  const newBalance = +(acc.balance - totalCost).toFixed(2);
  await accounts.updateOne(
    { _id: acc._id },
    { $set: { balance: newBalance, updatedAt: new Date() } }
  );

  console.log('\n=== EXECUTION SUMMARY ===');
  console.log('Total invested:  $' + totalCost.toFixed(2));
  console.log('Cash remaining:  $' + newBalance.toFixed(2));
  console.log('Portfolio value: $' + (totalCost + newBalance).toFixed(2));

  // Verify
  const vAcc = await accounts.findOne({ userId: USER_ID });
  const vTrades = await trades.find({ userId: USER_ID }).sort({ timestamp: -1 }).toArray();
  console.log('\n=== VERIFICATION ===');
  console.log('Balance:', vAcc.balance);
  console.log('Trades:', vTrades.length);
  vTrades.forEach((t) => {
    console.log('  ' + t.type + ' ' + t.shares + ' x ' + t.symbol + ' @ $' + t.price + ' = $' + t.total);
  });

  await client.close();
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
