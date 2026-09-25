import { describe, it, expect } from "vitest";
import {
  resolveStrategyFromPrompt,
  generateVibeTradingPlan,
} from "@/lib/strategy/vibeTrader";

describe("HKUDS/Vibe-Trading Integration & Strategy Resolution", () => {
  describe("1. Prompt-to-Strategy Resolution", () => {
    it("resolves TensorTrade Deep RL when prompt mentions RL, AI, or aggressive risk", () => {
      const res = resolveStrategyFromPrompt(
        "Deploy a deep reinforcement learning agent with adaptive policy",
        "BINANCE:HYPEUSDT",
        "aggressive"
      );
      expect(res.type).toBe("tensortrade_rl");
      expect(res.params.lookback).toBeDefined();
      expect(res.params.riskTolerance).toBe(3.0);
      expect(res.params.allowShort).toBe(1);
    });

    it("resolves SMC Liquidity Sweep & Reclaim when prompt asks for sweeps", () => {
      const res = resolveStrategyFromPrompt(
        "Look for liquidity sweep of swing lows on BTC and trade the reclaim",
        "BINANCE:BTCUSDT",
        "balanced"
      );
      expect(res.type).toBe("liquidity_sweep");
      expect(res.params.lookback).toBe(20);
      expect(res.params.volMultiplier).toBe(1.3);
    });

    it("resolves Fair Value Gap when prompt mentions FVG or imbalance", () => {
      const res = resolveStrategyFromPrompt(
        "Trade institutional fair value gap retests",
        "NVDA",
        "balanced"
      );
      expect(res.type).toBe("fair_value_gap");
      expect(res.params.minGapPct).toBe(0.3);
      expect(res.params.holdBars).toBe(8);
    });

    it("resolves SuperTrend when prompt mentions trailing stop or ATR", () => {
      const res = resolveStrategyFromPrompt(
        "Use ATR trailing envelope for trend riding",
        "SPY",
        "conservative"
      );
      expect(res.type).toBe("supertrend");
      expect(res.params.multiplier).toBe(3.0);
    });

    it("resolves Overnight Gap Drift when prompt mentions overnight", () => {
      const res = resolveStrategyFromPrompt(
        "Capture overnight gap drift between close and open",
        "QQQ",
        "conservative"
      );
      expect(res.type).toBe("overnight_hold");
    });

    it("resolves Bollinger Reversion when prompt mentions mean reversion or pullbacks", () => {
      const res = resolveStrategyFromPrompt(
        "Statistical mean reversion when price pierces lower Bollinger band",
        "AAPL",
        "balanced"
      );
      expect(res.type).toBe("bollinger_reversion");
      expect(res.params.period).toBe(20);
      expect(res.params.stdDevMult).toBe(2.0);
    });

    it("resolves Donchian Breakout when prompt mentions channel breakout", () => {
      const res = resolveStrategyFromPrompt(
        "Donchian 20-day channel momentum breakout",
        "MSFT",
        "balanced"
      );
      expect(res.type).toBe("breakout");
      expect(res.params.lookback).toBe(20);
    });
  });

  describe("2. Multi-Agent Committee Deliberation & Plan Generation", () => {
    it("generates complete Vibe trading plan with 4-agent committee debate for crypto", async () => {
      const plan = await generateVibeTradingPlan({
        prompt: "Deep RL Q-policy on HYPEUSDT with tight stop loss",
        symbol: "BINANCE:HYPEUSDT",
        timeframe: "1h",
        riskAppetite: "aggressive",
      });

      expect(plan.ok).toBe(true);
      expect(plan.symbol).toBe("BINANCE:HYPEUSDT");
      expect(plan.timeframe).toBe("1h");
      expect(plan.strategyType).toBe("tensortrade_rl");
      expect(plan.vibeScore).toBeGreaterThanOrEqual(70);
      expect(plan.vibeScore).toBeLessThanOrEqual(100);

      // Verify all 4 committee perspectives are populated
      expect(plan.committee.alphaSeeker).toContain("Alpha Seeker");
      expect(plan.committee.riskAuditor).toContain("Risk Auditor");
      expect(plan.committee.rlSpecialist).toContain("TensorTrade RL Engine");
      expect(plan.committee.cioVerdict).toBeDefined();

      // Verify target metrics and execution rules
      expect(plan.targetKpis.expectedWinRate).toBeGreaterThan(50);
      expect(plan.targetKpis.expectedSharpe).toBeGreaterThan(1.5);
      expect(plan.targetKpis.expectedSortino).toBeGreaterThan(2.0);
      expect(plan.targetKpis.maxExpectedDrawdown).toBeLessThan(0);
      expect(plan.executionRules.entryCondition).toBeDefined();
      expect(plan.executionRules.exitCondition).toBeDefined();
      expect(plan.executionRules.stopLossRule).toBeDefined();
    });

    it("generates complete Vibe trading plan for equity mega-cap", async () => {
      const plan = await generateVibeTradingPlan({
        prompt: "Trend follow NVDA with EMA crossover",
        symbol: "NVDA",
        timeframe: "4h",
        riskAppetite: "balanced",
      });

      expect(plan.ok).toBe(true);
      expect(plan.strategyType).toBe("ema_crossover");
      expect(plan.committee.cioVerdict).toBeDefined();
      expect(plan.targetKpis.expectedSharpe).toBeGreaterThan(1.0);
    });
  });
});
