/**
 * OpenStock Multi-Platform Strategy Code Generator Module
 * Converts backtested algorithmic strategies into production-grade code for:
 * 1. TradingView Pine Script v5 (@version=5 strategy(...)) with indicators, entries, exits, alerts
 * 2. Python Vectorbt / Pandas script ready to run backtests locally
 * 3. NautilusTrader Python strategy class subclassing nautilus_trader.trading.strategy.Strategy
 * 4. Microsoft Qlib Alpha Factor expression string
 *
 * Supported strategy types (16):
 * - supertrend
 * - fair_value_gap
 * - order_block
 * - liquidity_sweep
 * - ema_crossover (alias: ema_cross)
 * - rsi_oversold (aliases: rsi_pullback, rsi_rev)
 * - breakout (aliases: donchian, vol_breakout)
 * - hma_trend
 * - adx_trend
 * - stoch_rsi
 * - zscore_rev
 * - bb_rev
 * - keltner
 * - macd_cross
 * - overnight
 * - sma_golden (alias: golden_cross)
 */

export type SupportedStrategyType =
  | "supertrend"
  | "fair_value_gap"
  | "order_block"
  | "liquidity_sweep"
  | "ema_crossover"
  | "rsi_oversold"
  | "breakout"
  | "hma_trend"
  | "adx_trend"
  | "stoch_rsi"
  | "zscore_rev"
  | "bb_rev"
  | "keltner"
  | "macd_cross"
  | "overnight"
  | "sma_golden";

export type ExportPlatform = "pine" | "vectorbt" | "nautilus" | "qlib" | "all";

export interface StrategyExportOptions {
  type: string;
  params?: Record<string, number>;
  symbol?: string;
  symbols?: string[];
  timeframe?: string;
  initialCapital?: number;
  stopLossPct?: number;
  takeProfitPct?: number;
  exchange?: string;
  author?: string;
}

export interface ExportResultItem {
  platform: "pine" | "vectorbt" | "nautilus" | "qlib";
  code: string;
  filename: string;
  language: "pinescript" | "python" | "text";
  mimeType: string;
  description: string;
}

export interface StrategyExportBundle {
  strategyType: string;
  normalizedType: SupportedStrategyType;
  name: string;
  symbols: string[];
  primarySymbol: string;
  timeframe: string;
  params: Record<string, number>;
  exports: {
    pine: ExportResultItem;
    vectorbt: ExportResultItem;
    nautilus: ExportResultItem;
    qlib: ExportResultItem;
  };
}

export interface StrategyMetadata {
  type: SupportedStrategyType;
  name: string;
  description: string;
  isOverlay: boolean;
  defaultParams: Record<string, number>;
  aliases: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategy Registry & Metadata
// ─────────────────────────────────────────────────────────────────────────────

export const STRATEGY_DEFINITIONS: Record<SupportedStrategyType, StrategyMetadata> = {
  supertrend: {
    type: "supertrend",
    name: "Supertrend ATR Volatility Trend",
    description: "Follows market trend using dynamic Average True Range (ATR) upper and lower bands.",
    isOverlay: true,
    defaultParams: { atrPeriod: 10, multiplier: 3.0 },
    aliases: ["super_trend", "supertrend_atr"],
  },
  fair_value_gap: {
    type: "fair_value_gap",
    name: "ICT Fair Value Gap (FVG) Imbalance Retest",
    description: "Detects 3-bar price imbalances and enters on Consequent Encroachment (50% midpoint) retests.",
    isOverlay: true,
    defaultParams: { minGapPct: 0.3, holdBars: 8, lookback: 30 },
    aliases: ["fvg", "smart_money_fvg"],
  },
  order_block: {
    type: "order_block",
    name: "Smart Money Concepts: Order Block Retest",
    description: "Identifies institutional origin candles prior to swing breakouts and enters on mitigation retests.",
    isOverlay: true,
    defaultParams: { lookback: 20, holdBars: 8, targetPct: 3.0 },
    aliases: ["ob", "orderblock", "smc_ob"],
  },
  liquidity_sweep: {
    type: "liquidity_sweep",
    name: "Liquidity Sweep & Volume Reclaim (Spring/Upthrust)",
    description: "Enters when price pierces rolling highs/lows to grab stop liquidity then aggressively closes back inside with volume confirmation.",
    isOverlay: true,
    defaultParams: { lookback: 20, volMultiplier: 1.2, holdBars: 6 },
    aliases: ["sweep", "turtle_soup", "liquidity_grab"],
  },
  ema_crossover: {
    type: "ema_crossover",
    name: "Exponential Moving Average (EMA) Trend Cross",
    description: "Captures momentum shifts when a fast exponential moving average crosses above or below a slow EMA.",
    isOverlay: true,
    defaultParams: { fastPeriod: 9, slowPeriod: 21 },
    aliases: ["ema_cross", "dual_ema", "ema"],
  },
  rsi_oversold: {
    type: "rsi_oversold",
    name: "RSI Mean Reversion & Pullback",
    description: "Enters long on oversold momentum contractions and exits when momentum normalizes to the midline or overbought zone.",
    isOverlay: false,
    defaultParams: { period: 14, oversold: 30, overbought: 70 },
    aliases: ["rsi", "rsi_pullback", "rsi_rev"],
  },
  breakout: {
    type: "breakout",
    name: "Donchian Channel Range Breakout (Turtle Trading)",
    description: "Enters trend expansions when close breaks above the N-bar highest high, exiting on N-bar lowest low.",
    isOverlay: true,
    defaultParams: { lookback: 20, exitLookback: 10 },
    aliases: ["donchian", "vol_breakout", "channel_breakout"],
  },
  hma_trend: {
    type: "hma_trend",
    name: "Hull Moving Average (HMA) Ultra-Fast Trend",
    description: "Leverages weighted moving averages to virtually eliminate lag while maintaining smooth curve filtering for rapid trend identification.",
    isOverlay: true,
    defaultParams: { fastPeriod: 9, slowPeriod: 21 },
    aliases: ["hma", "hull_ma", "hull_trend"],
  },
  adx_trend: {
    type: "adx_trend",
    name: "ADX & Directional Movement System (DMI)",
    description: "Filters trades by trend strength (ADX >= threshold) and enters based on Directional Indicators (+DI > -DI).",
    isOverlay: false,
    defaultParams: { period: 14, minStrength: 25 },
    aliases: ["adx", "dmi", "adx_momentum"],
  },
  stoch_rsi: {
    type: "stoch_rsi",
    name: "Stochastic RSI Momentum Swing",
    description: "Combines Stochastic oscillator and Relative Strength Index for precision swing timing in oversold/overbought extremes.",
    isOverlay: false,
    defaultParams: { period: 14, smoothK: 3, smoothD: 3, oversoldK: 20 },
    aliases: ["stochrsi", "stochastic_rsi"],
  },
  zscore_rev: {
    type: "zscore_rev",
    name: "Z-Score Statistical Mean Reversion",
    description: "Identifies statistical deviations from rolling moving averages and enters when price exceeds standard deviation bands.",
    isOverlay: false,
    defaultParams: { lookback: 20, threshold: -2.0 },
    aliases: ["zscore", "z_score", "z_score_rev"],
  },
  bb_rev: {
    type: "bb_rev",
    name: "Bollinger Bands Mean Reversion",
    description: "Triggers counter-trend entries when price breaches outer standard deviation bands and exits at the 20-period SMA midline.",
    isOverlay: true,
    defaultParams: { window: 20, stdDev: 2.0 },
    aliases: ["bollinger", "bollinger_bands", "bb"],
  },
  keltner: {
    type: "keltner",
    name: "Keltner Channel Reversion (EMA + ATR)",
    description: "Utilizes an exponential moving average centerline with volatility envelope bands derived from Average True Range.",
    isOverlay: true,
    defaultParams: { period: 20, multiplier: 1.5 },
    aliases: ["keltner_channel", "keltner_channels", "kc"],
  },
  macd_cross: {
    type: "macd_cross",
    name: "Moving Average Convergence Divergence (MACD) Cross",
    description: "Trades momentum shifts when the MACD differential line crosses the 9-period exponential signal line.",
    isOverlay: false,
    defaultParams: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
    aliases: ["macd", "macd_crossover"],
  },
  overnight: {
    type: "overnight",
    name: "Overnight Gap Drift (Close-to-Open)",
    description: "Exploits the empirical overnight anomaly by holding positions from regular trading hours close to next day open.",
    isOverlay: true,
    defaultParams: {},
    aliases: ["overnight_drift", "overnight_gap", "close_to_open"],
  },
  sma_golden: {
    type: "sma_golden",
    name: "Dual SMA Golden / Death Cross",
    description: "Classic institutional macro trend strategy entering on Golden Cross (50 SMA > 200 SMA) and exiting on Death Cross.",
    isOverlay: true,
    defaultParams: { fastPeriod: 50, slowPeriod: 200 },
    aliases: ["golden_cross", "sma_cross", "dual_sma"],
  },
};

/**
 * Normalizes input strategy type string to canonical SupportedStrategyType.
 */
export function normalizeStrategyType(rawType: string): SupportedStrategyType {
  const clean = (rawType || "").toLowerCase().trim().replace(/-/g, "_");
  if (clean in STRATEGY_DEFINITIONS) {
    return clean as SupportedStrategyType;
  }

  for (const [key, def] of Object.entries(STRATEGY_DEFINITIONS)) {
    if (def.aliases.includes(clean)) {
      return key as SupportedStrategyType;
    }
  }

  throw new Error(
    `Unsupported strategy type: "${rawType}". Supported types: ${Object.keys(STRATEGY_DEFINITIONS).join(", ")}`
  );
}

/**
 * Merges user parameters with strategy defaults and standard parameter aliases.
 */
export function resolveParams(
  type: SupportedStrategyType,
  userParams?: Record<string, number>
): Record<string, number> {
  const def = STRATEGY_DEFINITIONS[type];
  const merged: Record<string, number> = { ...def.defaultParams };
  if (!userParams) return merged;

  // Handle common cross-system alias parameter mappings
  const p = userParams;

  switch (type) {
    case "supertrend":
      if (p.atrPeriod !== undefined) merged.atrPeriod = p.atrPeriod;
      else if (p.p1 !== undefined) merged.atrPeriod = p.p1;
      else if (p.period !== undefined) merged.atrPeriod = p.period;

      if (p.multiplier !== undefined) merged.multiplier = p.multiplier;
      else if (p.p2 !== undefined) merged.multiplier = p.p2 > 10 ? p.p2 / 10 : p.p2;
      break;

    case "fair_value_gap":
      if (p.minGapPct !== undefined) merged.minGapPct = p.minGapPct;
      else if (p.gapPct !== undefined) merged.minGapPct = p.gapPct;
      else if (p.p1 !== undefined) merged.minGapPct = p.p1;

      if (p.holdBars !== undefined) merged.holdBars = p.holdBars;
      else if (p.p2 !== undefined) merged.holdBars = p.p2;
      break;

    case "order_block":
    case "liquidity_sweep":
      if (p.lookback !== undefined) merged.lookback = p.lookback;
      else if (p.period !== undefined) merged.lookback = p.period;
      else if (p.p1 !== undefined) merged.lookback = p.p1;

      if (type === "liquidity_sweep") {
        if (p.volMultiplier !== undefined) merged.volMultiplier = p.volMultiplier;
        else if (p.p2 !== undefined) merged.volMultiplier = p.p2 > 10 ? p.p2 / 10 : p.p2;
      }
      if (p.holdBars !== undefined) merged.holdBars = p.holdBars;
      break;

    case "ema_crossover":
    case "hma_trend":
      if (p.fastPeriod !== undefined) merged.fastPeriod = p.fastPeriod;
      else if (p.fast !== undefined) merged.fastPeriod = p.fast;
      else if (p.p1 !== undefined) merged.fastPeriod = p.p1;

      if (p.slowPeriod !== undefined) merged.slowPeriod = p.slowPeriod;
      else if (p.slow !== undefined) merged.slowPeriod = p.slow;
      else if (p.p2 !== undefined) merged.slowPeriod = p.p2;
      break;

    case "rsi_oversold":
      if (p.period !== undefined) merged.period = p.period;
      else if (p.rsiPeriod !== undefined) merged.period = p.rsiPeriod;
      else if (p.p1 !== undefined) merged.period = p.p1;

      if (p.oversold !== undefined) merged.oversold = p.oversold;
      else if (p.oversoldThreshold !== undefined) merged.oversold = p.oversoldThreshold;
      else if (p.p2 !== undefined) merged.oversold = p.p2;

      if (p.overbought !== undefined) merged.overbought = p.overbought;
      else if (p.overboughtThreshold !== undefined) merged.overbought = p.overboughtThreshold;
      break;

    case "breakout":
      if (p.lookback !== undefined) merged.lookback = p.lookback;
      else if (p.period !== undefined) merged.lookback = p.period;
      else if (p.p1 !== undefined) merged.lookback = p.p1;

      if (p.exitLookback !== undefined) merged.exitLookback = p.exitLookback;
      else if (p.p2 !== undefined) merged.exitLookback = p.p2;
      break;

    case "adx_trend":
      if (p.period !== undefined) merged.period = p.period;
      else if (p.p1 !== undefined) merged.period = p.p1;

      if (p.minStrength !== undefined) merged.minStrength = p.minStrength;
      else if (p.adxThreshold !== undefined) merged.minStrength = p.adxThreshold;
      else if (p.p2 !== undefined) merged.minStrength = p.p2;
      break;

    case "stoch_rsi":
      if (p.period !== undefined) merged.period = p.period;
      else if (p.p1 !== undefined) merged.period = p.p1;

      if (p.oversoldK !== undefined) merged.oversoldK = p.oversoldK;
      else if (p.p2 !== undefined) merged.oversoldK = p.p2;
      break;

    case "zscore_rev":
      if (p.lookback !== undefined) merged.lookback = p.lookback;
      else if (p.p1 !== undefined) merged.lookback = p.p1;

      if (p.threshold !== undefined) merged.threshold = p.threshold;
      else if (p.p2 !== undefined) merged.threshold = p.p2 > 0 ? -p.p2 / 10 : p.p2;
      break;

    case "bb_rev":
      if (p.window !== undefined) merged.window = p.window;
      else if (p.period !== undefined) merged.window = p.period;
      else if (p.p1 !== undefined) merged.window = p.p1;

      if (p.stdDev !== undefined) merged.stdDev = p.stdDev;
      else if (p.p2 !== undefined) merged.stdDev = p.p2 > 10 ? p.p2 / 10 : p.p2;
      break;

    case "keltner":
      if (p.period !== undefined) merged.period = p.period;
      else if (p.p1 !== undefined) merged.period = p.p1;

      if (p.multiplier !== undefined) merged.multiplier = p.multiplier;
      else if (p.p2 !== undefined) merged.multiplier = p.p2 > 10 ? p.p2 / 10 : p.p2;
      break;

    case "macd_cross":
      if (p.fastPeriod !== undefined) merged.fastPeriod = p.fastPeriod;
      else if (p.p1 !== undefined) merged.fastPeriod = p.p1;

      if (p.slowPeriod !== undefined) merged.slowPeriod = p.slowPeriod;
      else if (p.p2 !== undefined) merged.slowPeriod = p.p2;

      if (p.signalPeriod !== undefined) merged.signalPeriod = p.signalPeriod;
      break;

    case "sma_golden":
      if (p.fastPeriod !== undefined) merged.fastPeriod = p.fastPeriod;
      else if (p.p1 !== undefined) merged.fastPeriod = p.p1;

      if (p.slowPeriod !== undefined) merged.slowPeriod = p.slowPeriod;
      else if (p.p2 !== undefined) merged.slowPeriod = p.p2;
      break;

    default:
      Object.assign(merged, userParams);
      break;
  }

  return merged;
}

export function getSupportedStrategies(): StrategyMetadata[] {
  return Object.values(STRATEGY_DEFINITIONS);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. TradingView Pine Script v5 Generator
// ─────────────────────────────────────────────────────────────────────────────

export function generatePineScript(options: StrategyExportOptions): ExportResultItem {
  const normType = normalizeStrategyType(options.type);
  const def = STRATEGY_DEFINITIONS[normType];
  const params = resolveParams(normType, options.params);
  const symbol = (options.symbol || options.symbols?.[0] || "AAPL").toUpperCase();
  const capital = options.initialCapital || 100000;
  const timeframe = options.timeframe || "4h";
  const title = `${def.name} Strategy [OpenStock]`;

  let inputsBlock = "";
  let indicatorBlock = "";
  let conditionsBlock = "";
  let plotsBlock = "";

  switch (normType) {
    case "supertrend": {
      const atrP = params.atrPeriod ?? 10;
      const mult = params.multiplier ?? 3.0;
      inputsBlock = `atrPeriod = input.int(${atrP}, "ATR Period", minval=1)\nmultiplier = input.float(${mult.toFixed(1)}, "ATR Multiplier", minval=0.1, step=0.1)`;
      indicatorBlock = `[superTrend, direction] = ta.supertrend(multiplier, atrPeriod)`;
      plotsBlock = `upTrend = direction < 0\ndownTrend = direction > 0\nplot(upTrend ? superTrend : na, "Up Trend", color=color.new(color.green, 0), style=plot.style_linebr, linewidth=2)\nplot(downTrend ? superTrend : na, "Down Trend", color=color.new(color.red, 0), style=plot.style_linebr, linewidth=2)`;
      conditionsBlock = `longCondition = ta.crossover(close, superTrend)\nexitCondition = ta.crossunder(close, superTrend)`;
      break;
    }

    case "fair_value_gap": {
      const gapPct = params.minGapPct ?? 0.3;
      const hold = params.holdBars ?? 8;
      const lookback = params.lookback ?? 30;
      inputsBlock = `minGapPct = input.float(${gapPct.toFixed(2)}, "Min Gap %", minval=0.05, step=0.05)\nholdBars = input.int(${hold}, "Max Hold Bars", minval=1)\nlookback = input.int(${lookback}, "Zone Expiry Bars", minval=5)`;
      indicatorBlock = `// 3-Bar Imbalance Detection\nbullFvg = low > high[2] and ((low - high[2]) / high[2] * 100) >= minGapPct\nbearFvg = high < low[2] and ((low[2] - high) / low[2] * 100) >= minGapPct\n\nvar float fvgCe = na\nvar float fvgBottom = na\nvar float fvgTop = na\nvar int fvgBar = 0\n\nif bullFvg\n    fvgTop := low\n    fvgBottom := high[2]\n    fvgCe := (low + high[2]) / 2.0\n    fvgBar := bar_index`;
      plotsBlock = `plot(fvgCe, "FVG Consequent Encroachment (50%)", color=color.new(color.teal, 30), style=plot.style_circles)\nplot(fvgBottom, "FVG Bottom Support", color=color.new(color.green, 60))\nplot(fvgTop, "FVG Top", color=color.new(color.blue, 60))`;
      conditionsBlock = `var int entryBar = 0\nzoneValid = not na(fvgCe) and (bar_index - fvgBar <= lookback)\nlongCondition = zoneValid and (low <= fvgCe) and (close > fvgBottom)\n\nif longCondition\n    entryBar := bar_index\n    fvgCe := na // Consumed\n\nexitCondition = strategy.position_size > 0 and ((bar_index - entryBar >= holdBars) or (close >= fvgTop * 1.025))`;
      break;
    }

    case "order_block": {
      const lookback = params.lookback ?? 20;
      const hold = params.holdBars ?? 8;
      const targetPct = params.targetPct ?? 3.0;
      inputsBlock = `lookback = input.int(${lookback}, "Swing Lookback", minval=5)\nholdBars = input.int(${hold}, "Max Hold Bars", minval=1)\ntargetPct = input.float(${targetPct.toFixed(1)}, "Profit Target %", minval=0.5, step=0.5)`;
      indicatorBlock = `priorHigh = ta.highest(high[1], lookback)\npriorLow = ta.lowest(low[1], lookback)\nbreakout = ta.crossover(close, priorHigh)\n\nvar float obTop = na\nvar float obBottom = na\nvar int obBar = 0\n\nif breakout\n    for k = 1 to 6\n        if close[k] < open[k]\n            obTop := high[k]\n            obBottom := low[k]\n            obBar := bar_index\n            break`;
      plotsBlock = `plot(priorHigh, "Swing High Breakout Level", color=color.new(color.orange, 40))\nplot(obTop, "Bullish OB Top", color=color.new(color.blue, 20))\nplot(obBottom, "Bullish OB Bottom", color=color.new(color.purple, 20))`;
      conditionsBlock = `var int entryBar = 0\nzoneActive = not na(obTop) and (bar_index - obBar <= 30)\nlongCondition = zoneActive and (low <= obTop) and (close >= obBottom)\n\nif longCondition\n    entryBar := bar_index\n    obTop := na\n\nexitCondition = strategy.position_size > 0 and ((bar_index - entryBar >= holdBars) or (close >= strategy.position_avg_price * (1 + targetPct / 100)))`;
      break;
    }

    case "liquidity_sweep": {
      const lookback = params.lookback ?? 20;
      const volMult = params.volMultiplier ?? 1.2;
      const hold = params.holdBars ?? 6;
      inputsBlock = `lookback = input.int(${lookback}, "Swing Range Lookback", minval=5)\nvolMultiplier = input.float(${volMult.toFixed(1)}, "Volume Surge Multiplier", minval=1.0, step=0.1)\nholdBars = input.int(${hold}, "Max Hold Bars", minval=1)`;
      indicatorBlock = `priorLow = ta.lowest(low[1], lookback)\npriorHigh = ta.highest(high[1], lookback)\navgVol = ta.sma(volume, lookback)\nhasVolSurge = volume >= avgVol * volMultiplier\nswingMidpoint = (priorHigh + priorLow) / 2.0`;
      plotsBlock = `plot(priorLow, "Liquidity Low Trigger", color=color.new(color.red, 20), style=plot.style_linebr)\nplot(priorHigh, "Liquidity High Range", color=color.new(color.green, 20), style=plot.style_linebr)\nplot(swingMidpoint, "Target Midpoint (50%)", color=color.new(color.yellow, 40))`;
      conditionsBlock = `// Bullish Spring: Pierces below range low, reclaims, and closes above with volume spike\nvar int entryBar = 0\nlongCondition = (low < priorLow) and (close > priorLow) and hasVolSurge\n\nif longCondition\n    entryBar := bar_index\n\nexitCondition = strategy.position_size > 0 and ((close >= swingMidpoint) or (bar_index - entryBar >= holdBars))`;
      break;
    }

    case "ema_crossover": {
      const fastP = params.fastPeriod ?? 9;
      const slowP = params.slowPeriod ?? 21;
      inputsBlock = `fastPeriod = input.int(${fastP}, "Fast EMA Period", minval=1)\nslowPeriod = input.int(${slowP}, "Slow EMA Period", minval=1)`;
      indicatorBlock = `fastEma = ta.ema(close, fastPeriod)\nslowEma = ta.ema(close, slowPeriod)`;
      plotsBlock = `plot(fastEma, "Fast EMA", color=color.new(color.green, 0), linewidth=2)\nplot(slowEma, "Slow EMA", color=color.new(color.red, 0), linewidth=2)`;
      conditionsBlock = `longCondition = ta.crossover(fastEma, slowEma)\nexitCondition = ta.crossunder(fastEma, slowEma)`;
      break;
    }

    case "rsi_oversold": {
      const period = params.period ?? 14;
      const oversold = params.oversold ?? 30;
      const overbought = params.overbought ?? 70;
      inputsBlock = `period = input.int(${period}, "RSI Period", minval=1)\noversold = input.float(${oversold}, "Oversold Level", minval=5, maxval=50)\noverbought = input.float(${overbought}, "Overbought Level", minval=50, maxval=95)`;
      indicatorBlock = `rsiVal = ta.rsi(close, period)`;
      plotsBlock = `plot(rsiVal, "RSI", color=color.new(color.purple, 0), linewidth=2)\nhline(oversold, "Oversold", color=color.green, linestyle=hline.style_dashed)\nhline(50, "Midline", color=color.gray, linestyle=hline.style_dotted)\nhline(overbought, "Overbought", color=color.red, linestyle=hline.style_dashed)`;
      conditionsBlock = `longCondition = ta.crossover(rsiVal, oversold)\nexitCondition = ta.crossunder(rsiVal, overbought) or (rsiVal >= 50 and ta.crossunder(close, ta.ema(close, 20)))`;
      break;
    }

    case "breakout": {
      const lookback = params.lookback ?? 20;
      const exitLookback = params.exitLookback ?? 10;
      inputsBlock = `lookback = input.int(${lookback}, "Breakout Lookback", minval=2)\nexitLookback = input.int(${exitLookback}, "Trailing Exit Lookback", minval=2)`;
      indicatorBlock = `highestHigh = ta.highest(high[1], lookback)\nlowestLow = ta.lowest(low[1], exitLookback)`;
      plotsBlock = `plot(highestHigh, "Channel High", color=color.new(color.teal, 0), linewidth=2)\nplot(lowestLow, "Channel Low", color=color.new(color.maroon, 0), linewidth=2)`;
      conditionsBlock = `longCondition = ta.crossover(close, highestHigh)\nexitCondition = ta.crossunder(close, lowestLow)`;
      break;
    }

    case "hma_trend": {
      const fastP = params.fastPeriod ?? 9;
      const slowP = params.slowPeriod ?? 21;
      inputsBlock = `fastPeriod = input.int(${fastP}, "Fast HMA Period", minval=2)\nslowPeriod = input.int(${slowP}, "Slow HMA Period", minval=4)`;
      indicatorBlock = `hmaFast = ta.hma(close, fastPeriod)\nhmaSlow = ta.hma(close, slowPeriod)`;
      plotsBlock = `plot(hmaFast, "Fast HMA", color=color.new(color.blue, 0), linewidth=2)\nplot(hmaSlow, "Slow HMA", color=color.new(color.orange, 0), linewidth=2)`;
      conditionsBlock = `longCondition = ta.crossover(hmaFast, hmaSlow)\nexitCondition = ta.crossunder(hmaFast, hmaSlow)`;
      break;
    }

    case "adx_trend": {
      const period = params.period ?? 14;
      const minStrength = params.minStrength ?? 25;
      inputsBlock = `period = input.int(${period}, "ADX / DI Period", minval=1)\nminStrength = input.float(${minStrength}, "Min ADX Trend Strength", minval=10, maxval=60)`;
      indicatorBlock = `[plusDI, minusDI, adxVal] = ta.dmi(period, period)`;
      plotsBlock = `plot(adxVal, "ADX Trend Strength", color=color.new(color.white, 0), linewidth=2)\nplot(plusDI, "+DI Bullish", color=color.new(color.green, 0))\nplot(minusDI, "-DI Bearish", color=color.new(color.red, 0))\nhline(minStrength, "Threshold", color=color.yellow, linestyle=hline.style_dashed)`;
      conditionsBlock = `longCondition = (plusDI > minusDI) and (adxVal >= minStrength) and ta.crossover(plusDI, minusDI)\nexitCondition = (plusDI < minusDI) or (adxVal < minStrength)`;
      break;
    }

    case "stoch_rsi": {
      const period = params.period ?? 14;
      const smoothK = params.smoothK ?? 3;
      const smoothD = params.smoothD ?? 3;
      const oversoldK = params.oversoldK ?? 20;
      inputsBlock = `period = input.int(${period}, "RSI Length", minval=1)\nsmoothK = input.int(${smoothK}, "K Smoothing", minval=1)\nsmoothD = input.int(${smoothD}, "D Smoothing", minval=1)\noversoldK = input.float(${oversoldK}, "Oversold %K", minval=5, maxval=40)`;
      indicatorBlock = `rsiVal = ta.rsi(close, period)\nstochRsi = ta.stoch(rsiVal, rsiVal, rsiVal, period)\nk = ta.sma(stochRsi, smoothK)\nd = ta.sma(k, smoothD)`;
      plotsBlock = `plot(k, "%K Line", color=color.new(color.blue, 0), linewidth=2)\nplot(d, "%D Line", color=color.new(color.orange, 0), linewidth=2)\nhline(oversoldK, "Oversold", color=color.green, linestyle=hline.style_dashed)\nhline(80, "Overbought", color=color.red, linestyle=hline.style_dashed)`;
      conditionsBlock = `longCondition = (k < oversoldK) and ta.crossover(k, d)\nexitCondition = (k > 80) and ta.crossunder(k, d)`;
      break;
    }

    case "zscore_rev": {
      const lookback = params.lookback ?? 20;
      const threshold = params.threshold ?? -2.0;
      inputsBlock = `lookback = input.int(${lookback}, "Lookback Window", minval=5)\nthreshold = input.float(${threshold.toFixed(2)}, "Entry Z-Score (Sigma)", maxval=0, step=0.1)`;
      indicatorBlock = `smaVal = ta.sma(close, lookback)\nstdVal = ta.stdev(close, lookback)\nzscore = (close - smaVal) / (stdVal > 0 ? stdVal : 1e-9)`;
      plotsBlock = `plot(zscore, "Z-Score", color=color.new(color.fuchsia, 0), linewidth=2)\nhline(threshold, "Entry Level", color=color.green, linestyle=hline.style_solid)\nhline(0.0, "Mean Midline", color=color.gray, linestyle=hline.style_dotted)\nhline(-threshold, "Overextended", color=color.red, linestyle=hline.style_dashed)`;
      conditionsBlock = `longCondition = zscore <= threshold\nexitCondition = zscore >= 0.0`;
      break;
    }

    case "bb_rev": {
      const win = params.window ?? 20;
      const dev = params.stdDev ?? 2.0;
      inputsBlock = `window = input.int(${win}, "SMA Period", minval=5)\nstdDev = input.float(${dev.toFixed(1)}, "StdDev Multiplier", minval=0.5, step=0.1)`;
      indicatorBlock = `[mid, upper, lower] = ta.bb(close, window, stdDev)`;
      plotsBlock = `plot(upper, "Upper Band", color=color.new(color.red, 30))\nplot(mid, "Middle SMA", color=color.new(color.blue, 40))\nplot(lower, "Lower Band", color=color.new(color.green, 30))`;
      conditionsBlock = `longCondition = ta.crossunder(close, lower)\nexitCondition = ta.crossover(close, mid)`;
      break;
    }

    case "keltner": {
      const period = params.period ?? 20;
      const mult = params.multiplier ?? 1.5;
      inputsBlock = `period = input.int(${period}, "EMA Period", minval=5)\nmultiplier = input.float(${mult.toFixed(1)}, "ATR Multiplier", minval=0.5, step=0.1)`;
      indicatorBlock = `basis = ta.ema(close, period)\nspan = ta.atr(period)\nupper = basis + multiplier * span\nlower = basis - multiplier * span`;
      plotsBlock = `plot(upper, "Keltner Upper", color=color.new(color.red, 20))\nplot(basis, "Keltner Basis (EMA)", color=color.new(color.gray, 20))\nplot(lower, "Keltner Lower", color=color.new(color.green, 20))`;
      conditionsBlock = `longCondition = ta.crossunder(close, lower)\nexitCondition = ta.crossover(close, basis)`;
      break;
    }

    case "macd_cross": {
      const fastP = params.fastPeriod ?? 12;
      const slowP = params.slowPeriod ?? 26;
      const sigP = params.signalPeriod ?? 9;
      inputsBlock = `fastPeriod = input.int(${fastP}, "Fast EMA", minval=1)\nslowPeriod = input.int(${slowP}, "Slow EMA", minval=1)\nsignalPeriod = input.int(${sigP}, "Signal EMA", minval=1)`;
      indicatorBlock = `[macdLine, signalLine, hist] = ta.macd(close, fastPeriod, slowPeriod, signalPeriod)`;
      plotsBlock = `plot(macdLine, "MACD Line", color=color.new(color.blue, 0), linewidth=2)\nplot(signalLine, "Signal Line", color=color.new(color.orange, 0), linewidth=2)\nplot(hist, "Histogram", color=hist >= 0 ? (hist[1] < hist ? color.green : color.lime) : (hist[1] < hist ? color.maroon : color.red), style=plot.style_columns)`;
      conditionsBlock = `longCondition = ta.crossover(macdLine, signalLine)\nexitCondition = ta.crossunder(macdLine, signalLine)`;
      break;
    }

    case "overnight": {
      inputsBlock = `// Overnight gap anomaly holds from session close to next open`;
      indicatorBlock = `isSessionClose = session.islastbar\nisSessionOpen = session.isfirstbar`;
      plotsBlock = `bgcolor(isSessionClose ? color.new(color.blue, 85) : na, title="Close Entry")\nbgcolor(isSessionOpen ? color.new(color.orange, 85) : na, title="Open Exit")`;
      conditionsBlock = `longCondition = isSessionClose\nexitCondition = isSessionOpen`;
      break;
    }

    case "sma_golden": {
      const fastP = params.fastPeriod ?? 50;
      const slowP = params.slowPeriod ?? 200;
      inputsBlock = `fastPeriod = input.int(${fastP}, "Fast SMA Period", minval=5)\nslowPeriod = input.int(${slowP}, "Slow SMA Period", minval=20)`;
      indicatorBlock = `smaFast = ta.sma(close, fastPeriod)\nsmaSlow = ta.sma(close, slowPeriod)`;
      plotsBlock = `plot(smaFast, "Fast SMA (${fastP})", color=color.new(color.green, 0), linewidth=2)\nplot(smaSlow, "Slow SMA (${slowP})", color=color.new(color.red, 0), linewidth=3)`;
      conditionsBlock = `longCondition = ta.crossover(smaFast, smaSlow)\nexitCondition = ta.crossunder(smaFast, smaSlow)`;
      break;
    }
  }

  const pineScript = `//@version=5
strategy("${title}", overlay=${def.isOverlay}, default_qty_type=strategy.percent_of_equity, default_qty_value=100, initial_capital=${capital}, currency=currency.USD, commission_type=strategy.commission.percent, commission_value=0.1, max_bars_back=500)

// ── Parameters ──────────────────────────────────────────────────────────────
${inputsBlock}

// ── Indicators & Signals ────────────────────────────────────────────────────
${indicatorBlock}

// ── Visual Plots ────────────────────────────────────────────────────────────
${plotsBlock}

// ── Strategy Logic ──────────────────────────────────────────────────────────
${conditionsBlock}

if longCondition
    strategy.entry("Long", strategy.long)
    alert("OpenStock Long Entry: " + syminfo.ticker + " @ " + str.tostring(close), alert.freq_once_per_bar_close)

if exitCondition
    strategy.close("Long")
    alert("OpenStock Long Exit: " + syminfo.ticker + " @ " + str.tostring(close), alert.freq_once_per_bar_close)
`;

  return {
    platform: "pine",
    code: pineScript,
    filename: `${normType}_${symbol}_${timeframe}.pine`,
    language: "pinescript",
    mimeType: "text/x-pine",
    description: `TradingView Pine Script v5 strategy for ${def.name}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Python Vectorbt / Pandas Backtest Script Generator
// ─────────────────────────────────────────────────────────────────────────────

export function generateVectorbtScript(options: StrategyExportOptions): ExportResultItem {
  const normType = normalizeStrategyType(options.type);
  const def = STRATEGY_DEFINITIONS[normType];
  const params = resolveParams(normType, options.params);
  const symbol = (options.symbol || options.symbols?.[0] || "AAPL").toUpperCase();
  const capital = options.initialCapital || 100000;
  const timeframe = options.timeframe || "4h";

  let logicSnippet = "";

  switch (normType) {
    case "supertrend": {
      const p1 = params.atrPeriod ?? 10;
      const p2 = params.multiplier ?? 3.0;
      logicSnippet = `    # Supertrend ATR Calculation
    hl2 = (df['High'] + df['Low']) / 2.0
    tr = pd.concat([
        df['High'] - df['Low'],
        (df['High'] - df['Close'].shift(1)).abs(),
        (df['Low'] - df['Close'].shift(1)).abs()
    ], axis=1).max(axis=1)
    atr = tr.rolling(window=${p1}).mean()
    multiplier = ${p2}

    upperband = hl2 + multiplier * atr
    lowerband = hl2 - multiplier * atr

    direction = 1
    entries = pd.Series(False, index=df.index)
    exits = pd.Series(False, index=df.index)

    for i in range(1, len(df)):
        c_prev = df['Close'].iloc[i - 1]
        c_curr = df['Close'].iloc[i]
        u_prev = upperband.iloc[i - 1]
        l_prev = lowerband.iloc[i - 1]

        if c_prev > u_prev and direction != 1:
            direction = 1
            entries.iloc[i] = True
        elif c_prev < l_prev and direction != -1:
            direction = -1
            exits.iloc[i] = True`;
      break;
    }

    case "fair_value_gap": {
      const gapPct = params.minGapPct ?? 0.3;
      const hold = params.holdBars ?? 8;
      logicSnippet = `    # ICT Fair Value Gap (FVG) Retest Engine
    min_gap_pct = ${gapPct}
    hold_bars = ${hold}

    entries = pd.Series(False, index=df.index)
    exits = pd.Series(False, index=df.index)

    active_fvgs = []
    in_position = False
    bars_in_trade = 0
    target_price = 0.0

    for i in range(2, len(df)):
        bar0_h = df['High'].iloc[i - 2]
        bar2_l = df['Low'].iloc[i]

        # Detect Bullish FVG
        if bar2_l > bar0_h:
            gap = ((bar2_l - bar0_h) / bar0_h) * 100.0
            if gap >= min_gap_pct:
                active_fvgs.append({
                    'top': bar2_l,
                    'bottom': bar0_h,
                    'ce': (bar2_l + bar0_h) / 2.0,
                    'created_idx': i
                })

        curr_close = df['Close'].iloc[i]
        curr_low = df['Low'].iloc[i]

        if in_position:
            bars_in_trade += 1
            if curr_close >= target_price or bars_in_trade >= hold_bars:
                exits.iloc[i] = True
                in_position = False
        else:
            # Check retest of active FVG
            for idx in range(len(active_fvgs) - 1, -1, -1):
                fvg = active_fvgs[idx]
                if i - fvg['created_idx'] > 30:
                    active_fvgs.pop(idx)
                    continue
                if curr_low <= fvg['ce'] and curr_close > fvg['bottom']:
                    entries.iloc[i] = True
                    in_position = True
                    bars_in_trade = 0
                    target_price = fvg['top'] * 1.025
                    active_fvgs.pop(idx)
                    break`;
      break;
    }

    case "order_block": {
      const lookback = params.lookback ?? 20;
      const hold = params.holdBars ?? 8;
      logicSnippet = `    # Smart Money Concepts: Order Block Retest
    lookback = ${lookback}
    hold_bars = ${hold}

    entries = pd.Series(False, index=df.index)
    exits = pd.Series(False, index=df.index)

    active_obs = []
    in_pos = False
    bars_held = 0
    target_price = 0.0

    for i in range(lookback, len(df)):
        prior_high = df['High'].iloc[i-lookback:i].max()
        curr_close = df['Close'].iloc[i]
        curr_low = df['Low'].iloc[i]

        if curr_close > prior_high:
            for k in range(i - 1, max(0, i - 7), -1):
                if df['Close'].iloc[k] < df['Open'].iloc[k]:
                    active_obs.append({
                        'top': df['High'].iloc[k],
                        'bottom': df['Low'].iloc[k],
                        'idx': i
                    })
                    break

        if in_pos:
            bars_held += 1
            if curr_close >= target_price or bars_held >= hold_bars:
                exits.iloc[i] = True
                in_pos = False
        else:
            for idx in range(len(active_obs) - 1, -1, -1):
                ob = active_obs[idx]
                if i - ob['idx'] > 30:
                    active_obs.pop(idx)
                    continue
                if curr_low <= ob['top'] and curr_close >= ob['bottom']:
                    entries.iloc[i] = True
                    in_pos = True
                    bars_held = 0
                    target_price = curr_close * 1.03
                    active_obs.pop(idx)
                    break`;
      break;
    }

    case "liquidity_sweep": {
      const lookback = params.lookback ?? 20;
      const volMult = params.volMultiplier ?? 1.2;
      const hold = params.holdBars ?? 6;
      logicSnippet = `    # Liquidity Sweep & Volume Reclaim
    lookback = ${lookback}
    vol_mult = ${volMult}
    hold_bars = ${hold}

    prior_low = df['Low'].shift(1).rolling(window=lookback).min()
    prior_high = df['High'].shift(1).rolling(window=lookback).max()
    avg_vol = df['Volume'].shift(1).rolling(window=lookback).mean()
    vol_surge = df['Volume'] >= avg_vol * vol_mult

    midpoint = (prior_high + prior_low) / 2.0

    entries = pd.Series(False, index=df.index)
    exits = pd.Series(False, index=df.index)

    in_pos = False
    bars_held = 0

    for i in range(lookback + 1, len(df)):
        if in_pos:
            bars_held += 1
            if df['Close'].iloc[i] >= midpoint.iloc[i] or bars_held >= hold_bars:
                exits.iloc[i] = True
                in_pos = False
        else:
            if df['Low'].iloc[i] < prior_low.iloc[i] and df['Close'].iloc[i] > prior_low.iloc[i] and vol_surge.iloc[i]:
                entries.iloc[i] = True
                in_pos = True
                bars_held = 0`;
      break;
    }

    case "ema_crossover": {
      const fastP = params.fastPeriod ?? 9;
      const slowP = params.slowPeriod ?? 21;
      logicSnippet = `    # Dual EMA Crossover
    fast_ema = df['Close'].ewm(span=${fastP}, adjust=False).mean()
    slow_ema = df['Close'].ewm(span=${slowP}, adjust=False).mean()

    entries = (fast_ema > slow_ema) & (fast_ema.shift(1) <= slow_ema.shift(1))
    exits = (fast_ema < slow_ema) & (fast_ema.shift(1) >= slow_ema.shift(1))`;
      break;
    }

    case "rsi_oversold": {
      const period = params.period ?? 14;
      const oversold = params.oversold ?? 30;
      const overbought = params.overbought ?? 70;
      logicSnippet = `    # RSI Mean Reversion
    delta = df['Close'].diff()
    gain = delta.where(delta > 0, 0.0).rolling(${period}).mean()
    loss = (-delta.where(delta < 0, 0.0)).rolling(${period}).mean()
    rs = gain / (loss + 1e-9)
    rsi = 100.0 - (100.0 / (1.0 + rs))

    entries = (rsi < ${oversold}) & (rsi.shift(1) >= ${oversold})
    exits = (rsi > ${overbought}) & (rsi.shift(1) <= ${overbought})`;
      break;
    }

    case "breakout": {
      const lookback = params.lookback ?? 20;
      const exitLookback = params.exitLookback ?? 10;
      logicSnippet = `    # Donchian Breakout
    high_break = df['High'].shift(1).rolling(window=${lookback}).max()
    low_exit = df['Low'].shift(1).rolling(window=${exitLookback}).min()

    entries = (df['Close'] > high_break) & (df['Close'].shift(1) <= high_break.shift(1))
    exits = (df['Close'] < low_exit) & (df['Close'].shift(1) >= low_exit.shift(1))`;
      break;
    }

    case "hma_trend": {
      const fastP = params.fastPeriod ?? 9;
      const slowP = params.slowPeriod ?? 21;
      logicSnippet = `    # Hull Moving Average (HMA) Calculation
    def calc_wma(series, window):
        weights = np.arange(1, window + 1)
        return series.rolling(window).apply(lambda x: np.dot(x, weights) / weights.sum(), raw=True)

    def calc_hma(series, period):
        half_p = int(period / 2)
        sqrt_p = int(np.sqrt(period))
        diff = 2 * calc_wma(series, half_p) - calc_wma(series, period)
        return calc_wma(diff, sqrt_p)

    hma_fast = calc_hma(df['Close'], ${fastP})
    hma_slow = calc_hma(df['Close'], ${slowP})

    entries = (hma_fast > hma_slow) & (hma_fast.shift(1) <= hma_slow.shift(1))
    exits = (hma_fast < hma_slow) & (hma_fast.shift(1) >= hma_slow.shift(1))`;
      break;
    }

    case "adx_trend": {
      const period = params.period ?? 14;
      const minStrength = params.minStrength ?? 25;
      logicSnippet = `    # ADX and Directional Movement System
    tr = pd.concat([
        df['High'] - df['Low'],
        (df['High'] - df['Close'].shift(1)).abs(),
        (df['Low'] - df['Close'].shift(1)).abs()
    ], axis=1).max(axis=1)

    up_move = df['High'] - df['High'].shift(1)
    down_move = df['Low'].shift(1) - df['Low']
    plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
    minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)

    tr_smooth = pd.Series(tr).ewm(span=${period}, adjust=False).mean()
    p_di = 100.0 * (pd.Series(plus_dm, index=df.index).ewm(span=${period}, adjust=False).mean() / (tr_smooth + 1e-9))
    m_di = 100.0 * (pd.Series(minus_dm, index=df.index).ewm(span=${period}, adjust=False).mean() / (tr_smooth + 1e-9))
    dx = 100.0 * ((p_di - m_di).abs() / (p_di + m_di + 1e-9))
    adx = dx.ewm(span=${period}, adjust=False).mean()

    entries = (p_di > m_di) & (adx >= ${minStrength}) & (p_di.shift(1) <= m_di.shift(1))
    exits = (p_di < m_di) | (adx < ${minStrength})`;
      break;
    }

    case "stoch_rsi": {
      const period = params.period ?? 14;
      const smoothK = params.smoothK ?? 3;
      const smoothD = params.smoothD ?? 3;
      const oversoldK = params.oversoldK ?? 20;
      logicSnippet = `    # Stochastic RSI
    delta = df['Close'].diff()
    gain = delta.where(delta > 0, 0.0).rolling(${period}).mean()
    loss = (-delta.where(delta < 0, 0.0)).rolling(${period}).mean()
    rsi = 100.0 - (100.0 / (1.0 + (gain / (loss + 1e-9))))

    r_min = rsi.rolling(${period}).min()
    r_max = rsi.rolling(${period}).max()
    stoch_k = 100.0 * (rsi - r_min) / (r_max - r_min + 1e-9)
    k_line = stoch_k.rolling(${smoothK}).mean()
    d_line = k_line.rolling(${smoothD}).mean()

    entries = (k_line < ${oversoldK}) & (k_line > d_line) & (k_line.shift(1) <= d_line.shift(1))
    exits = (k_line > 80) & (k_line < d_line) & (k_line.shift(1) >= d_line.shift(1))`;
      break;
    }

    case "zscore_rev": {
      const lookback = params.lookback ?? 20;
      const threshold = params.threshold ?? -2.0;
      logicSnippet = `    # Z-Score Mean Reversion
    mean_val = df['Close'].rolling(window=${lookback}).mean()
    std_val = df['Close'].rolling(window=${lookback}).std()
    zscore = (df['Close'] - mean_val) / (std_val + 1e-9)

    entries = (zscore <= ${threshold}) & (zscore.shift(1) > ${threshold})
    exits = (zscore >= 0.0) & (zscore.shift(1) < 0.0)`;
      break;
    }

    case "bb_rev": {
      const win = params.window ?? 20;
      const dev = params.stdDev ?? 2.0;
      logicSnippet = `    # Bollinger Bands Reversion
    mid = df['Close'].rolling(window=${win}).mean()
    std = df['Close'].rolling(window=${win}).std()
    lower_band = mid - ${dev} * std

    entries = (df['Close'] < lower_band) & (df['Close'].shift(1) >= lower_band.shift(1))
    exits = (df['Close'] > mid) & (df['Close'].shift(1) <= mid.shift(1))`;
      break;
    }

    case "keltner": {
      const period = params.period ?? 20;
      const mult = params.multiplier ?? 1.5;
      logicSnippet = `    # Keltner Channel Reversion
    basis = df['Close'].ewm(span=${period}, adjust=False).mean()
    tr = pd.concat([
        df['High'] - df['Low'],
        (df['High'] - df['Close'].shift(1)).abs(),
        (df['Low'] - df['Close'].shift(1)).abs()
    ], axis=1).max(axis=1)
    atr = tr.rolling(window=${period}).mean()
    lower_band = basis - ${mult} * atr

    entries = (df['Close'] < lower_band) & (df['Close'].shift(1) >= lower_band.shift(1))
    exits = (df['Close'] > basis) & (df['Close'].shift(1) <= basis.shift(1))`;
      break;
    }

    case "macd_cross": {
      const fastP = params.fastPeriod ?? 12;
      const slowP = params.slowPeriod ?? 26;
      const sigP = params.signalPeriod ?? 9;
      logicSnippet = `    # MACD Crossover
    fast_ema = df['Close'].ewm(span=${fastP}, adjust=False).mean()
    slow_ema = df['Close'].ewm(span=${slowP}, adjust=False).mean()
    macd_line = fast_ema - slow_ema
    signal_line = macd_line.ewm(span=${sigP}, adjust=False).mean()

    entries = (macd_line > signal_line) & (macd_line.shift(1) <= signal_line.shift(1))
    exits = (macd_line < signal_line) & (macd_line.shift(1) >= signal_line.shift(1))`;
      break;
    }

    case "overnight": {
      logicSnippet = `    # Overnight Close-to-Open Gap Strategy
    # Long at daily close, exit at next session open
    entries = pd.Series(True, index=df.index)
    exits = pd.Series(True, index=df.index)`;
      break;
    }

    case "sma_golden": {
      const fastP = params.fastPeriod ?? 50;
      const slowP = params.slowPeriod ?? 200;
      logicSnippet = `    # Dual SMA Golden Cross
    fast_sma = df['Close'].rolling(window=${fastP}).mean()
    slow_sma = df['Close'].rolling(window=${slowP}).mean()

    entries = (fast_sma > slow_sma) & (fast_sma.shift(1) <= slow_sma.shift(1))
    exits = (fast_sma < slow_sma) & (fast_sma.shift(1) >= slow_sma.shift(1))`;
      break;
    }
  }

  const pythonScript = `"""
OpenStock Vectorbt Quantitative Strategy Backtest Engine
Strategy: ${def.name}
Symbol: ${symbol} | Timeframe: ${timeframe}
"""

import sys
import numpy as np
import pandas as pd

# Optional vectorbt import with clean fallback
try:
    import vectorbt as vbt
    HAS_VBT = True
except ImportError:
    HAS_VBT = False

try:
    import yfinance as yf
    HAS_YF = True
except ImportError:
    HAS_YF = False


def load_market_data(ticker: str = "${symbol}", period: str = "2y", interval: str = "${timeframe}"):
    """Download OHLCV data via yfinance or generate synthetic sample data."""
    if HAS_YF:
        print(f"Downloading {ticker} market data via yfinance...")
        df = yf.download(ticker, period=period, interval=interval, progress=False)
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
        df = df.dropna()
        if len(df) > 50:
            return df

    print("Generating representative synthetic OHLCV data for backtest execution...")
    dates = pd.date_range(end=pd.Timestamp.now(), periods=500, freq="4h")
    np.random.seed(42)
    returns = np.random.normal(0.0005, 0.015, size=len(dates))
    prices = 150.0 * np.exp(np.cumsum(returns))
    highs = prices * (1 + np.random.uniform(0.002, 0.012, size=len(dates)))
    lows = prices * (1 - np.random.uniform(0.002, 0.012, size=len(dates)))
    opens = prices * (1 + np.random.normal(0, 0.004, size=len(dates)))
    volumes = np.random.lognormal(14, 0.5, size=len(dates))

    return pd.DataFrame({
        "Open": opens,
        "High": highs,
        "Low": lows,
        "Close": prices,
        "Volume": volumes
    }, index=dates)


def run_strategy_backtest(df: pd.DataFrame, initial_cash: float = ${capital}.0):
    print("Evaluating signals for strategy: ${def.name}...")
${logicSnippet}

    entries = entries.fillna(False)
    exits = exits.fillna(False)

    if HAS_VBT:
        print("Executing simulation via Vectorbt Portfolio engine...")
        portfolio = vbt.Portfolio.from_signals(
            close=df['Close'],
            entries=entries,
            exits=exits,
            init_cash=initial_cash,
            fees=0.001,  # 0.10% commission
            freq="${timeframe}"
        )
        print("\\n" + "=" * 60)
        print("VECTORBT BACKTEST PERFORMANCE SUMMARY")
        print("=" * 60)
        print(portfolio.stats())
        return portfolio
    else:
        print("Vectorbt not installed - running vectorized Pandas backtest...")
        pos = np.zeros(len(df))
        current_pos = 0
        for i in range(len(df)):
            if entries.iloc[i]:
                current_pos = 1
            elif exits.iloc[i]:
                current_pos = 0
            pos[i] = current_pos

        pos_series = pd.Series(pos, index=df.index).shift(1).fillna(0)
        daily_ret = df['Close'].pct_change().fillna(0)
        strat_ret = pos_series * daily_ret
        cum_ret = (1 + strat_ret).cumprod()

        total_return = cum_ret.iloc[-1] - 1.0
        peak = cum_ret.cummax()
        drawdown = (cum_ret - peak) / peak
        max_dd = drawdown.min()
        sharpe = (strat_ret.mean() / (strat_ret.std() + 1e-9)) * np.sqrt(252 * 6)

        print("\\n" + "=" * 60)
        print("PANDAS ENGINE PERFORMANCE SUMMARY")
        print("=" * 60)
        print(f"Total Return:       {total_return:.2%}")
        print(f"Max Drawdown:       {max_dd:.2%}")
        print(f"Annualized Sharpe:  {sharpe:.2f}")
        print(f"Total Trades:       {(entries != entries.shift(1)).sum()}")
        print("=" * 60)
        return cum_ret


if __name__ == "__main__":
    market_df = load_market_data("${symbol}")
    results = run_strategy_backtest(market_df)
    print("Backtest complete.")
`;

  return {
    platform: "vectorbt",
    code: pythonScript,
    filename: `${normType}_${symbol}_${timeframe}_vectorbt.py`,
    language: "python",
    mimeType: "text/x-python",
    description: `Python Vectorbt and Pandas local backtest runner for ${def.name}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. NautilusTrader Python Strategy Class Generator
// ─────────────────────────────────────────────────────────────────────────────

export function generateNautilusStrategy(options: StrategyExportOptions): ExportResultItem {
  const normType = normalizeStrategyType(options.type);
  const def = STRATEGY_DEFINITIONS[normType];
  const params = resolveParams(normType, options.params);
  const symbol = (options.symbol || options.symbols?.[0] || "AAPL").toUpperCase();
  const timeframe = options.timeframe || "4h";
  const className = normType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");

  let configFields = "";
  let initMembers = "";
  let onStartLogic = "";
  let onBarLogic = "";

  switch (normType) {
    case "supertrend": {
      const p1 = params.atrPeriod ?? 10;
      const p2 = params.multiplier ?? 3.0;
      configFields = `    atr_period: int = ${p1}\n    multiplier: float = ${p2}`;
      initMembers = `        self.atr_period = config.atr_period\n        self.multiplier = config.multiplier\n        self.atr = AverageTrueRange(config.atr_period)\n        self.upper_band = 0.0\n        self.lower_band = 0.0\n        self.direction = 1`;
      onStartLogic = `        self.register_indicator_for_bars(self.bar_type, self.atr)\n        self.subscribe_bars(self.bar_type)`;
      onBarLogic = `        if not self.atr.initialized:\n            return\n\n        hl2 = (float(bar.high) + float(bar.low)) / 2.0\n        basic_up = hl2 + self.multiplier * float(self.atr.value)\n        basic_dn = hl2 - self.multiplier * float(self.atr.value)\n        close = float(bar.close)\n\n        if close > self.upper_band:\n            self.direction = 1\n        elif close < self.lower_band:\n            self.direction = -1\n\n        self.upper_band = basic_up\n        self.lower_band = basic_dn\n\n        if self.direction == 1 and not self.portfolio.is_net_long(self.instrument_id):\n            order = self.order_factory.market(\n                instrument_id=self.instrument_id,\n                order_side=OrderSide.BUY,\n                quantity=self.trade_size,\n            )\n            self.submit_order(order)\n        elif self.direction == -1 and self.portfolio.is_net_long(self.instrument_id):\n            self.close_all_positions(self.instrument_id)`;
      break;
    }

    case "fair_value_gap": {
      const gapPct = params.minGapPct ?? 0.3;
      const hold = params.holdBars ?? 8;
      configFields = `    min_gap_pct: float = ${gapPct}\n    hold_bars: int = ${hold}`;
      initMembers = `        self.min_gap_pct = config.min_gap_pct\n        self.hold_bars = config.hold_bars\n        self.history = []\n        self.active_fvgs = []\n        self.bars_in_trade = 0\n        self.target_price = 0.0`;
      onStartLogic = `        self.subscribe_bars(self.bar_type)`;
      onBarLogic = `        self.history.append(bar)\n        if len(self.history) < 3:\n            return\n\n        bar0 = self.history[-3]\n        bar2 = self.history[-1]\n        bar0_h = float(bar0.high)\n        bar2_l = float(bar2.low)\n\n        if bar2_l > bar0_h:\n            gap = ((bar2_l - bar0_h) / bar0_h) * 100.0\n            if gap >= self.min_gap_pct:\n                self.active_fvgs.append({\n                    "top": bar2_l,\n                    "bottom": bar0_h,\n                    "ce": (bar2_l + bar0_h) / 2.0,\n                    "age": 0\n                })\n\n        curr_close = float(bar.close)\n        curr_low = float(bar.low)\n\n        if self.portfolio.is_net_long(self.instrument_id):\n            self.bars_in_trade += 1\n            if curr_close >= self.target_price or self.bars_in_trade >= self.hold_bars:\n                self.close_all_positions(self.instrument_id)\n        else:\n            for i in range(len(self.active_fvgs) - 1, -1, -1):\n                fvg = self.active_fvgs[i]\n                fvg["age"] += 1\n                if fvg["age"] > 30:\n                    self.active_fvgs.pop(i)\n                    continue\n                if curr_low <= fvg["ce"] and curr_close > fvg["bottom"]:\n                    order = self.order_factory.market(\n                        instrument_id=self.instrument_id,\n                        order_side=OrderSide.BUY,\n                        quantity=self.trade_size,\n                    )\n                    self.submit_order(order)\n                    self.bars_in_trade = 0\n                    self.target_price = fvg["top"] * 1.025\n                    self.active_fvgs.pop(i)\n                    break`;
      break;
    }

    case "order_block": {
      const lookback = params.lookback ?? 20;
      const hold = params.holdBars ?? 8;
      configFields = `    lookback: int = ${lookback}\n    hold_bars: int = ${hold}`;
      initMembers = `        self.lookback = config.lookback\n        self.hold_bars = config.hold_bars\n        self.history = []\n        self.active_obs = []\n        self.bars_in_trade = 0\n        self.target_price = 0.0`;
      onStartLogic = `        self.subscribe_bars(self.bar_type)`;
      onBarLogic = `        self.history.append(bar)\n        if len(self.history) <= self.lookback + 5:\n            return\n\n        prior_high = max(float(b.high) for b in self.history[-self.lookback - 1:-1])\n        curr_close = float(bar.close)\n        curr_low = float(bar.low)\n\n        if curr_close > prior_high:\n            for b in reversed(self.history[-7:-1]):\n                if float(b.close) < float(b.open):\n                    self.active_obs.append({\n                        "top": float(b.high),\n                        "bottom": float(b.low),\n                        "age": 0\n                    })\n                    break\n\n        if self.portfolio.is_net_long(self.instrument_id):\n            self.bars_in_trade += 1\n            if curr_close >= self.target_price or self.bars_in_trade >= self.hold_bars:\n                self.close_all_positions(self.instrument_id)\n        else:\n            for i in range(len(self.active_obs) - 1, -1, -1):\n                ob = self.active_obs[i]\n                ob["age"] += 1\n                if ob["age"] > 30:\n                    self.active_obs.pop(i)\n                    continue\n                if curr_low <= ob["top"] and curr_close >= ob["bottom"]:\n                    order = self.order_factory.market(\n                        instrument_id=self.instrument_id,\n                        order_side=OrderSide.BUY,\n                        quantity=self.trade_size,\n                    )\n                    self.submit_order(order)\n                    self.bars_in_trade = 0\n                    self.target_price = curr_close * 1.03\n                    self.active_obs.pop(i)\n                    break`;
      break;
    }

    case "liquidity_sweep": {
      const lookback = params.lookback ?? 20;
      const volMult = params.volMultiplier ?? 1.2;
      const hold = params.holdBars ?? 6;
      configFields = `    lookback: int = ${lookback}\n    vol_multiplier: float = ${volMult}\n    hold_bars: int = ${hold}`;
      initMembers = `        self.lookback = config.lookback\n        self.vol_multiplier = config.vol_multiplier\n        self.hold_bars = config.hold_bars\n        self.history = []\n        self.bars_in_trade = 0\n        self.target_midpoint = 0.0`;
      onStartLogic = `        self.subscribe_bars(self.bar_type)`;
      onBarLogic = `        self.history.append(bar)\n        if len(self.history) <= self.lookback:\n            return\n\n        prior_low = min(float(b.low) for b in self.history[-self.lookback - 1:-1])\n        prior_high = max(float(b.high) for b in self.history[-self.lookback - 1:-1])\n        avg_vol = sum(float(b.volume) for b in self.history[-self.lookback - 1:-1]) / self.lookback\n        curr_close = float(bar.close)\n        curr_low = float(bar.low)\n        curr_vol = float(bar.volume)\n        has_surge = curr_vol >= avg_vol * self.vol_multiplier\n\n        if self.portfolio.is_net_long(self.instrument_id):\n            self.bars_in_trade += 1\n            if curr_close >= self.target_midpoint or self.bars_in_trade >= self.hold_bars:\n                self.close_all_positions(self.instrument_id)\n        else:\n            if curr_low < prior_low and curr_close > prior_low and has_surge:\n                order = self.order_factory.market(\n                    instrument_id=self.instrument_id,\n                    order_side=OrderSide.BUY,\n                    quantity=self.trade_size,\n                )\n                self.submit_order(order)\n                self.bars_in_trade = 0\n                self.target_midpoint = (prior_high + prior_low) / 2.0`;
      break;
    }

    case "ema_crossover": {
      const fastP = params.fastPeriod ?? 9;
      const slowP = params.slowPeriod ?? 21;
      configFields = `    fast_period: int = ${fastP}\n    slow_period: int = ${slowP}`;
      initMembers = `        self.fast_period = config.fast_period\n        self.slow_period = config.slow_period\n        self.fast_ema = ExponentialMovingAverage(config.fast_period)\n        self.slow_ema = ExponentialMovingAverage(config.slow_period)`;
      onStartLogic = `        self.register_indicator_for_bars(self.bar_type, self.fast_ema)\n        self.register_indicator_for_bars(self.bar_type, self.slow_ema)\n        self.subscribe_bars(self.bar_type)`;
      onBarLogic = `        if not self.fast_ema.initialized or not self.slow_ema.initialized:\n            return\n\n        if self.fast_ema.value > self.slow_ema.value:\n            if not self.portfolio.is_net_long(self.instrument_id):\n                order = self.order_factory.market(\n                    instrument_id=self.instrument_id,\n                    order_side=OrderSide.BUY,\n                    quantity=self.trade_size,\n                )\n                self.submit_order(order)\n        elif self.fast_ema.value < self.slow_ema.value:\n            if self.portfolio.is_net_long(self.instrument_id):\n                self.close_all_positions(self.instrument_id)`;
      break;
    }

    case "rsi_oversold": {
      const period = params.period ?? 14;
      const oversold = params.oversold ?? 30;
      const overbought = params.overbought ?? 70;
      configFields = `    period: int = ${period}\n    oversold: float = ${oversold}.0\n    overbought: float = ${overbought}.0`;
      initMembers = `        self.period = config.period\n        self.oversold = config.oversold\n        self.overbought = config.overbought\n        self.rsi = RelativeStrengthIndex(config.period)`;
      onStartLogic = `        self.register_indicator_for_bars(self.bar_type, self.rsi)\n        self.subscribe_bars(self.bar_type)`;
      onBarLogic = `        if not self.rsi.initialized:\n            return\n\n        if float(self.rsi.value) < self.oversold:\n            if not self.portfolio.is_net_long(self.instrument_id):\n                order = self.order_factory.market(\n                    instrument_id=self.instrument_id,\n                    order_side=OrderSide.BUY,\n                    quantity=self.trade_size,\n                )\n                self.submit_order(order)\n        elif float(self.rsi.value) > self.overbought:\n            if self.portfolio.is_net_long(self.instrument_id):\n                self.close_all_positions(self.instrument_id)`;
      break;
    }

    case "breakout": {
      const lookback = params.lookback ?? 20;
      const exitLookback = params.exitLookback ?? 10;
      configFields = `    lookback: int = ${lookback}\n    exit_lookback: int = ${exitLookback}`;
      initMembers = `        self.lookback = config.lookback\n        self.exit_lookback = config.exit_lookback\n        self.history = []`;
      onStartLogic = `        self.subscribe_bars(self.bar_type)`;
      onBarLogic = `        self.history.append(bar)\n        if len(self.history) <= max(self.lookback, self.exit_lookback):\n            return\n\n        high_break = max(float(b.high) for b in self.history[-self.lookback - 1:-1])\n        low_exit = min(float(b.low) for b in self.history[-self.exit_lookback - 1:-1])\n        close = float(bar.close)\n\n        if close > high_break and not self.portfolio.is_net_long(self.instrument_id):\n            order = self.order_factory.market(\n                instrument_id=self.instrument_id,\n                order_side=OrderSide.BUY,\n                quantity=self.trade_size,\n            )\n            self.submit_order(order)\n        elif close < low_exit and self.portfolio.is_net_long(self.instrument_id):\n            self.close_all_positions(self.instrument_id)`;
      break;
    }

    case "hma_trend": {
      const fastP = params.fastPeriod ?? 9;
      const slowP = params.slowPeriod ?? 21;
      configFields = `    fast_period: int = ${fastP}\n    slow_period: int = ${slowP}`;
      initMembers = `        self.fast_period = config.fast_period\n        self.slow_period = config.slow_period\n        self.history = []`;
      onStartLogic = `        self.subscribe_bars(self.bar_type)`;
      onBarLogic = `        self.history.append(float(bar.close))\n        if len(self.history) < self.slow_period + 5:\n            return\n\n        def calc_wma(data, p):\n            weights = list(range(1, p + 1))\n            return sum(d * w for d, w in zip(data[-p:], weights)) / sum(weights)\n\n        def calc_hma(data, p):\n            half_p = int(p / 2)\n            sqrt_p = int(p ** 0.5)\n            diff = [2 * calc_wma(data[:i], half_p) - calc_wma(data[:i], p) for i in range(len(data) - sqrt_p, len(data) + 1)]\n            return calc_wma(diff, sqrt_p)\n\n        hma_fast = calc_hma(self.history, self.fast_period)\n        hma_slow = calc_hma(self.history, self.slow_period)\n\n        if hma_fast > hma_slow and not self.portfolio.is_net_long(self.instrument_id):\n            order = self.order_factory.market(\n                instrument_id=self.instrument_id,\n                order_side=OrderSide.BUY,\n                quantity=self.trade_size,\n            )\n            self.submit_order(order)\n        elif hma_fast < hma_slow and self.portfolio.is_net_long(self.instrument_id):\n            self.close_all_positions(self.instrument_id)`;
      break;
    }

    case "adx_trend": {
      const period = params.period ?? 14;
      const minStrength = params.minStrength ?? 25;
      configFields = `    period: int = ${period}\n    min_strength: float = ${minStrength}.0`;
      initMembers = `        self.period = config.period\n        self.min_strength = config.min_strength\n        self.history = []`;
      onStartLogic = `        self.subscribe_bars(self.bar_type)`;
      onBarLogic = `        self.history.append(bar)\n        if len(self.history) <= self.period + 1:\n            return\n\n        # Rolling directional momentum\n        up = float(self.history[-1].high) - float(self.history[-2].high)\n        dn = float(self.history[-2].low) - float(self.history[-1].low)\n        plus_dm = up if (up > dn and up > 0) else 0.0\n        minus_dm = dn if (dn > up and dn > 0) else 0.0\n\n        if plus_dm > minus_dm and not self.portfolio.is_net_long(self.instrument_id):\n            order = self.order_factory.market(\n                instrument_id=self.instrument_id,\n                order_side=OrderSide.BUY,\n                quantity=self.trade_size,\n            )\n            self.submit_order(order)\n        elif plus_dm < minus_dm and self.portfolio.is_net_long(self.instrument_id):\n            self.close_all_positions(self.instrument_id)`;
      break;
    }

    case "stoch_rsi": {
      const period = params.period ?? 14;
      const oversoldK = params.oversoldK ?? 20;
      configFields = `    period: int = ${period}\n    oversold_k: float = ${oversoldK}.0`;
      initMembers = `        self.period = config.period\n        self.oversold_k = config.oversold_k\n        self.rsi = RelativeStrengthIndex(config.period)\n        self.rsi_history = []`;
      onStartLogic = `        self.register_indicator_for_bars(self.bar_type, self.rsi)\n        self.subscribe_bars(self.bar_type)`;
      onBarLogic = `        if not self.rsi.initialized:\n            return\n        self.rsi_history.append(float(self.rsi.value))\n        if len(self.rsi_history) < self.period:\n            return\n\n        r_min = min(self.rsi_history[-self.period:])\n        r_max = max(self.rsi_history[-self.period:])\n        k = 100.0 * (self.rsi_history[-1] - r_min) / (r_max - r_min + 1e-9)\n\n        if k < self.oversold_k and not self.portfolio.is_net_long(self.instrument_id):\n            order = self.order_factory.market(\n                instrument_id=self.instrument_id,\n                order_side=OrderSide.BUY,\n                quantity=self.trade_size,\n            )\n            self.submit_order(order)\n        elif k > 80.0 and self.portfolio.is_net_long(self.instrument_id):\n            self.close_all_positions(self.instrument_id)`;
      break;
    }

    case "zscore_rev": {
      const lookback = params.lookback ?? 20;
      const threshold = params.threshold ?? -2.0;
      configFields = `    lookback: int = ${lookback}\n    threshold: float = ${threshold}`;
      initMembers = `        self.lookback = config.lookback\n        self.threshold = config.threshold\n        self.prices = []`;
      onStartLogic = `        self.subscribe_bars(self.bar_type)`;
      onBarLogic = `        self.prices.append(float(bar.close))\n        if len(self.prices) < self.lookback:\n            return\n\n        window = self.prices[-self.lookback:]\n        mean_val = sum(window) / self.lookback\n        variance = sum((x - mean_val) ** 2 for x in window) / self.lookback\n        std_val = variance ** 0.5\n        zscore = (self.prices[-1] - mean_val) / (std_val + 1e-9)\n\n        if zscore <= self.threshold and not self.portfolio.is_net_long(self.instrument_id):\n            order = self.order_factory.market(\n                instrument_id=self.instrument_id,\n                order_side=OrderSide.BUY,\n                quantity=self.trade_size,\n            )\n            self.submit_order(order)\n        elif zscore >= 0.0 and self.portfolio.is_net_long(self.instrument_id):\n            self.close_all_positions(self.instrument_id)`;
      break;
    }

    case "bb_rev": {
      const win = params.window ?? 20;
      const dev = params.stdDev ?? 2.0;
      configFields = `    window: int = ${win}\n    std_dev: float = ${dev}`;
      initMembers = `        self.window = config.window\n        self.std_dev = config.std_dev\n        self.prices = []`;
      onStartLogic = `        self.subscribe_bars(self.bar_type)`;
      onBarLogic = `        self.prices.append(float(bar.close))\n        if len(self.prices) < self.window:\n            return\n\n        win_data = self.prices[-self.window:]\n        mid = sum(win_data) / self.window\n        std = (sum((x - mid) ** 2 for x in win_data) / self.window) ** 0.5\n        lower = mid - self.std_dev * std\n        close = self.prices[-1]\n\n        if close < lower and not self.portfolio.is_net_long(self.instrument_id):\n            order = self.order_factory.market(\n                instrument_id=self.instrument_id,\n                order_side=OrderSide.BUY,\n                quantity=self.trade_size,\n            )\n            self.submit_order(order)\n        elif close > mid and self.portfolio.is_net_long(self.instrument_id):\n            self.close_all_positions(self.instrument_id)`;
      break;
    }

    case "keltner": {
      const period = params.period ?? 20;
      const mult = params.multiplier ?? 1.5;
      configFields = `    period: int = ${period}\n    multiplier: float = ${mult}`;
      initMembers = `        self.period = config.period\n        self.multiplier = config.multiplier\n        self.ema = ExponentialMovingAverage(config.period)\n        self.atr = AverageTrueRange(config.period)`;
      onStartLogic = `        self.register_indicator_for_bars(self.bar_type, self.ema)\n        self.register_indicator_for_bars(self.bar_type, self.atr)\n        self.subscribe_bars(self.bar_type)`;
      onBarLogic = `        if not self.ema.initialized or not self.atr.initialized:\n            return\n\n        basis = float(self.ema.value)\n        lower = basis - self.multiplier * float(self.atr.value)\n        close = float(bar.close)\n\n        if close < lower and not self.portfolio.is_net_long(self.instrument_id):\n            order = self.order_factory.market(\n                instrument_id=self.instrument_id,\n                order_side=OrderSide.BUY,\n                quantity=self.trade_size,\n            )\n            self.submit_order(order)\n        elif close > basis and self.portfolio.is_net_long(self.instrument_id):\n            self.close_all_positions(self.instrument_id)`;
      break;
    }

    case "macd_cross": {
      const fastP = params.fastPeriod ?? 12;
      const slowP = params.slowPeriod ?? 26;
      const sigP = params.signalPeriod ?? 9;
      configFields = `    fast_period: int = ${fastP}\n    slow_period: int = ${slowP}\n    signal_period: int = ${sigP}`;
      initMembers = `        self.fast_period = config.fast_period\n        self.slow_period = config.slow_period\n        self.signal_period = config.signal_period\n        self.macd = MovingAverageConvergenceDivergence(config.fast_period, config.slow_period, config.signal_period)`;
      onStartLogic = `        self.register_indicator_for_bars(self.bar_type, self.macd)\n        self.subscribe_bars(self.bar_type)`;
      onBarLogic = `        if not self.macd.initialized:\n            return\n\n        if float(self.macd.value) > float(self.macd.signal):\n            if not self.portfolio.is_net_long(self.instrument_id):\n                order = self.order_factory.market(\n                    instrument_id=self.instrument_id,\n                    order_side=OrderSide.BUY,\n                    quantity=self.trade_size,\n                )\n                self.submit_order(order)\n        elif float(self.macd.value) < float(self.macd.signal):\n            if self.portfolio.is_net_long(self.instrument_id):\n                self.close_all_positions(self.instrument_id)`;
      break;
    }

    case "overnight": {
      configFields = `    pass`;
      initMembers = `        self.is_holding = False`;
      onStartLogic = `        self.subscribe_bars(self.bar_type)`;
      onBarLogic = `        # Overnight drift strategy: enter market order on session close\n        if not self.portfolio.is_net_long(self.instrument_id):\n            order = self.order_factory.market(\n                instrument_id=self.instrument_id,\n                order_side=OrderSide.BUY,\n                quantity=self.trade_size,\n            )\n            self.submit_order(order)\n        else:\n            self.close_all_positions(self.instrument_id)`;
      break;
    }

    case "sma_golden": {
      const fastP = params.fastPeriod ?? 50;
      const slowP = params.slowPeriod ?? 200;
      configFields = `    fast_period: int = ${fastP}\n    slow_period: int = ${slowP}`;
      initMembers = `        self.fast_period = config.fast_period\n        self.slow_period = config.slow_period\n        self.fast_sma = SimpleMovingAverage(config.fast_period)\n        self.slow_sma = SimpleMovingAverage(config.slow_period)`;
      onStartLogic = `        self.register_indicator_for_bars(self.bar_type, self.fast_sma)\n        self.register_indicator_for_bars(self.bar_type, self.slow_sma)\n        self.subscribe_bars(self.bar_type)`;
      onBarLogic = `        if not self.fast_sma.initialized or not self.slow_sma.initialized:\n            return\n\n        if float(self.fast_sma.value) > float(self.slow_sma.value):\n            if not self.portfolio.is_net_long(self.instrument_id):\n                order = self.order_factory.market(\n                    instrument_id=self.instrument_id,\n                    order_side=OrderSide.BUY,\n                    quantity=self.trade_size,\n                )\n                self.submit_order(order)\n        elif float(self.fast_sma.value) < float(self.slow_sma.value):\n            if self.portfolio.is_net_long(self.instrument_id):\n                self.close_all_positions(self.instrument_id)`;
      break;
    }
  }

  const nautilusCode = `"""
OpenStock NautilusTrader Event-Driven Quantitative Strategy
Strategy: ${def.name}
Symbol: ${symbol} | Timeframe: ${timeframe}
"""

from decimal import Decimal
from nautilus_trader.config import StrategyConfig
from nautilus_trader.model.data import Bar, BarType
from nautilus_trader.model.enums import OrderSide, PriceType, TimeInForce
from nautilus_trader.model.identifiers import InstrumentId
from nautilus_trader.model.objects import Quantity
from nautilus_trader.trading.strategy import Strategy
from nautilus_trader.indicators.averages import ExponentialMovingAverage, SimpleMovingAverage
from nautilus_trader.indicators.atr import AverageTrueRange
from nautilus_trader.indicators.rsi import RelativeStrengthIndex
from nautilus_trader.indicators.macd import MovingAverageConvergenceDivergence


class ${className}Config(StrategyConfig, frozen=True):
    instrument_id: InstrumentId
    bar_type: BarType
    trade_size: Decimal = Decimal("1.0")
${configFields}


class ${className}Strategy(Strategy):
    """
    Production NautilusTrader Strategy for ${def.name}.
    Automated execution with risk guards and order management.
    """

    def __init__(self, config: ${className}Config) -> None:
        super().__init__(config)
        self.instrument_id = config.instrument_id
        self.bar_type = config.bar_type
        self.trade_size = Quantity.from_str(str(config.trade_size))
${initMembers}

    def on_start(self) -> None:
        """Register indicators and subscribe to bar data feeds."""
${onStartLogic}

    def on_bar(self, bar: Bar) -> None:
        """Process incoming bar event and execute signals."""
${onBarLogic}

    def on_stop(self) -> None:
        """Clean up positions on strategy termination."""
        if self.portfolio.is_net_long(self.instrument_id):
            self.close_all_positions(self.instrument_id)


if __name__ == "__main__":
    print("${className}Strategy class compiled successfully.")
`;

  return {
    platform: "nautilus",
    code: nautilusCode,
    filename: `${normType}_${symbol}_${timeframe}_nautilus.py`,
    language: "python",
    mimeType: "text/x-python",
    description: `NautilusTrader Python event-driven strategy class for ${def.name}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Microsoft Qlib Alpha Factor Expression Generator
// ─────────────────────────────────────────────────────────────────────────────

export function generateQlibFactor(options: StrategyExportOptions): ExportResultItem {
  const normType = normalizeStrategyType(options.type);
  const def = STRATEGY_DEFINITIONS[normType];
  const params = resolveParams(normType, options.params);
  const symbol = (options.symbol || options.symbols?.[0] || "AAPL").toUpperCase();
  const timeframe = options.timeframe || "4h";

  let expression = "";

  switch (normType) {
    case "supertrend": {
      const p1 = params.atrPeriod ?? 10;
      expression = `($close - ($high + $low) / 2) / (ATR(${p1}) + 1e-9)`;
      break;
    }

    case "fair_value_gap": {
      expression = `If($low > Ref($high, 2), ($low - Ref($high, 2)) / Ref($close, 1), If($high < Ref($low, 2), ($high - Ref($low, 2)) / Ref($close, 1), 0))`;
      break;
    }

    case "order_block": {
      const lookback = params.lookback ?? 20;
      expression = `($close - Min($low, ${lookback})) / (Max($high, ${lookback}) - Min($low, ${lookback}) + 1e-9)`;
      break;
    }

    case "liquidity_sweep": {
      const lookback = params.lookback ?? 20;
      expression = `If(($low < Ref(Min($low, ${lookback}), 1)) & ($close > Ref(Min($low, ${lookback}), 1)), $volume / (Mean($volume, ${lookback}) + 1e-9), 0)`;
      break;
    }

    case "ema_crossover": {
      const fast = params.fastPeriod ?? 9;
      const slow = params.slowPeriod ?? 21;
      expression = `EMA($close, ${fast}) / EMA($close, ${slow}) - 1`;
      break;
    }

    case "rsi_oversold": {
      const period = params.period ?? 14;
      expression = `(50 - RSI($close, ${period})) / 50`;
      break;
    }

    case "breakout": {
      const lookback = params.lookback ?? 20;
      expression = `($close - Ref(Max($high, ${lookback}), 1)) / (ATR(${lookback}) + 1e-9)`;
      break;
    }

    case "hma_trend": {
      const fast = params.fastPeriod ?? 9;
      const slow = params.slowPeriod ?? 21;
      expression = `EMA($close, ${fast}) / EMA($close, ${slow}) - 1`;
      break;
    }

    case "adx_trend": {
      const period = params.period ?? 14;
      expression = `(EMA(Max($high - Ref($high, 1), 0), ${period}) - EMA(Max(Ref($low, 1) - $low, 0), ${period})) / (ATR(${period}) + 1e-9)`;
      break;
    }

    case "stoch_rsi": {
      const period = params.period ?? 14;
      expression = `(RSI($close, ${period}) - Min(RSI($close, ${period}), ${period})) / (Max(RSI($close, ${period}), ${period}) - Min(RSI($close, ${period}), ${period}) + 1e-9)`;
      break;
    }

    case "zscore_rev": {
      const lookback = params.lookback ?? 20;
      expression = `($close - Mean($close, ${lookback})) / (Std($close, ${lookback}) + 1e-9)`;
      break;
    }

    case "bb_rev": {
      const win = params.window ?? 20;
      const dev = params.stdDev ?? 2.0;
      expression = `($close - (Mean($close, ${win}) - ${dev} * Std($close, ${win}))) / (Std($close, ${win}) + 1e-9)`;
      break;
    }

    case "keltner": {
      const period = params.period ?? 20;
      const mult = params.multiplier ?? 1.5;
      expression = `($close - (EMA($close, ${period}) - ${mult} * ATR(${period}))) / (ATR(${period}) + 1e-9)`;
      break;
    }

    case "macd_cross": {
      const fast = params.fastPeriod ?? 12;
      const slow = params.slowPeriod ?? 26;
      expression = `(EMA($close, ${fast}) - EMA($close, ${slow})) / (Std($close, 20) + 1e-9)`;
      break;
    }

    case "overnight": {
      expression = `($open / Ref($close, 1)) - 1`;
      break;
    }

    case "sma_golden": {
      const fast = params.fastPeriod ?? 50;
      const slow = params.slowPeriod ?? 200;
      expression = `Mean($close, ${fast}) / Mean($close, ${slow}) - 1`;
      break;
    }
  }

  return {
    platform: "qlib",
    code: expression,
    filename: `${normType}_${symbol}_${timeframe}_qlib.txt`,
    language: "text",
    mimeType: "text/plain",
    description: `Microsoft Qlib Alpha Factor expression for ${def.name}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified Strategy Code Exporter
// ─────────────────────────────────────────────────────────────────────────────

export function exportStrategyCode(
  options: StrategyExportOptions,
  platform: ExportPlatform = "all"
): StrategyExportBundle | ExportResultItem {
  const normType = normalizeStrategyType(options.type);
  const def = STRATEGY_DEFINITIONS[normType];
  const params = resolveParams(normType, options.params);
  const symbols = (
    options.symbols && options.symbols.length > 0
      ? options.symbols
      : [options.symbol || "AAPL"]
  ).map((s) => s.toUpperCase());
  const primarySymbol = symbols[0];
  const timeframe = options.timeframe || "4h";

  const resolvedOptions: StrategyExportOptions = {
    ...options,
    type: normType,
    params,
    symbol: primarySymbol,
    symbols,
    timeframe,
  };

  switch (platform) {
    case "pine":
      return generatePineScript(resolvedOptions);
    case "vectorbt":
      return generateVectorbtScript(resolvedOptions);
    case "nautilus":
      return generateNautilusStrategy(resolvedOptions);
    case "qlib":
      return generateQlibFactor(resolvedOptions);
    case "all":
    default:
      return {
        strategyType: options.type,
        normalizedType: normType,
        name: def.name,
        symbols,
        primarySymbol,
        timeframe,
        params,
        exports: {
          pine: generatePineScript(resolvedOptions),
          vectorbt: generateVectorbtScript(resolvedOptions),
          nautilus: generateNautilusStrategy(resolvedOptions),
          qlib: generateQlibFactor(resolvedOptions),
        },
      };
  }
}
