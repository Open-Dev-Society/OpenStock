'use server';

import {
    parseMarketNewsFeed,
    selectRelevantMarketNews,
    type MarketNewsFeed,
} from '@/lib/market-news';

// Feed curation follows the public RSS approach used by WorldMonitor's finance variant:
// https://github.com/koala73/worldmonitor (AGPL-3.0).
const USER_AGENT = 'OpenStock/0.1 (+https://github.com/Open-Dev-Society/OpenStock)';
const MAX_FEED_BYTES = 1_500_000;

function googleNewsUrl(query: string) {
    const url = new URL('https://news.google.com/rss/search');
    url.searchParams.set('q', query);
    url.searchParams.set('hl', 'pt-BR');
    url.searchParams.set('gl', 'BR');
    url.searchParams.set('ceid', 'BR:pt-419');
    return url.toString();
}

const MARKET_FEEDS: MarketNewsFeed[] = [
    {
        name: 'Bloomberg',
        url: googleNewsUrl('site:bloomberg.com (Brazil OR Brasil OR Petrobras OR Vale OR Ibovespa OR Selic OR "Brazilian real") when:1d'),
        rank: 4,
    },
    {
        name: 'Reuters',
        url: googleNewsUrl('site:reuters.com (Brazil OR Brasil OR Petrobras OR Vale OR Ibovespa OR Selic) (markets OR stocks OR economy OR oil OR mining) when:1d'),
        rank: 4,
    },
    {
        name: 'Valor Econômico',
        url: googleNewsUrl('site:valor.globo.com (B3 OR Ibovespa OR Selic OR Petrobras OR Vale OR mercado OR economia) when:1d'),
        rank: 3,
    },
    {
        name: 'InfoMoney',
        url: 'https://www.infomoney.com.br/feed/',
        rank: 3,
    },
    {
        name: 'Banco Central',
        url: 'https://www.bcb.gov.br/api/feed/sitebcb/sitefeeds/noticias',
        rank: 4,
    },
    {
        name: 'Agência Brasil',
        url: 'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml',
        rank: 2,
    },
];

async function fetchFeed(feed: MarketNewsFeed) {
    const response = await fetch(feed.url, {
        headers: {
            Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.7',
            'User-Agent': USER_AGENT,
        },
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get('content-type')?.toLowerCase() || '';
    if (!contentType.includes('xml') && !contentType.includes('rss') && !contentType.includes('atom')) {
        throw new Error(`unexpected content type: ${contentType || 'missing'}`);
    }

    const xml = await response.text();
    if (Buffer.byteLength(xml, 'utf8') > MAX_FEED_BYTES) throw new Error('feed exceeds size limit');
    return parseMarketNewsFeed(xml, feed);
}

export async function getRelevantMarketNews(): Promise<MarketNewsArticle[]> {
    const results = await Promise.allSettled(MARKET_FEEDS.map(fetchFeed));
    const articles: ReturnType<typeof parseMarketNewsFeed> = [];

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            articles.push(...result.value);
            return;
        }
        console.warn(`[market-news] ${MARKET_FEEDS[index].name} unavailable:`, result.reason);
    });

    return selectRelevantMarketNews(articles, 30);
}
