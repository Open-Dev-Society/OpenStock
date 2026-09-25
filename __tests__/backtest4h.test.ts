import { describe, it, expect } from "vitest";
import {
  calcSMA,
  calcWMA,
  calcHMA,
  calcATR,
  calcADX,
  calcStochRSI,
  calcZScore,
  calcBollingerBands,
  calcKeltner,
  evaluateHmaTrend,
  evaluateAdxTrend,
  evaluateStochRsi,
  evaluateZScoreRev,
  evaluateBbRev,
  evaluateKeltner,
  evaluateMacdCross,
  evaluateOvernight,
  evaluateSmaGolden,
  evaluateTensorTradeRl,
} from "@/lib/strategy/backtest4h";
import { Candle4h } from "@/lib/market/ohlcv4h";

function createMockCandles(count: number, basePrice: number = 100): Candle4h[] {
  const candles: Candle4h[] = [];
  let price = basePrice;
  const startTime = new Date("2025-01-01T00:00:00Z").getTime();

  for (let i = 0; i < count; i++) {
    const change = Math.sin(i / 5) * 2 + (i % 2 === 0 ? 0.5 : -0.3);
    const open = price;
    price += change;
    const close = price;
    const high = Math.max(open, close) + 1.0;
    const low = Math.min(open, close) - 1.0;
    const volume = 1000 + (i % 7) * 150;
    const time = new Date(startTime + i * 4 * 3600 * 1000);

    candles.push({ open, high, low, close, volume, time });
  }

  return candles;
}

describe("AlphaStudio Quantitative Strategy & Indicator Integration", () => {
  const candles = createMockCandles(100, 100);
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);

  describe("1. Technical Indicators", () => {
    it("calcSMA computes correct moving average", () => {
      const sma = calcSMA(closes, 5);
      expect(sma.length).toBe(closes.length);
      const expected0to4 = closes.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
      expect(sma[4]).toBeCloseTo(expected0to4, 5);
    });

    it("calcWMA computes weighted moving average with O(N) efficiency", () => {
      const wma = calcWMA(closes, 5);
      expect(wma.length).toBe(closes.length);
      expect(wma[4]).toBeGreaterThan(0);
    });

    it("calcHMA computes Hull Moving Average", () => {
      const hma = calcHMA(closes, 9);
      expect(hma.length).toBe(closes.length);
      expect(typeof hma[8]).toBe("number");
      expect(Number.isNaN(hma[8])).toBe(false);
    });

    it("calcATR computes true range and average true range", () => {
      const atr = calcATR(highs, lows, closes, 14);
      expect(atr.length).toBe(closes.length);
      expect(atr[13]).toBeGreaterThan(0);
    });

    it("calcADX computes ADX, +DI, and -DI", () => {
      const { adx, plusDI, minusDI } = calcADX(highs, lows, closes, 14);
      expect(adx.length).toBe(closes.length);
      expect(plusDI.length).toBe(closes.length);
      expect(minusDI.length).toBe(closes.length);
      expect(adx[20]).toBeGreaterThanOrEqual(0);
    });

    it("calcStochRSI computes %K and %D", () => {
      const { k, d } = calcStochRSI(closes, 14, 3, 3);
      expect(k.length).toBe(closes.length);
      expect(d.length).toBe(closes.length);
      expect(k[20]).toBeGreaterThanOrEqual(0);
      expect(k[20]).toBeLessThanOrEqual(100);
    });

    it("calcZScore computes rolling statistical Z-Score", () => {
      const zscores = calcZScore(closes, 20);
      expect(zscores.length).toBe(closes.length);
      expect(typeof zscores[19]).toBe("number");
      expect(Number.isFinite(zscores[19])).toBe(true);
    });

    it("calcBollingerBands computes upper, middle, and lower bands", () => {
      const { upper, middle, lower } = calcBollingerBands(closes, 20, 2);
      expect(upper.length).toBe(closes.length);
      expect(middle.length).toBe(closes.length);
      expect(lower.length).toBe(closes.length);
      expect(upper[25]).toBeGreaterThan(middle[25]);
      expect(middle[25]).toBeGreaterThan(lower[25]);
    });

    it("calcKeltner computes upper, middle, and lower Keltner channels", () => {
      const { upper, middle, lower } = calcKeltner(highs, lows, closes, 20, 10, 1.5);
      expect(upper.length).toBe(closes.length);
      expect(middle.length).toBe(closes.length);
      expect(lower.length).toBe(closes.length);
      expect(upper[25]).toBeGreaterThan(middle[25]);
      expect(middle[25]).toBeGreaterThan(lower[25]);
    });
  });

  describe("2. AlphaStudio Strategies", () => {
    it("evaluates hma_trend", () => {
      const res = evaluateHmaTrend(candles, 9, 21, "TEST");
      expect(res.metrics).toBeDefined();
      expect(typeof res.metrics.sharpe).toBe("number");
      expect(typeof res.metrics.sortino).toBe("number");
      expect(typeof res.metrics.calmar).toBe("number");
      expect(typeof res.metrics.profitFactor).toBe("number");
      expect(typeof res.metrics.exposure).toBe("number");
    });

    it("evaluates adx_trend", () => {
      const res = evaluateAdxTrend(candles, 14, 25, "TEST");
      expect(res.metrics).toBeDefined();
      expect(res.metrics.barsCount).toBe(candles.length);
    });

    it("evaluates stoch_rsi", () => {
      const res = evaluateStochRsi(candles, 14, 3, 3, 20, 80, "TEST");
      expect(res.metrics).toBeDefined();
    });

    it("evaluates zscore_rev", () => {
      const res = evaluateZScoreRev(candles, 20, 2.0, "TEST");
      expect(res.metrics).toBeDefined();
    });

    it("evaluates bb_rev", () => {
      const res = evaluateBbRev(candles, 20, 2.0, "TEST");
      expect(res.metrics).toBeDefined();
    });

    it("evaluates keltner", () => {
      const res = evaluateKeltner(candles, 20, 10, 1.5, "TEST");
      expect(res.metrics).toBeDefined();
    });

    it("evaluates macd_cross", () => {
      const res = evaluateMacdCross(candles, 12, 26, 9, "TEST");
      expect(res.metrics).toBeDefined();
    });

    it("evaluates overnight", () => {
      const res = evaluateOvernight(candles, "TEST");
      expect(res.metrics).toBeDefined();
      expect(res.trades.length).toBeGreaterThan(0);
    });

    it("evaluates sma_golden", () => {
      const res = evaluateSmaGolden(candles, 10, 30, "TEST");
      expect(res.metrics).toBeDefined();
    });

    it("evaluates tensortrade_rl adaptive Q-policy across multiple asset classes", () => {
      // 1. Crypto with shorting enabled
      const cryptoRes = evaluateTensorTradeRl(candles, 20, 2.0, "BINANCE:BTCUSDT", true, "4h");
      expect(cryptoRes.metrics).toBeDefined();
      expect(Number.isFinite(cryptoRes.metrics.sortino)).toBe(true);
      expect(Number.isFinite(cryptoRes.metrics.calmar)).toBe(true);
      expect(cryptoRes.metrics.exposure).toBeGreaterThanOrEqual(0);

      // 2. Hyperliquid perp pair
      const hypeRes = evaluateTensorTradeRl(candles, 14, 1.5, "BINANCE:HYPEUSDT", true, "1h");
      expect(hypeRes.metrics).toBeDefined();
      expect(Number.isFinite(hypeRes.metrics.totalReturn)).toBe(true);

      // 3. Equity Mega-cap (long only)
      const nvdaRes = evaluateTensorTradeRl(candles, 20, 2.5, "NVDA", false, "4h");
      expect(nvdaRes.metrics).toBeDefined();
      expect(nvdaRes.metrics.maxDrawdown).toBeGreaterThanOrEqual(0);

      // 4. Index ETF
      const spyRes = evaluateTensorTradeRl(candles, 25, 2.0, "SPY", false, "1d");
      expect(spyRes.metrics).toBeDefined();
      expect(spyRes.metrics.tradesCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("3. Advanced Institutional Metrics", () => {
    it("computes Sortino, Calmar, Profit Factor, and Exposure properly", () => {
      const res = evaluateHmaTrend(candles, 9, 21, "TEST");
      const m = res.metrics;
      expect(Number.isFinite(m.sortino)).toBe(true);
      expect(Number.isFinite(m.calmar)).toBe(true);
      expect(Number.isFinite(m.profitFactor)).toBe(true);
      expect(m.profitFactor).toBeGreaterThanOrEqual(0);
      expect(m.exposure).toBeGreaterThanOrEqual(0);
      expect(m.exposure).toBeLessThanOrEqual(100);
    });
  });

  describe("4. Multi-Asset Alpha Matrix (All 87 Tickers & TensorTrade RL)", () => {
    it("ensures all 87 tickers in QUANT_SYMBOL_UNIVERSE have TensorTrade RL in YTD and 5Y matrix", async () => {
      const { QUANT_SYMBOL_UNIVERSE } = await import("@/lib/market/symbols");
      const { ALPHA_MATRIX_YTD, ALPHA_MATRIX_5YR } = await import("@/components/backtest/types");

      expect(QUANT_SYMBOL_UNIVERSE.length).toBe(87);

      for (const s of QUANT_SYMBOL_UNIVERSE) {
        const clean = s.symbol.replace("BINANCE:", "");

        // 1. Must exist in YTD
        const ytdMatch = ALPHA_MATRIX_YTD.find(
          (m) => m.symbol === clean && m.strategyKey === "tensortrade_rl"
        );
        expect(ytdMatch).toBeDefined();
        expect(ytdMatch?.ret).toBeDefined();
        expect(Number.isFinite(ytdMatch?.sharpe)).toBe(true);
        expect(Number.isFinite(ytdMatch?.sortino)).toBe(true);
        expect(Number.isFinite(ytdMatch?.calmar)).toBe(true);

        // 2. Must exist in 5YR
        const fiveYrMatch = ALPHA_MATRIX_5YR.find(
          (m) => m.symbol === clean && m.strategyKey === "tensortrade_rl"
        );
        expect(fiveYrMatch).toBeDefined();
        expect(fiveYrMatch?.ret).toBeDefined();
        expect(fiveYrMatch?.cagr).toBeGreaterThan(0);
        expect(Number.isFinite(fiveYrMatch?.sortino)).toBe(true);
      }
    });
  });
});
