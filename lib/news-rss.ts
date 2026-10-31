// Google News RSS, read on the server.
//
// Finnhub's news covers the US market only, so Saudi symbols had no stories at all. Google News
// publishes a feed per query and per language (hl/gl/ceid), which is the one source that answers
// with Arabic headlines for Tadawul companies without an API key.
//
// Everything here is pure: the actions module only adds the network call and the cache. The feed is
// untrusted input, so URLs are checked before they reach an <a href> and every field is bounded.

import type { Lang } from '@/lib/i18n';

export type RssNewsItem = {
    id: number;
    headline: string;
    source: string;
    url: string;
    /** Epoch seconds, the unit MarketNewsArticle uses. */
    datetime: number;
    related: string;
};

/** Google News editions. The language decides both the headlines and the words we search with. */
export const EDITIONS: Record<Lang, { hl: string; gl: string; ceid: string }> = {
    ar: { hl: 'ar', gl: 'SA', ceid: 'SA:ar' },
    en: { hl: 'en', gl: 'US', ceid: 'US:en' },
};

const ENTITIES: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
};

/** Headlines are display text; a broken feed must not be able to ship a novel. */
const MAX_HEADLINE = 300;
/** A feed that suddenly returns megabytes is not a feed we want to parse. */
export const MAX_FEED_BYTES = 512 * 1024;
/** Stories older than this are noise on a "what moved today" page. */
export const MAX_ITEM_AGE_DAYS = 14;

export const decodeEntities = (value: string): string =>
    value
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
        .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
        .replace(/&[a-z#0-9]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? entity)
        .trim();

const tag = (block: string, name: string): string => {
    const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
    return match ? decodeEntities(match[1]) : '';
};

/**
 * A feed URL ends up in an <a href>, so only real web links are allowed through. Google always
 * wraps its links, but the XML is third-party input: a `javascript:` value would be a real bug.
 */
export const safeUrl = (url: string): string => {
    const trimmed = url.trim();
    if (trimmed.length > 2048) return '';
    try {
        const parsed = new URL(trimmed);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : '';
    } catch {
        return '';
    }
};

/**
 * Google sends the outlet's whole channel title ("ارقام : اخبار ومعلومات سوق الأسهم - تاسي"); the
 * reader only needs the outlet. Only a spaced colon separates name from description — splitting on
 * a hyphen too would turn "CNN - Arabic" into "CNN".
 */
export const cleanSource = (source: string): string =>
    source.split(/\s+:\s+/)[0].trim() || source;

/** Google appends " - <source>" to every headline; it repeats the line underneath. */
export function stripSourceSuffix(headline: string, source: string): string {
    if (!source) return headline;
    const suffix = ` - ${source}`;
    return headline.endsWith(suffix) ? headline.slice(0, -suffix.length).trim() : headline;
}

// Stable across parses (the items are React keys), unique within one feed.
const idFromUrl = (url: string): number => {
    let hash = 0;
    for (let i = 0; i < url.length; i += 1) {
        hash = (hash * 31 + url.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
};

export function parseGoogleNewsRss(xml: string, related = 'MKT'): RssNewsItem[] {
    if (!xml || !/<item[\s>]/.test(xml)) return [];

    const items: RssNewsItem[] = [];
    for (const match of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/g)) {
        const block = match[0];
        const url = safeUrl(tag(block, 'link'));
        if (!url) continue;

        const rawSource = tag(block, 'source');
        const source = cleanSource(rawSource);
        const headline = stripSourceSuffix(tag(block, 'title'), rawSource).slice(0, MAX_HEADLINE);
        // Google sometimes hands back the outlet's own channel card ("ارقام : ... - تاسي - ارقام : ..."),
        // which is a feed entry, not a story.
        if (!headline || headline === rawSource.trim() || headline === source) continue;

        const published = Date.parse(tag(block, 'pubDate'));
        items.push({
            id: idFromUrl(url),
            headline,
            source: source || 'Google News',
            url,
            datetime: Number.isNaN(published) ? 0 : Math.floor(published / 1000),
            related,
        });
    }

    return items;
}

/**
 * The phrase the press actually writes. Arabic pairs the trading name with "سهم" — without the word
 * a short name like "علم" (Elm) matches every article that mentions a flag — and falls back to the
 * ticker when the company has no Arabic name. English quotes the listed name; a bare ticker would
 * match noise, so it is skipped and the caller keeps its other sources.
 *
 * Symbols that are not plain tickers (crypto pairs arrive as "BINANCE:BTCUSDT") are skipped too:
 * Finnhub covers those markets.
 */
export function buildNewsQuery({ ticker, name, lang }: { ticker: string; name?: string | null; lang: Lang }): string | null {
    const clean = ticker.trim().toUpperCase();
    if (!clean || clean.includes(':')) return null;

    const label = name?.trim();
    if (lang === 'ar') return label ? `"${label}" سهم` : `${clean} سهم`;
    return label ? `"${label}" stock` : null;
}

const isFresh = (item: RssNewsItem, now: number, days = MAX_ITEM_AGE_DAYS): boolean =>
    !item.datetime || (now - item.datetime) / 86_400 <= days;

const dedupe = (items: RssNewsItem[]): RssNewsItem[] => {
    const seen = new Set<string>();
    return items.filter((item) => {
        // The same story arrives from several outlets under near-identical titles.
        const key = item.headline.replace(/\s+/g, ' ').trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

/** Dedupe, drop stale stories, sort newest first and keep at most `max`. */
export function mergeNews(items: RssNewsItem[], max: number, now = Date.now()): RssNewsItem[] {
    const nowSeconds = Math.floor(now / 1000);
    return dedupe(items.filter((item) => isFresh(item, nowSeconds)))
        .sort((a, b) => b.datetime - a.datetime)
        .slice(0, max);
}
