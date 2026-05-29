const undici = require('undici');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const dispatcher = new undici.ProxyAgent('http://127.0.0.1:7890');
const fetch = (url) => undici.fetch(url, { dispatcher });
const token = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').match(/NEXT_PUBLIC_FINNHUB_API_KEY=(\S+)/)?.[1] || '';
const cacheDir = path.join(process.env.HOME, '.hermes', 'cache', 'finnhub');
fs.mkdirSync(cacheDir, { recursive: true });

async function cachedFetch(url, ttl) {
  const hash = crypto.createHash('md5').update(url).digest('hex');
  const cf = path.join(cacheDir, hash + '.json');
  try {
    const c = JSON.parse(fs.readFileSync(cf, 'utf8'));
    if (Date.now() - c.ts < ttl * 1000) return c.data;
  } catch {}
  const r = await fetch(url);
  const d = await r.json();
  fs.writeFileSync(cf, JSON.stringify({ ts: Date.now(), data: d }));
  return d;
}

async function main() {
  const stocks = [
    // Storage specific
    { sym: 'WDC', name: 'Western Digital' },
    { sym: 'STX', name: 'Seagate Technology' },
    { sym: 'MU', name: 'Micron Technology' },
    // Data center / AI infra
    { sym: 'NVDA', name: 'NVIDIA' },
    { sym: 'AMD', name: 'AMD' },
    { sym: 'SMCI', name: 'Super Micro' },
    { sym: 'AVGO', name: 'Broadcom' },
    { sym: 'MRVL', name: 'Marvell Tech' },
    // Semi equipment
    { sym: 'AMAT', name: 'Applied Materials' },
    { sym: 'LRCX', name: 'Lam Research' },
    { sym: 'KLAC', name: 'KLA Corp' },
    // Legacy
    { sym: 'INTC', name: 'Intel' },
  ];

  console.log('=== STORAGE & SEMICONDUCTOR SECTOR ANALYSIS ===');
  console.log('Time:', new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }));
  console.log('(Prices may be 15-min delayed from last close)\n');

  for (const s of stocks) {
    const q = await cachedFetch('https://finnhub.io/api/v1/quote?symbol=' + s.sym + '&token=' + token, 60);
    const pp = await cachedFetch('https://finnhub.io/api/v1/stock/profile2?symbol=' + s.sym + '&token=' + token, 86400);
    if (q && q.c) {
      const chg = q.dp >= 0 ? '+' : '';
      const emoji = q.dp > 2 ? '🔥' : q.dp > 0 ? '📈' : q.dp > -2 ? '📉' : '💀';
      const mv = pp?.marketCapitalization ? '$' + (pp.marketCapitalization / 1e9).toFixed(1) + 'B' : '';
      console.log(emoji + ' ' + s.sym.padEnd(6) + s.name.padEnd(22) + '$' + String(q.c).padStart(8) + '  ' + chg + q.dp.toFixed(2) + '%  ' + mv);
    }
  }

  console.log('\n=== OUR CURRENT HOLDINGS ===');
  console.log('NVDA: 100 shares @ $212.60');
  console.log('SMCI: 200 shares @ $38.19');
  console.log('Cash: $25,746.75');
  console.log('\nFor additional buys: remaining cash = $25,746.75 (25.7% of portfolio)');
}

main().catch(console.error);
