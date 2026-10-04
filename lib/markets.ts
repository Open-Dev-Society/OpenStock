// Markets OpenStock can show - Saudi-only build (Tadawul).
//   - Finnhub free: US stocks and crypto only (every other exchange returns 403),
//     so Saudi symbols (.SR / TADAWUL:) use TradingView widgets for quotes and charts.
//   - TradingView embeds: TADAWUL symbols render (delayed on free plan).
// Adding a market = adding an entry here with symbols from an exchange that renders in embeds.

import { isInternationalSymbol } from "@/lib/utils";

export type MarketId = 'sa';

type Hours = { open: number; close: number }; // minutes of the local day

export type Market = {
    id: MarketId;
    name: string;
    short: string;
    timeZone: string;
    hours: Hours | '24/7' | '24/5';
    // Tadawul trades Sun-Thu (Fri-Sat weekend). 0 = Sunday.
    tradingDays?: number[];
    feed: 'Live' | 'Delayed' | 'End of day';
    // Tiles on the dashboard. `finnhub`/`yahoo` set = native tile with our own cached quote;
    // otherwise a TradingView quote (blocked for TADAWUL in free embeds).
    pulse: { symbol: string; label: string; finnhub?: string; yahoo?: string }[];
    groups: { title: string; symbols: [symbol: string, name: string][] }[];
    heatmap?: 'stocks' | 'crypto';
    news: 'stock' | 'crypto' | 'forex';
};

const hm = (h: number, m = 0) => h * 60 + m;

export const MARKETS: Market[] = [
    {
        id: 'sa', name: 'Saudi Arabia', short: 'SA', timeZone: 'Asia/Riyadh',
        hours: { open: hm(10), close: hm(15) }, tradingDays: [0, 1, 2, 3, 4], feed: 'Delayed',
        pulse: [
            { symbol: 'TADAWUL:TASI', label: 'TASI Index', yahoo: '^TASI.SR' },
            { symbol: 'TADAWUL:2222', label: 'Aramco', yahoo: '2222.SR' },
            { symbol: 'TADAWUL:1120', label: 'Al Rajhi', yahoo: '1120.SR' },
            { symbol: 'TADAWUL:7010', label: 'STC', yahoo: '7010.SR' },
        ],
        groups: [
            { title: 'Banks', symbols: [['TADAWUL:1120', 'Al Rajhi Bank'], ['TADAWUL:1180', 'Saudi National Bank'], ['TADAWUL:1150', 'Alinma Bank'], ['TADAWUL:1010', 'Riyad Bank'], ['TADAWUL:1060', 'SAB']] },
            { title: 'Energy & Materials', symbols: [['TADAWUL:2222', 'Saudi Aramco'], ['TADAWUL:2010', 'SABIC'], ['TADAWUL:2082', 'ACWA Power'], ['TADAWUL:1111', 'Tadawul Group']] },
            { title: 'Telecom & Consumer', symbols: [['TADAWUL:7010', 'STC Group'], ['TADAWUL:7020', 'Mobily'], ['TADAWUL:7030', 'Zain KSA'], ['TADAWUL:2280', 'Almarai'], ['TADAWUL:4300', 'Dar Alarkan']] },
        ],
        news: 'stock',
    },
];

export const DEFAULT_MARKET: MarketId = 'sa';
export const MARKET_COOKIE = 'openstock-market';

export const getMarket = (id?: string | null) => MARKETS.find((m) => m.id === id) ?? MARKETS[0];

export const marketForCountry = (country?: string | null): MarketId => {
    void country;
    return DEFAULT_MARKET;
};

// Finnhub free can price (and so alert on) US listings and Binance pairs only.
export const hasFinnhubQuotes = (symbol: string) => {
    const upper = symbol.toUpperCase();
    if (upper.startsWith('BINANCE:')) return true;
    return !upper.includes(':') && !isInternationalSymbol(upper);
};

// Is the market trading right now, in its own time zone? Holidays aren't modelled.
export function isMarketOpen(market: Market, date = new Date()) {
    if (market.hours === '24/7') return true;
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-US', { timeZone: market.timeZone, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
            .formatToParts(date).map((p) => [p.type, p.value]),
    );
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
    const minutes = Number(parts.hour) * 60 + Number(parts.minute);
    if (market.hours === '24/5') {
        // FX: Sunday 17:00 to Friday 17:00, New York time
        if (day === 6) return false;
        if (day === 0) return minutes >= hm(17);
        if (day === 5) return minutes < hm(17);
        return true;
    }
    const tradingDays = market.tradingDays ?? [1, 2, 3, 4, 5];
    return tradingDays.includes(day) && minutes >= market.hours.open && minutes < market.hours.close;
}
