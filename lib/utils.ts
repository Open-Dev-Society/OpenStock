import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diffInMs = now - timestamp * 1000; // Convert to milliseconds
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInHours > 24) {
        const days = Math.floor(diffInHours / 24);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (diffInHours >= 1) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }
};

export function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Formatted string like "$3.10T", "$900.00B", "$25.00M" or "$999999.99"
export function formatMarketCapValue(marketCapUsd: number): string {
    if (!Number.isFinite(marketCapUsd) || marketCapUsd <= 0) return 'N/A';

    if (marketCapUsd >= 1e12) return `$${(marketCapUsd / 1e12).toFixed(2)}T`; // Trillions
    if (marketCapUsd >= 1e9) return `$${(marketCapUsd / 1e9).toFixed(2)}B`; // Billions
    if (marketCapUsd >= 1e6) return `$${(marketCapUsd / 1e6).toFixed(2)}M`; // Millions
    return `$${marketCapUsd.toFixed(2)}`; // Below one million, show full USD amount
}

export const getDateRange = (days: number) => {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(toDate.getDate() - days);
    return {
        to: toDate.toISOString().split('T')[0],
        from: fromDate.toISOString().split('T')[0],
    };
};

// Get today's date range (from today to today)
export const getTodayDateRange = () => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    return {
        to: todayString,
        from: todayString,
    };
};

// Calculate news per symbol based on watchlist size
export const calculateNewsDistribution = (symbolsCount: number) => {
    let itemsPerSymbol: number;
    let targetNewsCount = 6;

    if (symbolsCount < 3) {
        itemsPerSymbol = 3; // Fewer symbols, more news each
    } else if (symbolsCount === 3) {
        itemsPerSymbol = 2; // Exactly 3 symbols, 2 news each = 6 total
    } else {
        itemsPerSymbol = 1; // Many symbols, 1 news each
        targetNewsCount = 6; // Don't exceed 6 total
    }

    return { itemsPerSymbol, targetNewsCount };
};

// Check for required article fields
export const validateArticle = (article: RawNewsArticle) =>
    article.headline && article.summary && article.url && article.datetime;

// Get today's date string in YYYY-MM-DD format
export const getTodayString = () => new Date().toISOString().split('T')[0];

export const formatArticle = (
    article: RawNewsArticle,
    isCompanyNews: boolean,
    symbol?: string,
    index: number = 0
) => ({
    id: isCompanyNews ? Date.now() + Math.random() : article.id + index,
    headline: article.headline!.trim(),
    summary:
        article.summary!.trim().substring(0, isCompanyNews ? 200 : 150) + '...',
    source: article.source || (isCompanyNews ? 'Company News' : 'Market News'),
    url: article.url!,
    datetime: article.datetime!,
    image: article.image || '',
    category: isCompanyNews ? 'company' : article.category || 'general',
    related: isCompanyNews ? symbol! : article.related || '',
});

export const formatChangePercent = (changePercent?: number) => {
    if (changePercent === undefined || changePercent === null) return '';
    const sign = changePercent > 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(2)}%`;
};

export const getChangeColorClass = (changePercent?: number) => {
    if (!changePercent) return 'text-gray-400';
    return changePercent > 0 ? 'text-green-500' : 'text-red-500';
};

export const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
    }).format(price);
};

// Alias for consistency
export const formatCurrency = formatPrice;

export function formatNumber(num?: number | null): string {
    // Guard against missing/invalid market caps (Finnhub omits this field for many
    // symbols, e.g. ETFs). Without this, `num * 1e6` yields NaN and renders "NaN".
    if (num === undefined || num === null || !Number.isFinite(num)) return 'N/A';

    // If number is small (likely already in millions from Finnhub), multiply by 1M to get actual value
    // Typical mega-cap is > 100B. 100B in millions is 100,000.
    // If we assume typical market cap input IS millions:
    const value = num * 1000000;

    if (value >= 1e12) return (value / 1e12).toFixed(2) + 'T';
    if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
    if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M';
    if (value >= 1e3) return (value / 1e3).toFixed(2) + 'K';
    return value.toString();
}

export const formatDateToday = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
});


export const getAlertText = (alert: Alert) => {
    const condition = alert.alertType === 'upper' ? '>' : '<';
    return `Price ${condition} ${formatPrice(alert.threshold)}`;
};

export const getFormattedTodayDate = () => new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
});

/**
 * Maps Finnhub exchange suffixes to TradingView exchange prefixes.
 * Finnhub symbols use a dot-suffix convention (e.g. "2330.TW"),
 * while TradingView uses a colon-prefix convention (e.g. "TWSE:2330").
 */
const FINNHUB_TO_TRADINGVIEW_EXCHANGE: Record<string, string> = {
    // Asia-Pacific
    '.TW': 'TWSE',   // Taiwan Stock Exchange
    '.TWO': 'TPEX',  // Taiwan OTC Exchange
    '.T': 'TSE',     // Tokyo Stock Exchange
    '.HK': 'HKEX',   // Hong Kong
    '.SS': 'SSE',    // Shanghai
    '.SZ': 'SZSE',   // Shenzhen
    '.KS': 'KRX',    // Korea Exchange
    '.KQ': 'KRX',    // KOSDAQ (Korea)
    '.SI': 'SGX',    // Singapore
    '.AX': 'ASX',    // Australian Securities Exchange
    '.NZ': 'NZX',    // New Zealand
    '.BO': 'BSE',    // Bombay Stock Exchange
    '.NS': 'NSE',    // National Stock Exchange of India
    '.BK': 'SET',    // Stock Exchange of Thailand
    '.JK': 'IDX',    // Indonesia Stock Exchange
    '.KL': 'MYX',    // Bursa Malaysia

    // Europe
    '.L': 'LSE',     // London Stock Exchange
    '.IL': 'LSE',    // London (IOB international)
    '.DE': 'XETR',   // Deutsche Boerse (Xetra)
    '.F': 'FWB',     // Frankfurt Stock Exchange
    '.PA': 'EURONEXT', // Euronext Paris
    '.AS': 'EURONEXT', // Euronext Amsterdam
    '.BR': 'EURONEXT', // Euronext Brussels
    '.LS': 'EURONEXT', // Euronext Lisbon
    '.MI': 'MIL',    // Borsa Italiana (Milan)
    '.MC': 'BME',    // Bolsa de Madrid
    '.ST': 'OMXSTO', // Stockholm (Nasdaq Nordic)
    '.HE': 'OMXHEX', // Helsinki (Nasdaq Nordic)
    '.CO': 'OMXCOP', // Copenhagen (Nasdaq Nordic)
    '.OL': 'OSL',    // Oslo Stock Exchange
    '.SW': 'SIX',    // SIX Swiss Exchange
    '.VI': 'VIE',    // Vienna Stock Exchange
    '.WA': 'GPW',    // Warsaw Stock Exchange
    '.PR': 'PSE',    // Prague Stock Exchange
    '.AT': 'ATHEX',  // Athens Stock Exchange
    '.IS': 'BIST',   // Borsa Istanbul

    // Americas
    '.TO': 'TSX',    // Toronto Stock Exchange
    '.V': 'TSXV',    // TSX Venture Exchange
    '.SA': 'BMFBOVESPA', // B3 (Brazil)
    '.MX': 'BMV',    // Bolsa Mexicana de Valores
    '.BA': 'BCBA',   // Buenos Aires Stock Exchange

    // Middle East & Africa
    '.TA': 'TASE',   // Tel Aviv Stock Exchange
    '.JO': 'JSE',    // Johannesburg Stock Exchange
};

export function formatSymbolForTradingView(symbol: string): string {
    if (!symbol) return '';
    const upperSymbol = symbol.toUpperCase();

    // Check for known exchange suffixes, trying longer suffixes first
    // to avoid ".TWO" matching ".TW" prematurely
    const suffixes = Object.keys(FINNHUB_TO_TRADINGVIEW_EXCHANGE)
        .sort((a, b) => b.length - a.length);

    for (const suffix of suffixes) {
        if (upperSymbol.endsWith(suffix.toUpperCase())) {
            const ticker = upperSymbol.slice(0, -suffix.length);
            const exchange = FINNHUB_TO_TRADINGVIEW_EXCHANGE[suffix];
            return `${exchange}:${ticker}`;
        }
    }

    return upperSymbol;
}