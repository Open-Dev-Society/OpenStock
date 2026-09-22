import { XMLParser } from 'fast-xml-parser';

export type MarketNewsFeed = {
    name: string;
    url: string;
    rank: number;
};

type ParsedArticle = MarketNewsArticle & {
    relevanceScore: number;
};

const MARKET_TIME_ZONE = 'America/Sao_Paulo';
const FUTURE_TOLERANCE_MS = 60 * 60 * 1000;
const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    removeNSPrefix: true,
    trimValues: true,
    processEntities: true,
});

const SIGNAL_GROUPS = [
    {
        category: 'B3',
        weight: 50,
        terms: [
            'b3', 'ibovespa', 'ibov', 'bolsa brasileira', 'bolsa de valores',
            'mercado de acoes', 'acoes brasileiras', 'indice bovespa',
        ],
    },
    {
        category: 'Macro Brasil',
        weight: 45,
        terms: [
            'selic', 'copom', 'banco central', 'bc do brasil', 'ipca', 'igp-m',
            'inflacao', 'pib', 'juros', 'politica monetaria', 'politica fiscal',
            'arcabouco fiscal', 'divida publica', 'cambio', 'dolar', 'real brasileiro',
            'sistema financeiro nacional', 'regulacao cambial', 'balanca comercial',
        ],
    },
    {
        category: 'Commodities',
        weight: 38,
        terms: [
            'petroleo', 'crude oil', 'brent', 'wti', 'opep', 'opec', 'gas natural',
            'minerio de ferro', 'iron ore', 'cobre', 'copper', 'ouro', 'gold',
            'soja', 'soybean', 'cafe', 'coffee', 'acucar', 'sugar', 'commodities',
        ],
    },
    {
        category: 'Mercados globais',
        weight: 30,
        terms: [
            'federal reserve', 'fed ', 'taxa de juros dos eua', 'treasury yield',
            'china economy', 'economia chinesa', 'tarifas', 'trade war',
            'emerging markets', 'mercados emergentes', 'risk-off', 'volatilidade',
        ],
    },
] as const;

const B3_COMPANIES = [
    'petrobras', 'vale', 'itau', 'itau unibanco', 'bradesco', 'banco do brasil',
    'btg pactual', 'ambev', 'weg', 'embraer', 'suzano', 'jbs', 'eletrobras',
    'localiza', 'raia drogasil', 'magazine luiza', 'b3 sa', 'braskem', 'prio',
    'carajas',
];

const CORPORATE_IMPACT_TERMS = [
    'investimento', 'investe', 'aquisicao', 'adquire', 'compra', 'vende', 'divida',
    'credito', 'emissao', 'lucro', 'receita', 'producao', 'exploracao', 'reserva',
    'descoberta', 'preco', 'alta', 'queda', 'acoes', 'dividendo', 'subvencao',
    'contrato', 'acordo', 'reestruturacao', 'recuperacao judicial', 'guidance', 'capex',
];

const TITLE_EXCLUSIONS = [
    'stock price quote', 'company profile', 'real time:', 'futebol', 'celebridade',
    'loteria', 'horoscopo', 'receita culinaria', 'reality show', 'agenda do papa',
];

function asArray<T>(value: T | T[] | undefined): T[] {
    if (value === undefined) return [];
    return Array.isArray(value) ? value : [value];
}

function readText(value: unknown): string {
    if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
    if (!value || typeof value !== 'object') return '';
    const record = value as Record<string, unknown>;
    return readText(record['#text'] ?? record.__cdata ?? record.value);
}

function stripMarkup(value: string): string {
    return value
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
        .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
        .replace(/\s+/g, ' ')
        .trim();
}

function normalize(value: string): string {
    return stripMarkup(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function cleanTitle(value: string, source: string): string {
    const title = stripMarkup(value);
    const suffix = new RegExp(`\\s+-\\s+${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\.com)?$`, 'i');
    return title
        .replace(suffix, '')
        .replace(/\s+-\s+(?:[\w-]+\.)+[a-z]{2,}$/i, '')
        .trim();
}

function readLink(value: unknown): string {
    if (typeof value === 'string') return value.trim();
    for (const candidate of asArray(value as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
        const href = readText(candidate?.href);
        const rel = readText(candidate?.rel);
        if (href && (!rel || rel === 'alternate')) return href;
        const text = readText(candidate);
        if (text) return text;
    }
    return '';
}

function safeHttpUrl(value: string): string {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '';
    } catch {
        return '';
    }
}

function stableNumericId(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function marketDateKey(timestamp: number): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: MARKET_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date(timestamp));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
}

function impactFromScore(score: number): 'Alto' | 'Médio' | 'Baixo' {
    if (score >= 82) return 'Alto';
    if (score >= 68) return 'Médio';
    return 'Baixo';
}

function classify(title: string, summary: string) {
    const normalizedTitle = normalize(title);
    const normalizedText = `${normalizedTitle} ${normalize(summary)}`;
    if (TITLE_EXCLUSIONS.some((term) => normalizedTitle.includes(term))) return null;

    const tickerMatch = /\b[A-Z]{4}\d{1,2}\b/.test(title);
    const matches: Array<{ category: string; weight: number; titleMatch: boolean; textMatch: boolean }> = SIGNAL_GROUPS
        .map((group) => ({
            ...group,
            titleMatch: group.terms.some((term) => normalizedTitle.includes(term)),
            textMatch: group.terms.some((term) => normalizedText.includes(term)),
        }))
        .filter((group) => group.textMatch);

    const companyMatch = B3_COMPANIES.some((company) => normalizedTitle.includes(company));
    const impactMatch = CORPORATE_IMPACT_TERMS.some((term) => normalizedTitle.includes(term));
    if (tickerMatch || (companyMatch && impactMatch)) {
        matches.push({ category: 'Empresas', weight: 42, titleMatch: true, textMatch: true });
    }
    if (matches.length === 0) return null;

    const primary = matches.sort((a, b) => b.weight - a.weight)[0];
    const secondaryBoost = Math.min(8, (matches.length - 1) * 4);
    return {
        category: primary.category,
        score: primary.weight + (primary.titleMatch ? 12 : 4) + secondaryBoost,
    };
}

function publicationTimestamp(value: unknown): number {
    const timestamp = Date.parse(readText(value));
    return Number.isFinite(timestamp) ? timestamp : 0;
}

export function parseMarketNewsFeed(xml: string, feed: MarketNewsFeed, now = Date.now()): ParsedArticle[] {
    const document = parser.parse(xml) as Record<string, unknown>;
    const rssChannel = (document.rss as Record<string, unknown> | undefined)?.channel as Record<string, unknown> | undefined;
    const atomFeed = document.feed as Record<string, unknown> | undefined;
    const entries = rssChannel ? asArray(rssChannel.item) : asArray(atomFeed?.entry);

    return entries.flatMap((rawEntry) => {
        if (!rawEntry || typeof rawEntry !== 'object') return [];
        const entry = rawEntry as Record<string, unknown>;
        const title = cleanTitle(readText(entry.title), feed.name);
        const url = safeHttpUrl(readLink(entry.link));
        const publishedAt = publicationTimestamp(entry.pubDate ?? entry.published ?? entry.updated ?? entry.date);
        if (!title || !url || !publishedAt) return [];
        if (publishedAt > now + FUTURE_TOLERANCE_MS) return [];
        if (marketDateKey(publishedAt) !== marketDateKey(now)) return [];

        const rawSummary = stripMarkup(readText(entry.description ?? entry.summary ?? entry.encoded ?? entry.content));
        const summary = normalize(rawSummary).includes(normalize(title)) ? '' : rawSummary.slice(0, 280);
        const classification = classify(title, summary);
        if (!classification) return [];

        const ageHours = Math.max(0, (now - publishedAt) / 3_600_000);
        const recencyScore = ageHours <= 6 ? 15 : ageHours <= 12 ? 10 : 6;
        const relevanceScore = classification.score + feed.rank * 4 + recencyScore;
        return [{
            id: stableNumericId(`${url}|${title}`),
            headline: title,
            summary,
            source: feed.name,
            url,
            datetime: Math.floor(publishedAt / 1000),
            category: classification.category,
            related: classification.category,
            impact: impactFromScore(relevanceScore),
            relevanceScore,
        }];
    });
}

export function selectRelevantMarketNews(articles: ParsedArticle[], limit = 30): MarketNewsArticle[] {
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();
    const sourceCounts = new Map<string, number>();
    const selected: ParsedArticle[] = [];

    const ranked = [...articles].sort((a, b) =>
        b.datetime - a.datetime || b.relevanceScore - a.relevanceScore
    );

    for (const article of ranked) {
        const titleKey = normalize(article.headline).replace(/[^a-z0-9]+/g, ' ').trim();
        if (seenUrls.has(article.url) || seenTitles.has(titleKey)) continue;
        if ((sourceCounts.get(article.source) || 0) >= 8) continue;

        seenUrls.add(article.url);
        seenTitles.add(titleKey);
        sourceCounts.set(article.source, (sourceCounts.get(article.source) || 0) + 1);
        selected.push(article);
        if (selected.length === limit) break;
    }

    return selected.map((article) => ({
        id: article.id,
        headline: article.headline,
        summary: article.summary,
        source: article.source,
        url: article.url,
        datetime: article.datetime,
        category: article.category,
        related: article.related,
        impact: article.impact ?? impactFromScore(article.relevanceScore),
    }));
}
