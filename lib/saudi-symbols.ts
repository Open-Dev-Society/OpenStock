// Arabic search for Tadawul companies.
//
// Finnhub's symbol search is Latin-only: it has no index of Arabic names, so a reader who types
// "أرامكو" gets nothing and has to know the ticker. This table closes that gap for the Saudi
// market. It is static on purpose — no API quota, no network, and it works when Finnhub is down.
//
// Symbols were checked against Finnhub's own search (each one returns a `*.SR` common stock), and
// the English names are the descriptions that search reports, so the palette reads the same
// whether a result came from here or from Finnhub.

export type SaudiSymbol = {
    /** Ticker exactly as the quote feed expects it. */
    symbol: string;
    /** English name, as Finnhub reports it. */
    name: string;
    /** Arabic names a reader might type, including common short forms. */
    aliases: string[];
};

export const SAUDI_SYMBOLS: readonly SaudiSymbol[] = [
    { symbol: '2222.SR', name: 'SAUDI ARABIAN OIL CO', aliases: ['أرامكو', 'أرامكو السعودية', 'ارامكو', 'ارامكو السعودية'] },
    { symbol: '1120.SR', name: 'AL RAJHI BANK', aliases: ['الراجحي', 'مصرف الراجحي', 'بنك الراجحي'] },
    { symbol: '1180.SR', name: 'THE SAUDI NATIONAL BANK', aliases: ['الأهلي', 'البنك الأهلي', 'الأهلي السعودي'] },
    { symbol: '2010.SR', name: 'SAUDI BASIC INDUSTRIES CORP', aliases: ['سابك', 'الشركة السعودية للصناعات الأساسية'] },
    { symbol: '7010.SR', name: 'SAUDI TELECOM CO', aliases: ['الاتصالات السعودية', 'اس تي سي', 'stc'] },
    { symbol: '2280.SR', name: 'ALMARAI CO', aliases: ['المراعي'] },
    { symbol: '4013.SR', name: 'DR SULAIMAN AL HABIB MEDICAL', aliases: ['الحبيب', 'د سليمان الحبيب', 'سليمان الحبيب'] },
    { symbol: '1211.SR', name: 'SAUDI ARABIAN MINING CO', aliases: ['معادن'] },
    { symbol: '2350.SR', name: 'SAUDI KAYAN PETROCHEMICAL CO', aliases: ['كيان', 'كيان السعودية'] },
    { symbol: '4300.SR', name: 'DAR AL ARKAN REAL ESTATE DEV', aliases: ['دار الأركان', 'الأركان'] },
    { symbol: '4001.SR', name: 'ABDULLAH AL OTHAIM MARKETS', aliases: ['العثيم', 'أسواق العثيم', 'عبدالله العثيم'] },
    { symbol: '5110.SR', name: 'SAUDI ENERGY CO', aliases: ['الكهرباء', 'الشركة السعودية للكهرباء', 'السعودية للطاقة'] },
    { symbol: '2020.SR', name: 'SABIC AGRI-NUTRIENTS CO', aliases: ['سافكو', 'سابك للمغذيات'] },
    { symbol: '2310.SR', name: 'SAHARA INTERNATIONAL PETROCHEM', aliases: ['سبكيم'] },
    { symbol: '2380.SR', name: 'RABIGH REFINING AND PETROCHE', aliases: ['بترو رابغ', 'رابغ'] },
    { symbol: '2290.SR', name: 'YANBU NATIONAL PETROCHEMICAL', aliases: ['ينساب'] },
    { symbol: '4030.SR', name: 'NATIONAL SHIPPING CO OF/THE', aliases: ['البحري', 'النقل البحري'] },
    { symbol: '2330.SR', name: 'ADVANCED PETROCHEMICALS CO', aliases: ['المتقدمة', 'المتقدمة للبتروكيماويات'] },
    { symbol: '2250.SR', name: 'SAUDI IND INVESTMENT GROUP', aliases: ['المجموعة السعودية', 'المجموعة السعودية للاستثمار الصناعي'] },
    { symbol: '7030.SR', name: 'MOBILE TELECOMMUNICATIONS CO', aliases: ['زين', 'زين السعودية'] },
    { symbol: '7020.SR', name: 'ETIHAD ETISALAT CO', aliases: ['موبايلي', 'اتحاد اتصالات'] },
    { symbol: '1111.SR', name: 'SAUDI TADAWUL GROUP HOLDING', aliases: ['تداول', 'مجموعة تداول'] },
    { symbol: '4164.SR', name: 'NAHDI MEDICAL CO', aliases: ['النهدي', 'النهدي الطبية'] },
    { symbol: '4004.SR', name: 'DALLAH HEALTHCARE CO', aliases: ['دله', 'دله الصحية'] },
    { symbol: '4002.SR', name: 'MOUWASAT MEDICAL SERVICES CO', aliases: ['المواساة'] },
    { symbol: '4200.SR', name: 'ALDREES PETROLEUM AND TRANSP', aliases: ['الدريس'] },
    { symbol: '1810.SR', name: 'SEERA GROUP HOLDING', aliases: ['سيرا'] },
    { symbol: '1214.SR', name: 'AL-HASSAN G.I. SHAKER CO', aliases: ['شاكر'] },
    { symbol: '2170.SR', name: 'ALUJAIN CORP', aliases: ['اللجين'] },
    { symbol: '1010.SR', name: 'RIYAD BANK', aliases: ['الرياض', 'بنك الرياض'] },
    { symbol: '1020.SR', name: 'BANK AL-JAZIRA', aliases: ['الجزيرة', 'بنك الجزيرة'] },
    { symbol: '1030.SR', name: 'SAUDI INVESTMENT BANK/THE', aliases: ['الاستثمار', 'بنك الاستثمار', 'السعودي للاستثمار'] },
    { symbol: '1060.SR', name: 'SAUDI AWWAL BANK', aliases: ['الأول', 'البنك السعودي الأول', 'ساب'] },
    { symbol: '1080.SR', name: 'ARAB NATIONAL BANK', aliases: ['العربي', 'البنك العربي الوطني', 'العربي الوطني'] },
    { symbol: '2060.SR', name: 'NATIONAL INDUSTRIALIZATION C', aliases: ['التصنيع', 'التصنيع الوطنية'] },
    { symbol: '6001.SR', name: 'HALWANI BROS CO', aliases: ['حلواني', 'حلواني إخوان'] },
    { symbol: '4150.SR', name: 'ARRIYADH DEVELOPMENT COMPANY', aliases: ['الرياض للتعمير'] },
    { symbol: '2281.SR', name: 'TANMIAH FOOD CO', aliases: ['تنمية', 'تنمية الغذائية'] },
    { symbol: '4005.SR', name: 'NATIONAL MEDICAL CARE CO', aliases: ['الرعاية الوطنية', 'الرعاية الطبية الوطنية'] },
    { symbol: '2220.SR', name: 'MAADANIYAH', aliases: ['معدنية'] },
];

const ARABIC = /[\u0600-\u06FF]/;
const MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

/** Folds the spelling variants a reader may use, so one search finds them all. */
export function normalizeArabic(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(MARKS, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/[^\p{L}\p{N} ]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

type IndexEntry = { entry: SaudiSymbol; keys: string[] };

const INDEX: IndexEntry[] = SAUDI_SYMBOLS.map((entry) => ({
    entry,
    keys: [entry.name, ...entry.aliases].map(normalizeArabic).filter(Boolean),
}));

// A longer query that still matches is a more specific match, so length breaks ties.
const score = (key: string, query: string): number => {
    if (key === query) return 100;
    if (key.startsWith(query)) return 60 + query.length;
    if (key.includes(` ${query}`)) return 50 + query.length;
    if (key.includes(query)) return 30 + query.length;
    // The reader typed more than the stored name, e.g. "شركة الاتصالات السعودية".
    if (query.includes(key)) return 20 + key.length;
    return 0;
};

/**
 * Matches an Arabic query against the Saudi table. A Latin query returns nothing: Finnhub already
 * covers that half, and answering here would shadow its results.
 */
export function searchSaudiSymbols(query: string, limit = 5): SaudiSymbol[] {
    const raw = typeof query === 'string' ? query.trim() : '';
    if (!ARABIC.test(raw)) return [];
    const q = normalizeArabic(raw);
    if (q.length < 2) return [];

    const hits: { entry: SaudiSymbol; score: number }[] = [];
    for (const { entry, keys } of INDEX) {
        let best = 0;
        for (const key of keys) {
            const value = score(key, q);
            if (value > best) best = value;
        }
        if (best > 0) hits.push({ entry, score: best });
    }

    return hits
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((hit) => hit.entry);
}
