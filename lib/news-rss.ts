// Google News RSS, read on the server.
//
// Finnhub's news covers the US market only, so Saudi symbols had no stories at all. Google News
// publishes an Arabic feed per query (hl=ar&gl=SA), which is the one source that answers with
// Arabic headlines for Tadawul companies without an API key.
//
// The parser is pure and tested: the feed is XML with entities, the headline repeats the source
// name, and the links are Google wrappers (they open the publisher in a browser).

export type RssNewsItem = {
    id: number;
    headline: string;
    source: string;
    url: string;
    /** Epoch seconds, the unit MarketNewsArticle uses. */
    datetime: number;
    related: string;
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

export const decodeEntities = (value: string): string =>
    value
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
        .replace(/&[a-z#0-9]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? entity)
        .trim();

const tag = (block: string, name: string): string => {
    const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
    return match ? decodeEntities(match[1]) : '';
};

// Google sends the outlet's whole channel title ("ارقام : اخبار ومعلومات سوق الأسهم - تاسي");
// the reader only needs the outlet.
export const cleanSource = (source: string): string =>
    source.split(/\s+[:\-–]\s+/)[0].trim() || source;

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
    if (!xml || !xml.includes('<item>')) return [];

    const items: RssNewsItem[] = [];
    for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
        const block = match[1];
        const url = tag(block, 'link');
        const rawSource = tag(block, 'source');
        const source = cleanSource(rawSource);
        const headline = stripSourceSuffix(tag(block, 'title'), rawSource);
        if (!url || !headline) continue;

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
