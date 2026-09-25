import { describe, it, expect } from "vitest";
import {
  exportStrategyCode,
  getSupportedStrategies,
  normalizeStrategyType,
  resolveParams,
  generatePineScript,
  generateVectorbtScript,
  generateNautilusStrategy,
  generateQlibFactor,
  generateTensorTradeScript,
  SupportedStrategyType,
  STRATEGY_DEFINITIONS,
  StrategyExportBundle,
  ExportResultItem,
} from "@/lib/strategy/codeExport";
import { GET, POST } from "@/app/api/strategy/export/route";
import { NextRequest } from "next/server";

const ALL_17_STRATEGIES: SupportedStrategyType[] = [
  "supertrend",
  "fair_value_gap",
  "order_block",
  "liquidity_sweep",
  "ema_crossover",
  "rsi_oversold",
  "breakout",
  "hma_trend",
  "adx_trend",
  "stoch_rsi",
  "zscore_rev",
  "bb_rev",
  "keltner",
  "macd_cross",
  "overnight",
  "sma_golden",
  "tensortrade_rl",
];

describe("codeExport - Registry & Normalization", () => {
  it("registers exactly 17 strategy types", () => {
    const list = getSupportedStrategies();
    expect(list.length).toBe(17);
    const types = list.map((s) => s.type);
    for (const strat of ALL_17_STRATEGIES) {
      expect(types).toContain(strat);
    }
  });

  it("normalizes canonical strategy names and aliases", () => {
    expect(normalizeStrategyType("supertrend")).toBe("supertrend");
    expect(normalizeStrategyType("super_trend")).toBe("supertrend");
    expect(normalizeStrategyType("tensortrade")).toBe("tensortrade_rl");
    expect(normalizeStrategyType("deep_rl")).toBe("tensortrade_rl");
    expect(normalizeStrategyType("ema_cross")).toBe("ema_crossover");
    expect(normalizeStrategyType("ema-crossover")).toBe("ema_crossover");
    expect(normalizeStrategyType("rsi_pullback")).toBe("rsi_oversold");
    expect(normalizeStrategyType("rsi_rev")).toBe("rsi_oversold");
    expect(normalizeStrategyType("donchian")).toBe("breakout");
    expect(normalizeStrategyType("vol_breakout")).toBe("breakout");
    expect(normalizeStrategyType("golden_cross")).toBe("sma_golden");
    expect(normalizeStrategyType("fvg")).toBe("fair_value_gap");
    expect(normalizeStrategyType("ob")).toBe("order_block");
    expect(normalizeStrategyType("sweep")).toBe("liquidity_sweep");
    expect(normalizeStrategyType("kc")).toBe("keltner");
    expect(normalizeStrategyType("bb")).toBe("bb_rev");
  });

  it("throws clear error for unknown strategy", () => {
    expect(() => normalizeStrategyType("unknown_magic_strategy")).toThrow(
      /Unsupported strategy type/
    );
  });

  it("resolves parameters with defaults and user overrides", () => {
    const defaultParams = resolveParams("supertrend");
    expect(defaultParams.atrPeriod).toBe(10);
    expect(defaultParams.multiplier).toBe(3.0);

    const customParams = resolveParams("supertrend", { p1: 14, p2: 25 });
    expect(customParams.atrPeriod).toBe(14);
    expect(customParams.multiplier).toBe(2.5);

    const customEma = resolveParams("ema_crossover", { fastPeriod: 5, slowPeriod: 15 });
    expect(customEma.fastPeriod).toBe(5);
    expect(customEma.slowPeriod).toBe(15);
  });
});

describe("codeExport - Multi-Platform Code Generation for all 17 strategies", () => {
  ALL_17_STRATEGIES.forEach((stratType) => {
    describe(`Strategy: ${stratType}`, () => {
      it("exports full bundle containing all 5 platforms", () => {
        const bundle = exportStrategyCode({
          type: stratType,
          symbol: "NVDA",
          timeframe: "4h",
        }) as StrategyExportBundle;

        expect(bundle.strategyType).toBe(stratType);
        expect(bundle.primarySymbol).toBe("NVDA");
        expect(bundle.timeframe).toBe("4h");
        expect(bundle.exports).toBeDefined();
        expect(bundle.exports.pine).toBeDefined();
        expect(bundle.exports.vectorbt).toBeDefined();
        expect(bundle.exports.nautilus).toBeDefined();
        expect(bundle.exports.qlib).toBeDefined();
        expect(bundle.exports.tensortrade).toBeDefined();
      });

      it("generates valid TradingView Pine Script v5 with entries, exits, and alert conditions", () => {
        const item = generatePineScript({
          type: stratType,
          symbol: "AAPL",
          timeframe: "1d",
        });

        expect(item.platform).toBe("pine");
        expect(item.language).toBe("pinescript");
        expect(item.code).toContain("//@version=5");
        expect(item.code).toContain("strategy(");
        expect(item.code).toContain("strategy.entry(");
        expect(item.code).toContain("strategy.close(");
        expect(item.code).not.toContain("alertcondition(");
        expect(item.code).toContain("alert(");
        expect(item.filename).toContain("AAPL");
        expect(item.filename.endsWith(".pine")).toBe(true);
      });

      it("generates valid Vectorbt Python script with signals and portfolio simulation", () => {
        const item = generateVectorbtScript({
          type: stratType,
          symbol: "MSFT",
          timeframe: "4h",
        });

        expect(item.platform).toBe("vectorbt");
        expect(item.language).toBe("python");
        expect(item.code).toContain("import vectorbt as vbt");
        expect(item.code).toContain("import pandas as pd");
        expect(item.code).toContain("import numpy as np");
        expect(item.code).toContain("vbt.Portfolio.from_signals");
        expect(item.code).toContain('def run_strategy_backtest');
        expect(item.filename).toContain("MSFT");
        expect(item.filename.endsWith("_vectorbt.py")).toBe(true);
      });

      it("generates valid NautilusTrader Strategy subclassing Strategy with on_bar and order_factory", () => {
        const item = generateNautilusStrategy({
          type: stratType,
          symbol: "TSLA",
          timeframe: "4h",
        });

        expect(item.platform).toBe("nautilus");
        expect(item.language).toBe("python");
        expect(item.code).toContain("from nautilus_trader.trading.strategy import Strategy");
        expect(item.code).toContain("from nautilus_trader.config import StrategyConfig");
        expect(item.code).toContain("def on_bar(self, bar: Bar) -> None:");
        expect(item.code).toContain("self.order_factory.market");
        expect(item.code).toContain("self.submit_order(order)");
        expect(item.filename).toContain("TSLA");
        expect(item.filename.endsWith("_nautilus.py")).toBe(true);
      });

      it("generates valid Microsoft Qlib Alpha Factor expression string", () => {
        const item = generateQlibFactor({
          type: stratType,
          symbol: "GOOGL",
          timeframe: "4h",
        });

        expect(item.platform).toBe("qlib");
        expect(item.language).toBe("text");
        expect(typeof item.code).toBe("string");
        expect(item.code.length).toBeGreaterThan(5);
        expect(item.filename).toContain("GOOGL");
        expect(item.filename.endsWith("_qlib.txt")).toBe(true);
      });

      it("generates valid TensorTrade RL training and discovery Python script", () => {
        const item = generateTensorTradeScript({
          type: stratType,
          symbol: "BTCUSDT",
          timeframe: "4h",
        });

        expect(item.platform).toBe("tensortrade");
        expect(item.language).toBe("python");
        expect(item.code).toContain("import tensortrade.env.default as default");
        expect(item.code).toContain("def create_tensortrade_env");
        expect(item.code).toContain("def discover_optimal_strategy");
        expect(item.filename).toContain("BTCUSDT");
        expect(item.filename.endsWith("_tensortrade.py")).toBe(true);
      });
    });
  });

  it("exports single platform when requested", () => {
    const pineItem = exportStrategyCode(
      { type: "supertrend", symbol: "BTCUSDT" },
      "pine"
    ) as ExportResultItem;
    expect(pineItem.platform).toBe("pine");
    expect(pineItem.code).toContain("//@version=5");

    const vbtItem = exportStrategyCode(
      { type: "supertrend", symbol: "BTCUSDT" },
      "vectorbt"
    ) as ExportResultItem;
    expect(vbtItem.platform).toBe("vectorbt");
    expect(vbtItem.code).toContain("import vectorbt as vbt");

    const nautilusItem = exportStrategyCode(
      { type: "supertrend", symbol: "BTCUSDT" },
      "nautilus"
    ) as ExportResultItem;
    expect(nautilusItem.platform).toBe("nautilus");
    expect(nautilusItem.code).toContain("class SupertrendStrategy(Strategy):");

    const qlibItem = exportStrategyCode(
      { type: "supertrend", symbol: "BTCUSDT" },
      "qlib"
    ) as ExportResultItem;
    expect(qlibItem.platform).toBe("qlib");
    expect(qlibItem.code).toContain("ATR(10)");

    const tensorItem = exportStrategyCode(
      { type: "supertrend", symbol: "BTCUSDT" },
      "tensortrade"
    ) as ExportResultItem;
    expect(tensorItem.platform).toBe("tensortrade");
    expect(tensorItem.code).toContain("import tensortrade.env.default as default");
  });

  it("reflects custom parameter values in generated scripts", () => {
    const pine = generatePineScript({
      type: "ema_crossover",
      params: { fastPeriod: 7, slowPeriod: 33 },
    });
    expect(pine.code).toContain("fastPeriod = input.int(7");
    expect(pine.code).toContain("slowPeriod = input.int(33");

    const vbt = generateVectorbtScript({
      type: "ema_crossover",
      params: { fastPeriod: 7, slowPeriod: 33 },
    });
    expect(vbt.code).toContain("span=7");
    expect(vbt.code).toContain("span=33");

    const nautilus = generateNautilusStrategy({
      type: "ema_crossover",
      params: { fastPeriod: 7, slowPeriod: 33 },
    });
    expect(nautilus.code).toContain("fast_period: int = 7");
    expect(nautilus.code).toContain("slow_period: int = 33");

    const qlib = generateQlibFactor({
      type: "ema_crossover",
      params: { fastPeriod: 7, slowPeriod: 33 },
    });
    expect(qlib.code).toBe("EMA($close, 7) / EMA($close, 33) - 1");
  });
});

describe("API Route: app/api/strategy/export/route.ts", () => {
  it("GET returns documentation & catalog when no query parameters provided", async () => {
    const req = new NextRequest("http://localhost:3000/api/strategy/export");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.supportedPlatforms).toContain("pine");
    expect(json.data.supportedPlatforms).toContain("vectorbt");
    expect(json.data.supportedPlatforms).toContain("nautilus");
    expect(json.data.supportedPlatforms).toContain("qlib");
    expect(json.data.supportedPlatforms).toContain("tensortrade");
    expect(json.data.supportedStrategies.length).toBe(17);
  });

  it("GET exports code for a strategy type query parameter", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/strategy/export?type=supertrend&platform=pine&symbol=AAPL"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.platform).toBe("pine");
    expect(json.data.code).toContain("//@version=5");
  });

  it("GET returns raw file attachment when format=raw is requested", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/strategy/export?type=supertrend&platform=pine&symbol=AAPL&format=raw"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("attachment; filename=");
    const text = await res.text();
    expect(text).toContain("//@version=5");
  });

  it("POST exports all platforms for direct strategy configuration", async () => {
    const req = new NextRequest("http://localhost:3000/api/strategy/export", {
      method: "POST",
      body: JSON.stringify({
        type: "order_block",
        symbol: "TSLA",
        timeframe: "4h",
        params: { lookback: 25, holdBars: 10 },
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.strategyType).toBe("order_block");
    expect(json.data.exports.pine.code).toContain("//@version=5");
    expect(json.data.exports.vectorbt.code).toContain("vectorbt");
    expect(json.data.exports.nautilus.code).toContain("OrderBlockStrategy");
    expect(json.data.exports.qlib.code).toContain("Min($low, 25)");
    expect(json.data.exports.tensortrade.code).toContain("import tensortrade.env.default as default");
  });

  it("POST returns 400 when invalid strategy type is passed", async () => {
    const req = new NextRequest("http://localhost:3000/api/strategy/export", {
      method: "POST",
      body: JSON.stringify({
        type: "invalid_strategy_type",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/Unsupported strategy type/);
  });

  it("POST returns 400 when type is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/strategy/export", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/Missing required field/);
  });
});
