import { describe, expect, it } from 'vitest';
import { cleanSource, parseGoogleNewsRss, stripSourceSuffix } from '@/lib/news-rss';

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

describe('cleanSource', () => {
    it('keeps the outlet and drops its channel title', () => {
        expect(cleanSource('ارقام : اخبار ومعلومات سوق الأسهم السعودي - تاسي')).toBe('ارقام');
        expect(cleanSource('الجزيرة نت')).toBe('الجزيرة نت');
        expect(cleanSource('FxNewsToday.ae')).toBe('FxNewsToday.ae');
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

    it('returns nothing for an empty or broken feed instead of throwing', () => {
        expect(parseGoogleNewsRss('')).toEqual([]);
        expect(parseGoogleNewsRss('<html>not a feed</html>')).toEqual([]);
    });
});
