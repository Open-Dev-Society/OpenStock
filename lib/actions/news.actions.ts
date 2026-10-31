'use server';

import {
    EDITIONS,
    MAX_FEED_BYTES,
    buildNewsQuery,
    mergeNews,
    parseGoogleNewsRss,
    type RssNewsItem,
} from '@/lib/news-rss';
import { saudiSymbolName, saudiSymbolNameAr } from '@/lib/saudi-symbols';
import { hasFinnhubQuotes } from '@/lib/markets';
import { getNews } from '@/lib/actions/finnhub.actions';
import type { Lang } from '@/lib/i18n';

// Market news, in the language the reader is using.
//
// Finnhub covers the US and nothing else, so a watchlist of Tadawul tickers used to come back
// empty. The Saudi side now comes from Google News' per-query RSS: searched by the company's
// trading name in the feed's language, cached fifteen minutes, merged newest-first.
//
// One rule decides what a reader sees:
//   Arabic  → the Arabic press for every symbol, and Finnhub only when that feed is empty.
//   English → Finnhub for the markets it knows, the English feed for the Saudi symbols it does not.
//
// All the shaping (query, dedupe, freshness, ordering, URL checks) lives in lib/news-rss.ts and is
// unit-tested; this file is only the network and the cache.

const SEARCH = 'https://news.google.com/rss/search';
// Fifteen minutes: the exchange is closed most of the day, and the feed is shared by every reader.
const REVALIDATE_SECONDS = 900;
// A hung feed must not hold a server render open.
const FEED_TIMEOUT_MS = 6000;
// One request per symbol costs a round trip each; a long watchlist does not deserve the whole quota.
const MAX_SYMBOLS = 6;
// Per symbol we keep only the freshest few; mergeNews trims the combined list again.
const PER_SYMBOL = 4;
const USER_AGENT = 'Mozilla/5.0 (compatible; OpenStock/1.0; +https://github.com/Open-Dev-Society/OpenStock)';

async function fetchFeed(query: string, related: string, limit: number, lang: Lang): Promise<RssNewsItem[]> {
    const edition = EDITIONS[lang];
    const url = `${SEARCH}?q=${encodeURIComponent(query)}&hl=${edition.hl}&gl=${edition.gl}&ceid=${edition.ceid}`;
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/xml' },
            next: { revalidate: REVALIDATE_SECONDS },
            signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
        });
        if (!response.ok) return [];

        const declared = Number(response.headers.get('content-length') ?? 0);
        if (declared > MAX_FEED_BYTES) return [];

        const body = await response.text();
        if (body.length > MAX_FEED_BYTES) return [];

        return parseGoogleNewsRss(body, related).slice(0, limit);
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

const newsSymbols = (symbols: string[]): string[] => [
    ...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)),
];

/** One feed per symbol, in the requested language. */
async function feedNews(symbols: string[], max: number, lang: Lang): Promise<MarketNewsArticle[]> {
    const wanted = newsSymbols(symbols).slice(0, MAX_SYMBOLS);
    if (wanted.length === 0) return [];

    const feeds = await Promise.all(
        wanted.map((symbol) => {
            const name = lang === 'ar' ? saudiSymbolNameAr(symbol) : saudiSymbolName(symbol);
            const query = buildNewsQuery({ ticker: symbol, name, lang });
            return query ? fetchFeed(query, symbol, PER_SYMBOL, lang) : Promise.resolve([] as RssNewsItem[]);
        })
    );

    return mergeNews(feeds.flat(), max).map(toArticle);
}

/** Finnhub's wire, for the symbols it actually covers. */
async function wireNews(symbols: string[], max: number): Promise<MarketNewsArticle[]> {
    const known = newsSymbols(symbols).filter(hasFinnhubQuotes);
    if (known.length === 0) return [];
    const articles = await getNews(known).catch(() => [] as MarketNewsArticle[]);
    return articles.slice(0, max);
}

/** Arabic stories about the Saudi market itself, for the dashboard. */
export async function getSaudiMarketNews(max = 6, lang: Lang = 'ar'): Promise<MarketNewsArticle[]> {
    const query = lang === 'ar' ? 'السوق السعودي تداول' : '"Tadawul" Saudi stock market';
    const items = await fetchFeed(query, 'TASI', max * 2, lang);
    return mergeNews(items, max).map(toArticle);
}

/** The watchlist panel and the single stock page: same rules, different list length. */
export async function getWatchlistNews(symbols: string[], max = 8, lang: Lang = 'en'): Promise<MarketNewsArticle[]> {
    // Arabic readers get the Arabic press; the English wire is a fallback, not a mixed list.
    if (lang === 'ar') {
        const feed = await feedNews(symbols, max, lang);
        return feed.length > 0 ? feed : wireNews(symbols, max);
    }

    // In English the feed only holds the Saudi symbols (nothing else has a name to search for),
    // so Finnhub supplies the rest of the markets and the two lists are merged by recency.
    const [feed, wire] = await Promise.all([feedNews(symbols, max, lang), wireNews(symbols, max)]);
    return [...feed, ...wire].sort((a, b) => b.datetime - a.datetime).slice(0, max);
}

/** One stock page. */
export async function getCompanyNews(symbol: string, max = 6, lang: Lang = 'en'): Promise<MarketNewsArticle[]> {
    return getWatchlistNews([symbol], max, lang);
}
