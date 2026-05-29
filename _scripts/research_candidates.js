const undici = require('undici');
const fs = require('fs');
const path = require('path');

const dispatcher = new undici.ProxyAgent('http://127.0.0.1:7890');
const fetch = (url) => undici.fetch(url, { dispatcher });
const token = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').match(/NEXT_PUBLIC_FINNHUB_API_KEY=(\S+)/)?.[1] || '';

async function getProfile(sym) {
  try { const r = await fetch('https://finnhub.io/api/v1/stock/profile2?symbol=' + sym + '&token=' + token); return await r.json(); } catch { return null; }
}
async function getQuote(sym) {
  try { const r = await fetch('https://finnhub.io/api/v1/quote?symbol=' + sym + '&token=' + token); return await r.json(); } catch { return null; }
}
async function getPeers(sym) {
  try { const r = await fetch('https://finnhub.io/api/v1/stock/peers?symbol=' + sym + '&token=' + token); return await r.json(); } catch { return []; }
}
async function getNews(sym) {
  try {
    const to = new Date();
    const from = new Date(Date.now() - 30 * 86400000);
    const fStr = from.toISOString().slice(0,10);
    const tStr = to.toISOString().slice(0,10);
    const r = await fetch('https://finnhub.io/api/v1/company-news?symbol=' + sym + '&from=' + fStr + '&to=' + tStr + '&token=' + token);
    return await r.json();
  } catch { return []; }
}

async function main() {
  // Focus on top 3 overlooked candidates
  const candidates = [
    { sym: 'CEG', thesis: 'Nuclear power for AI data centers' },
    { sym: 'VICR', thesis: 'High-efficiency power modules for liquid cooling' },
    { sym: 'COHU', thesis: 'Semiconductor test equipment for advanced packaging' },
    { sym: 'AAOI', thesis: 'Optical interconnects for AI clusters' },
  ];

  for (const s of candidates) {
    console.log('\n========== ' + s.sym + ' ==========');
    console.log('THESIS: ' + s.thesis);

    const p2 = await getProfile(s.sym);
    if (p2 && p2.name) {
      console.log('Name: ' + p2.name);
      console.log('Industry: ' + (p2.finnhubIndustry || 'N/A'));
      console.log('Exchange: ' + (p2.exchange || 'N/A'));
      if (p2.marketCapitalization) console.log('MktCap: $' + (p2.marketCapitalization / 1e9).toFixed(1) + 'B');
      if (p2.shareOutstanding) console.log('Shares: ' + (p2.shareOutstanding / 1e9).toFixed(2) + 'B');
      if (p2.ipo) console.log('IPO: ' + p2.ipo);
    }

    const q = await getQuote(s.sym);
    if (q && q.c) {
      const chg = q.dp >= 0 ? '+' : '';
      console.log('Price: $' + q.c + '  Prev: $' + q.pc + '  Chg: ' + chg + q.dp?.toFixed(2) + '%');
      console.log('Today Range: $' + (q.l || '?') + ' ~ $' + (q.h || '?'));
    }

    const peers = await getPeers(s.sym);
    if (peers && peers.length > 0) {
      console.log('Peers: ' + peers.slice(0, 5).join(', '));
    }

    // Get recent news headline
    const news = await getNews(s.sym);
    if (Array.isArray(news) && news.length > 0) {
      const headlines = news.slice(0, 3).map(n => '  - ' + (n.headline || '').slice(0, 100));
      console.log('Recent News:');
      headlines.forEach(h => console.log(h));
    }
  }

  // Portfolio check
  console.log('\n\n========== PORTFOLIO IMPACT ==========');
  console.log('Current cash: $7,328.65');
  console.log('Max for new position at 70% cash = ~$5,100');
  console.log('Or sell existing to raise capital');
}

main().catch(console.error);
