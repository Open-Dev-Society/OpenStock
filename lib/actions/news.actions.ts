'use server';

import { parseGoogleNewsRss, type RssNewsItem } from '@/lib/news-rss';
import { saudiSymbolNameAr } from '@/lib/saudi-symbols';
import { isTadawulSymbol } from '@/lib/yahoo';
import { getNews } from '@/lib/actions/finnhub.actions';

// Arabic market news for the Saudi symbols, from Google News' per-query RSS.
//
// Finnhub answers for the US market only, so a watchlist of Tadawul tickers came back empty. This
// module keeps that half of the job: the US/global symbols still go to Finnhub, the Saudi ones are
// searched in Arabic by their trading name. Both sources are cached and merged newest-first.

const SEARCH = 'https://news.google.com/rss/search';
// Fifteen minutes: the exchange is closed most of the day, and the feed is shared by every reader.
const REVALIDATE_SECONDS = 900;
const USER_AGENT = 'Mozilla/5.0 (compatible; OpenStock/1.0; +https://github.com/Open-Dev-Society/OpenStock)';

async function fetchFeed(query: string, related: string, limit: number): Promise<RssNewsItem[]> {
    const url = `${SEARCH}?q=${encodeURIComponent(query)}&hl=ar&gl=SA&ceid=SA:ar`;
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/xml' },
            next: { revalidate: REVALIDATE_SECONDS },
        });
        if (!response.ok) return [];
        return parseGoogleNewsRss(await response.text(), related).slice(0, limit);
    } catch (error) {
        // News is decoration: a feed that is down must not take the page with it.
        console.error('Google News feed failed:', query, error);
        return [];
    }
}

const toArticle = (item: RssNewsItem): MarketNewsArticle => ({
    id: item.id,
    headline: item.headline,
    summary: '',
    source: item.source,
    url: item.url,
    datetime: item.datetime,
    category: 'company',
    related: item.related,
});

// The same story arrives from several outlets under near-identical titles.
const dedupe = (items: RssNewsItem[]): RssNewsItem[] => {
    const seen = new Set<string>();
    return items.filter((item) => {
        const key = item.headline.replace(/\s+/g, ' ').trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const newestFirst = (items: RssNewsItem[]) =>
    dedupe(items)
        .sort((a, b) => b.datetime - a.datetime)
        .filter((item) => {
            if (!item.datetime) return true;
            const days = (Date.now() / 1000 - item.datetime) / 86_400;
            return days <= 14;
        });

/** Arabic stories for the Saudi symbols in a list, newest first. */
export async function getSaudiCompanyNews(symbols: string[], max = 8): Promise<MarketNewsArticle[]> {
    const saudi = symbols.map((symbol) => symbol.trim().toUpperCase()).filter(isTadawulSymbol);
    if (saudi.length === 0) return [];

    const feeds = await Promise.all(
        saudi.map((symbol) => {
            // The trading name is what the Arabic press writes; "سهم" keeps a generic name like
            // "علم" (Elm) from matching every article that mentions a flag. The ticker is the fallback.
            const name = saudiSymbolNameAr(symbol);
            return fetchFeed(name ? `"${name}" سهم` : symbol, symbol, 4);
        })
    );

    return newestFirst(feeds.flat()).slice(0, max).map(toArticle);
}

/** Arabic stories about the Saudi market itself, for the dashboard. */
export async function getSaudiMarketNews(max = 6): Promise<MarketNewsArticle[]> {
    const items = await fetchFeed('السوق السعودي تداول', 'TASI', max * 2);
    return newestFirst(items).slice(0, max).map(toArticle);
}

/** The watchlist panel: Arabic for the Saudi rows, Finnhub for everything else. */
export async function getWatchlistNews(symbols: string[], max = 8): Promise<MarketNewsArticle[]> {
    const saudi = symbols.filter(isTadawulSymbol);
    const elsewhere = symbols.filter((symbol) => !isTadawulSymbol(symbol));

    const [local, remote] = await Promise.all([
        getSaudiCompanyNews(saudi, max),
        elsewhere.length > 0 ? getNews(elsewhere).catch(() => [] as MarketNewsArticle[]) : Promise.resolve([]),
    ]);

    return [...local, ...remote].sort((a, b) => b.datetime - a.datetime).slice(0, max);
}

/** One stock page: Arabic for a Tadawul ticker, Finnhub for anything else. */
export async function getCompanyNews(symbol: string, max = 6): Promise<MarketNewsArticle[]> {
    const clean = symbol.trim().toUpperCase();
    if (isTadawulSymbol(clean)) return getSaudiCompanyNews([clean], max);
    return getNews([clean]).catch(() => []);
}
