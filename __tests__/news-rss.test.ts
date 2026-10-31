import { describe, expect, it } from 'vitest';
import {
    buildNewsQuery,
    cleanSource,
    decodeEntities,
    mergeNews,
    parseGoogleNewsRss,
    safeUrl,
    stripSourceSuffix,
    type RssNewsItem,
} from '@/lib/news-rss';

// A trimmed copy of what Google News returns for "أرامكو": the title repeats the source, the
// link is a Google wrapper, and the entities are the ones the feed actually sends.
const FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>"أرامكو" - أخبار Google</title>
<item>
  <title>أرامكو السعودية تحدد سعر البيع الرسمي للخام - ارقام</title>
  <link>https://news.google.com/rss/articles/CBMiAAA?oc=5</link>
  <pubDate>Sat, 31 Oct 2026 15:28:25 GMT</pubDate>
  <source url="https://www.argaam.com">ارقام</source>
</item>
<item>
  <title>أرامكو تقترب من اتفاق لاقتراض 10 مليارات دولار &amp; تهديدات للصادرات - الجزيرة نت</title>
  <link>https://news.google.com/rss/articles/CBMiBBB?oc=5</link>
  <pubDate>Mon, 26 Oct 2026 19:30:12 GMT</pubDate>
  <source url="https://www.aljazeera.net">الجزيرة نت</source>
</item>
</channel></rss>`;

describe('decodeEntities', () => {
    it('decodes named, decimal and hexadecimal entities', () => {
        expect(decodeEntities('a &amp; b')).toBe('a & b');
        expect(decodeEntities('&#39;quoted&#39;')).toBe("'quoted'");
        expect(decodeEntities('it&#x2019;s')).toBe('it’s');
        expect(decodeEntities('<![CDATA[raw & text]]>')).toBe('raw & text');
    });

    it('leaves an unknown entity alone instead of dropping the text', () => {
        expect(decodeEntities('100&fake;')).toBe('100&fake;');
    });
});

describe('safeUrl', () => {
    it('keeps web links', () => {
        expect(safeUrl('https://news.google.com/rss/articles/x')).toBe('https://news.google.com/rss/articles/x');
        expect(safeUrl('http://example.com/a')).toBe('http://example.com/a');
    });

    it('rejects anything that is not a web link', () => {
        expect(safeUrl('javascript:alert(1)')).toBe('');
        expect(safeUrl('data:text/html,<script>')).toBe('');
        expect(safeUrl('/relative')).toBe('');
        expect(safeUrl('')).toBe('');
    });
});

describe('cleanSource', () => {
    it('keeps the outlet and drops its channel title', () => {
        expect(cleanSource('ارقام : اخبار ومعلومات سوق الأسهم السعودي - تاسي')).toBe('ارقام');
        expect(cleanSource('الجزيرة نت')).toBe('الجزيرة نت');
        expect(cleanSource('FxNewsToday.ae')).toBe('FxNewsToday.ae');
    });

    it('does not treat a hyphen as the start of a description', () => {
        expect(cleanSource('CNN - Arabic')).toBe('CNN - Arabic');
    });
});

describe('stripSourceSuffix', () => {
    it('removes the source Google appends to a headline', () => {
        expect(stripSourceSuffix('خبر ما - ارقام', 'ارقام')).toBe('خبر ما');
        expect(stripSourceSuffix('خبر ما', 'ارقام')).toBe('خبر ما');
    });

    it('only strips a suffix that really is the source', () => {
        expect(stripSourceSuffix('نتائج - 2026 - ارقام', 'ارقام')).toBe('نتائج - 2026');
        expect(stripSourceSuffix('قطاع النفط - أرامكو', 'ارقام')).toBe('قطاع النفط - أرامكو');
    });
});

describe('buildNewsQuery', () => {
    it('quotes the Arabic trading name and asks for the share', () => {
        expect(buildNewsQuery({ ticker: '7203.SR', name: 'علم', lang: 'ar' })).toBe('"علم" سهم');
        expect(buildNewsQuery({ ticker: '7203.SR', name: '  أرامكو السعودية  ', lang: 'ar' })).toBe('"أرامكو السعودية" سهم');
    });

    it('falls back to the ticker in Arabic, so a foreign stock still gets Arabic coverage', () => {
        expect(buildNewsQuery({ ticker: 'aapl', lang: 'ar' })).toBe('AAPL سهم');
    });

    it('quotes the listed name in English', () => {
        expect(buildNewsQuery({ ticker: '2222.SR', name: 'Saudi Aramco', lang: 'en' })).toBe('"Saudi Aramco" stock');
    });

    it('skips a query it cannot aim: no name in English, or a non-ticker symbol', () => {
        expect(buildNewsQuery({ ticker: 'AAPL', lang: 'en' })).toBeNull();
        expect(buildNewsQuery({ ticker: 'BINANCE:BTCUSDT', name: 'Bitcoin', lang: 'ar' })).toBeNull();
        expect(buildNewsQuery({ ticker: '  ', name: 'x', lang: 'ar' })).toBeNull();
    });
});

describe('parseGoogleNewsRss', () => {
    it('reads the items, decodes entities and drops the source suffix', () => {
        const items = parseGoogleNewsRss(FIXTURE, '2222.SR');

        expect(items).toHaveLength(2);
        expect(items[0]).toMatchObject({
            headline: 'أرامكو السعودية تحدد سعر البيع الرسمي للخام',
            source: 'ارقام',
            related: '2222.SR',
            url: 'https://news.google.com/rss/articles/CBMiAAA?oc=5',
        });
        expect(items[1].headline).toContain('&');
        expect(items[1].headline).not.toContain('الجزيرة نت');
    });

    it('turns pubDate into epoch seconds', () => {
        const [first] = parseGoogleNewsRss(FIXTURE);
        expect(first.datetime).toBe(Math.floor(Date.parse('Sat, 31 Oct 2026 15:28:25 GMT') / 1000));
    });

    it('gives every item a stable numeric id', () => {
        const items = parseGoogleNewsRss(FIXTURE);
        expect(items.every((item) => Number.isInteger(item.id))).toBe(true);
        expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
        // Parsing the same feed twice must keep the same ids: they are the React keys.
        expect(parseGoogleNewsRss(FIXTURE).map((item) => item.id)).toEqual(items.map((item) => item.id));
    });

    it('drops an item whose link is not a web URL', () => {
        const hostile = `<rss><channel><item>
            <title>اقرأ المزيد - موقع</title>
            <link>javascript:alert(1)</link>
            <source url="https://evil.example">موقع</source>
        </item></channel></rss>`;
        expect(parseGoogleNewsRss(hostile)).toEqual([]);
    });

    it('accepts an item tag with attributes', () => {
        const withAttrs = `<rss><channel><item rdf:about="x">
            <title>خبر - ارقام</title>
            <link>https://example.com/a</link>
            <source url="https://www.argaam.com">ارقام</source>
        </item></channel></rss>`;
        expect(parseGoogleNewsRss(withAttrs)).toHaveLength(1);
    });

    it('drops the outlet channel card Google returns as a story', () => {
        const source = 'ارقام : اخبار ومعلومات سوق الأسهم السعودي - تاسي';
        const channelCard = `<rss><item>
            <title>${source} - ${source}</title>
            <link>https://example.com/card</link>
            <source url="https://www.argaam.com">${source}</source>
        </item></rss>`;
        expect(parseGoogleNewsRss(channelCard)).toEqual([]);
    });

    it('caps an absurdly long headline', () => {
        const long = 'خ'.repeat(900);
        const feed = `<rss><item><title>${long}</title><link>https://example.com/a</link></item></rss>`;
        expect(parseGoogleNewsRss(feed)[0].headline).toHaveLength(300);
    });

    it('returns nothing for an empty or broken feed instead of throwing', () => {
        expect(parseGoogleNewsRss('')).toEqual([]);
        expect(parseGoogleNewsRss('<html>not a feed</html>')).toEqual([]);
    });
});

describe('mergeNews', () => {
    const at = (daysAgo: number, headline: string): RssNewsItem => ({
        id: daysAgo,
        headline,
        source: 'ارقام',
        url: `https://example.com/${headline}`,
        datetime: Math.floor(Date.now() / 1000) - daysAgo * 86_400,
        related: '2222.SR',
    });

    it('orders newest first, drops duplicates and keeps the cap', () => {
        const merged = mergeNews([at(3, 'قديم'), at(1, 'أحدث'), at(3, 'قديم'), at(2, 'وسط')], 2);
        expect(merged.map((i) => i.headline)).toEqual(['أحدث', 'وسط']);
    });

    it('ignores stories older than two weeks', () => {
        const merged = mergeNews([at(20, 'قديم جداً'), at(2, 'جديد')], 8);
        expect(merged.map((i) => i.headline)).toEqual(['جديد']);
    });

    it('keeps an item with no date instead of guessing', () => {
        const undated = { ...at(1, 'بلا تاريخ'), datetime: 0 };
        expect(mergeNews([undated], 8)).toHaveLength(1);
    });
});
