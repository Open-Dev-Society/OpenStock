import { describe, expect, it } from 'vitest';
import {
    parseMarketNewsFeed,
    selectRelevantMarketNews,
    type MarketNewsFeed,
} from '@/lib/market-news';

const NOW = Date.parse('2026-09-21T16:00:00Z');
const BLOOMBERG: MarketNewsFeed = { name: 'Bloomberg', url: 'https://example.com/feed', rank: 4 };
const BCB: MarketNewsFeed = { name: 'Banco Central', url: 'https://example.com/atom', rank: 4 };

describe('market news RSS integration', () => {
    it('keeps only market-relevant headlines from the current São Paulo calendar day', () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
            <rss version="2.0"><channel>
                <item>
                    <title>BC deve cortar a Selic em 0,25pp &#8211; decisão de hoje - Bloomberg.com</title>
                    <link>https://news.google.com/articles/selic</link>
                    <pubDate>Mon, 21 Sep 2026 15:00:00 GMT</pubDate>
                    <description>&lt;p&gt;Decisão afeta juros e ativos brasileiros.&lt;/p&gt;</description>
                </item>
                <item>
                    <title>PETR4: Petrobras Stock Price Quote - Bloomberg.com</title>
                    <link>https://www.bloomberg.com/quote/PETR4:BZ</link>
                    <pubDate>Mon, 21 Sep 2026 14:00:00 GMT</pubDate>
                </item>
                <item>
                    <title>Ibovespa fecha em alta no pregão anterior - Bloomberg.com</title>
                    <link>https://example.com/previous-day</link>
                    <pubDate>Mon, 21 Sep 2026 01:00:00 GMT</pubDate>
                </item>
                <item>
                    <title>Ibovespa fecha em alta - Bloomberg.com</title>
                    <link>https://example.com/stale</link>
                    <pubDate>Mon, 14 Sep 2026 14:00:00 GMT</pubDate>
                </item>
            </channel></rss>`;

        const articles = parseMarketNewsFeed(xml, BLOOMBERG, NOW);

        expect(articles).toHaveLength(1);
        expect(articles[0]).toMatchObject({
            headline: 'BC deve cortar a Selic em 0,25pp – decisão de hoje',
            source: 'Bloomberg',
            related: 'Macro Brasil',
            url: 'https://news.google.com/articles/selic',
            impact: 'Alto',
        });
    });

    it('parses Atom feeds and preserves official-source provenance', () => {
        const xml = `<?xml version="1.0" encoding="utf-8"?>
            <feed xmlns="http://www.w3.org/2005/Atom">
                <entry>
                    <title>BC amplia acesso a contas em moeda estrangeira e moderniza a regulação cambial</title>
                    <link rel="alternate" href="https://www.bcb.gov.br/detalhenoticia/contas" />
                    <updated>2026-09-21T13:30:00Z</updated>
                    <summary>Nova regra do sistema financeiro nacional.</summary>
                </entry>
            </feed>`;

        const articles = parseMarketNewsFeed(xml, BCB, NOW);

        expect(articles).toHaveLength(1);
        expect(articles[0].source).toBe('Banco Central');
        expect(articles[0].related).toBe('Macro Brasil');
    });

    it('deduplicates headlines and limits concentration by publisher', () => {
        const item = (index: number, source = 'InfoMoney') => ({
            id: index,
            headline: index < 2 ? 'Ibovespa sobe com Petrobras' : `Ibovespa sobe com Petrobras ${index}`,
            summary: '',
            source,
            url: `https://example.com/${index}`,
            datetime: 1_779_119_000 - index,
            category: 'B3',
            related: 'B3',
            relevanceScore: 100 - index,
        });

        const selected = selectRelevantMarketNews([
            ...Array.from({ length: 10 }, (_, index) => item(index)),
            item(20, 'Reuters'),
        ], 12);

        expect(selected.filter((article) => article.source === 'InfoMoney')).toHaveLength(8);
        expect(selected.some((article) => article.source === 'Reuters')).toBe(true);
        expect(selected.filter((article) => article.headline === 'Ibovespa sobe com Petrobras')).toHaveLength(1);
        expect(selected[0].id).toBe(0);
    });
});
