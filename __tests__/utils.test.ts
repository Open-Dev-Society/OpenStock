import { describe, it, expect } from 'vitest';
import {
    formatSymbolForTradingView,
    formatMarketCapValue,
    formatChangePercent,
    getChangeColorClass,
    calculateNewsDistribution,
    formatNumber,
} from '@/lib/utils';

describe('formatSymbolForTradingView', () => {
    it('returns empty string for empty input', () => {
        expect(formatSymbolForTradingView('')).toBe('');
    });

    it('returns uppercase US symbol as-is', () => {
        expect(formatSymbolForTradingView('AAPL')).toBe('AAPL');
        expect(formatSymbolForTradingView('aapl')).toBe('AAPL');
    });

    // Asia-Pacific exchanges
    it('maps Taiwan (.TW) to TWSE prefix', () => {
        expect(formatSymbolForTradingView('2330.TW')).toBe('TWSE:2330');
    });

    it('maps Taiwan OTC (.TWO) to TPEX prefix', () => {
        expect(formatSymbolForTradingView('6488.TWO')).toBe('TPEX:6488');
    });

    it('maps Tokyo (.T) to TSE prefix', () => {
        expect(formatSymbolForTradingView('7203.T')).toBe('TSE:7203');
    });

    it('maps Hong Kong (.HK) to HKEX prefix', () => {
        expect(formatSymbolForTradingView('0700.HK')).toBe('HKEX:0700');
    });

    it('maps Shanghai (.SS) to SSE prefix', () => {
        expect(formatSymbolForTradingView('600519.SS')).toBe('SSE:600519');
    });

    it('maps Shenzhen (.SZ) to SZSE prefix', () => {
        expect(formatSymbolForTradingView('000858.SZ')).toBe('SZSE:000858');
    });

    it('maps Korea (.KS) to KRX prefix', () => {
        expect(formatSymbolForTradingView('005930.KS')).toBe('KRX:005930');
    });

    it('maps India NSE (.NS) to NSE prefix', () => {
        expect(formatSymbolForTradingView('RELIANCE.NS')).toBe('NSE:RELIANCE');
    });

    it('maps India BSE (.BO) to BSE prefix', () => {
        expect(formatSymbolForTradingView('RELIANCE.BO')).toBe('BSE:RELIANCE');
    });

    it('maps Australia (.AX) to ASX prefix', () => {
        expect(formatSymbolForTradingView('BHP.AX')).toBe('ASX:BHP');
    });

    it('maps Singapore (.SI) to SGX prefix', () => {
        expect(formatSymbolForTradingView('D05.SI')).toBe('SGX:D05');
    });

    // European exchanges
    it('maps London (.L) to LSE prefix', () => {
        expect(formatSymbolForTradingView('SHEL.L')).toBe('LSE:SHEL');
    });

    it('maps Germany/Xetra (.DE) to XETR prefix', () => {
        expect(formatSymbolForTradingView('SAP.DE')).toBe('XETR:SAP');
    });

    it('maps Paris (.PA) to EURONEXT prefix', () => {
        expect(formatSymbolForTradingView('MC.PA')).toBe('EURONEXT:MC');
    });

    it('maps Amsterdam (.AS) to EURONEXT prefix', () => {
        expect(formatSymbolForTradingView('ASML.AS')).toBe('EURONEXT:ASML');
    });

    it('maps Milan (.MI) to MIL prefix', () => {
        expect(formatSymbolForTradingView('ENI.MI')).toBe('MIL:ENI');
    });

    it('maps Madrid (.MC) to BME prefix', () => {
        expect(formatSymbolForTradingView('SAN.MC')).toBe('BME:SAN');
    });

    it('maps Swiss (.SW) to SIX prefix', () => {
        expect(formatSymbolForTradingView('NESN.SW')).toBe('SIX:NESN');
    });

    it('maps Stockholm (.ST) to OMXSTO prefix', () => {
        expect(formatSymbolForTradingView('ERIC-B.ST')).toBe('OMXSTO:ERIC-B');
    });

    // Americas
    it('maps Toronto (.TO) to TSX prefix', () => {
        expect(formatSymbolForTradingView('RY.TO')).toBe('TSX:RY');
    });

    it('maps Brazil (.SA) to BMFBOVESPA prefix', () => {
        expect(formatSymbolForTradingView('VALE3.SA')).toBe('BMFBOVESPA:VALE3');
    });

    // Middle East & Africa
    it('maps Tel Aviv (.TA) to TASE prefix', () => {
        expect(formatSymbolForTradingView('TEVA.TA')).toBe('TASE:TEVA');
    });

    it('maps Johannesburg (.JO) to JSE prefix', () => {
        expect(formatSymbolForTradingView('NPN.JO')).toBe('JSE:NPN');
    });

    // Case insensitivity
    it('handles lowercase input', () => {
        expect(formatSymbolForTradingView('2330.tw')).toBe('TWSE:2330');
        expect(formatSymbolForTradingView('shel.l')).toBe('LSE:SHEL');
    });

    // Longer suffix matched before shorter (.TWO before .TW)
    it('prioritizes longer suffixes over shorter ones', () => {
        // .TWO should match before .TW
        expect(formatSymbolForTradingView('6488.TWO')).toBe('TPEX:6488');
        // But .TW still works for regular TW symbols
        expect(formatSymbolForTradingView('2330.TW')).toBe('TWSE:2330');
    });
});

describe('formatMarketCapValue', () => {
    it('returns N/A for invalid inputs', () => {
        expect(formatMarketCapValue(0)).toBe('N/A');
        expect(formatMarketCapValue(-100)).toBe('N/A');
        expect(formatMarketCapValue(NaN)).toBe('N/A');
        expect(formatMarketCapValue(Infinity)).toBe('N/A');
    });

    it('formats trillions', () => {
        expect(formatMarketCapValue(3.1e12)).toBe('$3.10T');
    });

    it('formats billions', () => {
        expect(formatMarketCapValue(900e9)).toBe('$900.00B');
    });

    it('formats millions', () => {
        expect(formatMarketCapValue(25e6)).toBe('$25.00M');
    });

    it('formats sub-million values', () => {
        expect(formatMarketCapValue(999999.99)).toBe('$999999.99');
    });
});

describe('formatChangePercent', () => {
    it('returns empty string for undefined/null', () => {
        expect(formatChangePercent(undefined)).toBe('');
        expect(formatChangePercent(null as any)).toBe('');
    });

    it('formats positive change with + sign', () => {
        expect(formatChangePercent(2.5)).toBe('+2.50%');
    });

    it('formats negative change', () => {
        expect(formatChangePercent(-1.23)).toBe('-1.23%');
    });

    it('formats zero change', () => {
        expect(formatChangePercent(0)).toBe('0.00%');
    });
});

describe('getChangeColorClass', () => {
    it('returns gray for zero or undefined', () => {
        expect(getChangeColorClass(0)).toBe('text-gray-400');
        expect(getChangeColorClass(undefined)).toBe('text-gray-400');
    });

    it('returns green for positive', () => {
        expect(getChangeColorClass(1.5)).toBe('text-green-500');
    });

    it('returns red for negative', () => {
        expect(getChangeColorClass(-0.5)).toBe('text-red-500');
    });
});

describe('formatNumber', () => {
    // Finnhub's profile2 marketCapitalization is expressed in millions of USD,
    // which formatNumber scales up by 1e6.
    it('formats market caps (input in millions) into T/B/M/K suffixes', () => {
        expect(formatNumber(3_000_000)).toBe('3.00T'); // 3,000,000M => $3T
        expect(formatNumber(150_000)).toBe('150.00B'); // 150,000M => $150B
        expect(formatNumber(150)).toBe('150.00M'); // 150M => $150M
    });

    it('returns N/A for missing or non-finite market caps', () => {
        // Finnhub omits marketCapitalization for many symbols (e.g. ETFs); the
        // watchlist passes that value straight through, so it must not render "NaN".
        expect(formatNumber(undefined)).toBe('N/A');
        expect(formatNumber(null)).toBe('N/A');
        expect(formatNumber(NaN)).toBe('N/A');
        expect(formatNumber(Infinity)).toBe('N/A');
    });
});

describe('calculateNewsDistribution', () => {
    it('returns 3 items per symbol for 1-2 symbols', () => {
        expect(calculateNewsDistribution(1).itemsPerSymbol).toBe(3);
        expect(calculateNewsDistribution(2).itemsPerSymbol).toBe(3);
    });

    it('returns 2 items per symbol for exactly 3', () => {
        expect(calculateNewsDistribution(3).itemsPerSymbol).toBe(2);
    });

    it('returns 1 item per symbol for 4+', () => {
        expect(calculateNewsDistribution(5).itemsPerSymbol).toBe(1);
        expect(calculateNewsDistribution(10).itemsPerSymbol).toBe(1);
    });
});
