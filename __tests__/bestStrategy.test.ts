import { describe, it, expect } from "vitest";
import {
  getBestStrategyForSymbolAndTimeframe,
  getOptimalParamsForStrategy,
} from "@/lib/strategy/bestStrategy";

describe("AlphaStudio Optimal Strategy & Configuration Resolution", () => {
  describe("1. getBestStrategyForSymbolAndTimeframe", () => {
    it("selects optimal strategy for Crypto pairs", () => {
      const btcBest = getBestStrategyForSymbolAndTimeframe("BINANCE:BTCUSDT", "4h");
      expect(btcBest.symbol).toBe("BINANCE:BTCUSDT");
      expect(btcBest.timeframe).toBe("4h");
      expect(btcBest.strategyType).toBeDefined();
      expect(btcBest.params).toBeDefined();
      expect(btcBest.metrics.sharpe).toBeGreaterThan(1.5);
      expect(btcBest.metrics.sortino).toBeGreaterThan(2.0);

      const hypeBest = getBestStrategyForSymbolAndTimeframe("BINANCE:HYPEUSDT", "1h");
      expect(hypeBest.strategyType).toBe("tensortrade_rl");
      expect(hypeBest.params.riskTolerance).toBeDefined();
      expect(hypeBest.metrics.expectedReturn).toBeGreaterThan(50);
    });

    it("selects optimal strategy for Tech Mega-Caps", () => {
      const nvdaBest = getBestStrategyForSymbolAndTimeframe("NVDA", "4h");
      expect(nvdaBest.strategyType).toBeDefined();
      expect(nvdaBest.metrics.sharpe).toBeGreaterThan(1.0);

      // On daily timeframe, Overnight Gap Drift or SuperTrend is prioritized
      const nvdaDaily = getBestStrategyForSymbolAndTimeframe("NVDA", "1d");
      expect(nvdaDaily.strategyType).toBe("overnight_hold");
      expect(nvdaDaily.metrics.expectedReturn).toBeGreaterThan(30);
    });

    it("selects optimal strategy for Index ETFs", () => {
      const spyBest = getBestStrategyForSymbolAndTimeframe("SPY", "4h");
      expect(spyBest.strategyType).toBeDefined();
      expect(spyBest.metrics.maxDrawdown).toBeLessThan(0);
      expect(spyBest.metrics.maxDrawdown).toBeGreaterThan(-15);
    });
  });

  describe("2. getOptimalParamsForStrategy", () => {
    it("returns tuned parameters for tensortrade_rl based on timeframe and asset class", () => {
      const intradayCrypto = getOptimalParamsForStrategy("tensortrade_rl", "15m", true);
      expect(intradayCrypto.lookback).toBe(14);
      expect(intradayCrypto.riskTolerance).toBe(1.5);
      expect(intradayCrypto.allowShort).toBe(1);

      const swingEquity = getOptimalParamsForStrategy("tensortrade_rl", "4h", false);
      expect(swingEquity.lookback).toBe(20);
      expect(swingEquity.riskTolerance).toBe(2.0);
      expect(swingEquity.allowShort).toBe(0);
    });

    it("returns tuned parameters for liquidity_sweep and supertrend", () => {
      const sweep = getOptimalParamsForStrategy("liquidity_sweep", "4h", true);
      expect(sweep.lookback).toBe(20);
      expect(sweep.volMultiplier).toBe(1.2);

      const supertrend = getOptimalParamsForStrategy("supertrend", "4h", false);
      expect(supertrend.atrPeriod).toBe(10);
      expect(supertrend.multiplier).toBe(3.0);
    });
  });
});
