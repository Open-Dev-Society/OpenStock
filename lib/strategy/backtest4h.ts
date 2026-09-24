import { getOhlcv4h, Candle4h } from "@/lib/market/ohlcv4h";
import { IBacktestTrade } from "@/database/models/backtestResult.model";

export interface StrategyConfig {
  type:
    | "ema_crossover"
    | "rsi_oversold"
    | "breakout"
    | "liquidity_sweep"
    | "supertrend"
    | "fair_value_gap"
    | "order_block";
  params: Record<string, number>;
  symbols: string[];
  from: Date | string;
  to: Date | string;
}

export interface StrategyMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpe: number;
  maxDrawdown: number;
  winRate: number;
  tradesCount: number;
  barsCount: number;
}

export interface SymbolBacktestResult {
  symbol: string;
  metrics: StrategyMetrics;
}

export interface StrategyEvaluationResult {
  metrics: StrategyMetrics;
  trades: IBacktestTrade[];
}

export interface BacktestResult {
  config: StrategyConfig;
  metrics: StrategyMetrics;
  perSymbolMetrics: SymbolBacktestResult[];
  trades: IBacktestTrade[];
}

function calculateEma(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const ema: number[] = new Array(values.length);
  ema[0] = values[0];
  for (let i = 1; i < values.length; i++) {
    ema[i] = values[i] * k + ema[i - 1] * (1 - k);
  }
  return ema;
}

function calculateRsi(closes: number[], period: number): number[] {
  const rsi: number[] = new Array(closes.length).fill(50);
  if (closes.length <= period) return rsi;

  let gainSum = 0;
  let lossSum = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gainSum += diff;
    else lossSum += Math.abs(diff);
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi[period] = 100 - 100 / (1 + rs);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const currentRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi[i] = 100 - 100 / (1 + currentRs);
  }

  return rsi;
}

function computeMetricsFromSignals(
  candles: Candle4h[],
  signals: number[],
  warmupBars: number,
  symbol: string = "UNKNOWN",
  initialBalance: number = 10000
): StrategyEvaluationResult {
  const barsCount = candles.length;
  if (barsCount < warmupBars + 1) {
    return {
      metrics: {
        totalReturn: 0,
        annualizedReturn: 0,
        sharpe: 0,
        maxDrawdown: 0,
        winRate: 0,
        tradesCount: 0,
        barsCount,
      },
      trades: [],
    };
  }

  const closes = candles.map((c) => c.close);
  const returns: number[] = [];
  const trades: IBacktestTrade[] = [];
  let tradesCount = 0;
  let winningTrades = 0;
  let totalPositionBars = 0;

  let currentBalance = initialBalance;
  let inTrade = false;
  let tradeType: "long" | "short" = "long";
  let entryPrice = 0;
  let entryTime = new Date();
  let entryBarIdx = 0;
  let tradeIndex = 1;

  for (let i = warmupBars + 1; i < barsCount; i++) {
    const prevSignal = signals[i - 1];
    const currSignal = signals[i];
    const prevClose = closes[i - 1];
    const currClose = closes[i];
    const barReturn = prevClose !== 0 ? (currClose - prevClose) / prevClose : 0;
    const stratReturn = prevSignal * barReturn;
    returns.push(stratReturn);

    if (prevSignal !== 0) {
      totalPositionBars++;
      if (stratReturn > 0) winningTrades++;
    }

    if (signals[i] !== signals[i - 1]) {
      tradesCount++;
    }

    // Trade closing logic
    if (inTrade && (currSignal !== prevSignal || i === barsCount - 1)) {
      const exitPrice = currClose;
      const returnPct =
        tradeType === "long"
          ? (exitPrice - entryPrice) / entryPrice
          : (entryPrice - exitPrice) / entryPrice;
      const tradePnl = currentBalance * returnPct;
      currentBalance += tradePnl;

      trades.push({
        id: `${symbol}-${tradeIndex++}`,
        symbol,
        type: tradeType,
        entryTime,
        entryPrice: Math.round(entryPrice * 100) / 100,
        exitTime: candles[i].time,
        exitPrice: Math.round(exitPrice * 100) / 100,
        pnl: Math.round(tradePnl * 100) / 100,
        returnPct: Math.round(returnPct * 10000) / 10000,
        balance: Math.round(currentBalance * 100) / 100,
        durationBars: Math.max(1, i - entryBarIdx),
      });

      inTrade = false;
    }

    // Trade opening logic
    if (!inTrade && currSignal !== 0) {
      inTrade = true;
      tradeType = currSignal === 1 ? "long" : "short";
      entryPrice = currClose;
      entryTime = candles[i].time;
      entryBarIdx = i;
    }
  }

  if (returns.length === 0) {
    return {
      metrics: {
        totalReturn: 0,
        annualizedReturn: 0,
        sharpe: 0,
        maxDrawdown: 0,
        winRate: 0,
        tradesCount,
        barsCount,
      },
      trades,
    };
  }

  let equity = 1.0;
  let peak = 1.0;
  let maxDrawdown = 0;

  for (const r of returns) {
    equity *= 1 + r;
    if (equity > peak) peak = equity;
    const dd = (peak - equity) / peak;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  const totalReturn = equity - 1;
  const n = returns.length;
  const firstTime = candles[warmupBars].time.getTime();
  const lastTime = candles[barsCount - 1].time.getTime();
  const years = (lastTime - firstTime) / (365.25 * 24 * 3600 * 1000);
  const barsPerYear = years > 0 ? n / years : 0;

  const meanReturn = returns.reduce((acc, v) => acc + v, 0) / n;
  const variance =
    returns.reduce((acc, v) => acc + Math.pow(v - meanReturn, 2), 0) /
    (n > 1 ? n - 1 : 1);
  const stdDev = Math.sqrt(variance);

  const sharpe =
    stdDev > 0 && barsPerYear > 0 ? (meanReturn / stdDev) * Math.sqrt(barsPerYear) : 0;
  const annualizedReturn =
    n > 0 && barsPerYear > 0 ? Math.pow(1 + totalReturn, barsPerYear / n) - 1 : 0;
  const winRate =
    totalPositionBars > 0 ? winningTrades / totalPositionBars : 0;

  return {
    metrics: {
      totalReturn,
      annualizedReturn,
      sharpe,
      maxDrawdown,
      winRate,
      tradesCount,
      barsCount,
    },
    trades,
  };
}

export function evaluateEmaCrossover(
  candles: Candle4h[],
  fastPeriod: number,
  slowPeriod: number,
  symbol: string = "UNKNOWN"
): StrategyEvaluationResult {
  const barsCount = candles.length;
  if (barsCount < slowPeriod + 1) {
    return computeMetricsFromSignals(candles, [], slowPeriod, symbol);
  }

  const closes = candles.map((c) => c.close);
  const fastEma = calculateEma(closes, fastPeriod);
  const slowEma = calculateEma(closes, slowPeriod);

  const signals: number[] = new Array(barsCount).fill(0);
  for (let i = slowPeriod; i < barsCount; i++) {
    if (fastEma[i] > slowEma[i]) {
      signals[i] = 1;
    } else if (fastEma[i] < slowEma[i]) {
      signals[i] = -1;
    } else {
      signals[i] = 0;
    }
  }

  return computeMetricsFromSignals(candles, signals, slowPeriod, symbol);
}

export function evaluateRsiOversold(
  candles: Candle4h[],
  period: number,
  oversold: number,
  overbought: number,
  symbol: string = "UNKNOWN"
): StrategyEvaluationResult {
  const barsCount = candles.length;
  if (barsCount < period + 1) {
    return computeMetricsFromSignals(candles, [], period, symbol);
  }

  const closes = candles.map((c) => c.close);
  const rsi = calculateRsi(closes, period);

  const signals: number[] = new Array(barsCount).fill(0);
  let currentPosition = 0;

  for (let i = period; i < barsCount; i++) {
    if (rsi[i] < oversold) {
      currentPosition = 1; // Long when oversold
    } else if (rsi[i] > overbought) {
      currentPosition = -1; // Short when overbought
    } else if (rsi[i] >= 45 && rsi[i] <= 55 && currentPosition !== 0) {
      currentPosition = 0; // Neutralize when reverting to midline
    }
    signals[i] = currentPosition;
  }

  return computeMetricsFromSignals(candles, signals, period, symbol);
}

export function evaluateBreakout(
  candles: Candle4h[],
  lookback: number,
  symbol: string = "UNKNOWN"
): StrategyEvaluationResult {
  const barsCount = candles.length;
  if (barsCount < lookback + 1) {
    return computeMetricsFromSignals(candles, [], lookback, symbol);
  }

  const signals: number[] = new Array(barsCount).fill(0);
  let currentPosition = 0;

  for (let i = lookback; i < barsCount; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;

    for (let j = i - lookback; j < i; j++) {
      if (candles[j].high > highestHigh) highestHigh = candles[j].high;
      if (candles[j].low < lowestLow) lowestLow = candles[j].low;
    }

    const currentClose = candles[i].close;
    if (currentClose > highestHigh) {
      currentPosition = 1; // Breakout above N-bar high
    } else if (currentClose < lowestLow) {
      currentPosition = -1; // Breakdown below N-bar low
    }

    signals[i] = currentPosition;
  }

  return computeMetricsFromSignals(candles, signals, lookback, symbol);
}

export function evaluateLiquiditySweep(
  candles: Candle4h[],
  lookback: number = 20,
  volMultiplier: number = 1.2,
  symbol: string = "UNKNOWN"
): StrategyEvaluationResult {
  const barsCount = candles.length;
  if (barsCount < lookback + 1) {
    return computeMetricsFromSignals(candles, [], lookback, symbol);
  }

  const signals: number[] = new Array(barsCount).fill(0);
  let currentPosition = 0;
  let targetMidpoint = 0;
  let barsInTrade = 0;

  for (let i = lookback; i < barsCount; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    let volSum = 0;

    for (let j = i - lookback; j < i; j++) {
      if (candles[j].high > highestHigh) highestHigh = candles[j].high;
      if (candles[j].low < lowestLow) lowestLow = candles[j].low;
      volSum += candles[j].volume;
    }

    const avgVol = volSum / lookback;
    const currentClose = candles[i].close;
    const currentLow = candles[i].low;
    const currentHigh = candles[i].high;
    const currentVol = candles[i].volume;
    const hasVolSurge = avgVol > 0 ? currentVol >= avgVol * volMultiplier : true;

    // Check exit conditions if in position
    if (currentPosition === 1) {
      barsInTrade++;
      if (currentClose >= targetMidpoint || barsInTrade >= 6) {
        currentPosition = 0;
      }
    } else if (currentPosition === -1) {
      barsInTrade++;
      if (currentClose <= targetMidpoint || barsInTrade >= 6) {
        currentPosition = 0;
      }
    }

    // Check new sweep triggers if flat
    if (currentPosition === 0) {
      // Bullish Sweep: pierced below rolling low, reclaimed and closed above
      if (currentLow < lowestLow && currentClose > lowestLow && hasVolSurge) {
        currentPosition = 1;
        targetMidpoint = (highestHigh + lowestLow) / 2;
        barsInTrade = 0;
      }
      // Bearish Sweep: pierced above rolling high, closed back below
      else if (currentHigh > highestHigh && currentClose < highestHigh && hasVolSurge) {
        currentPosition = -1;
        targetMidpoint = (highestHigh + lowestLow) / 2;
        barsInTrade = 0;
      }
    }

    signals[i] = currentPosition;
  }

  return computeMetricsFromSignals(candles, signals, lookback, symbol);
}

// ── LuxAlgo Supertrend ATR Trailing Stop ──────────────────────────────
export function evaluateSupertrend(
  candles: Candle4h[],
  atrPeriod: number = 10,
  multiplier: number = 3,
  symbol: string = "UNKNOWN"
): StrategyEvaluationResult {
  const barsCount = candles.length;
  if (barsCount < atrPeriod + 2) {
    return computeMetricsFromSignals(candles, [], atrPeriod, symbol);
  }

  const tr: number[] = new Array(barsCount).fill(0);
  tr[0] = candles[0].high - candles[0].low;
  for (let i = 1; i < barsCount; i++) {
    const hl = candles[i].high - candles[i].low;
    const hc = Math.abs(candles[i].high - candles[i - 1].close);
    const lc = Math.abs(candles[i].low - candles[i - 1].close);
    tr[i] = Math.max(hl, hc, lc);
  }

  const atr: number[] = new Array(barsCount).fill(0);
  let trSum = 0;
  for (let i = 0; i < atrPeriod; i++) trSum += tr[i];
  atr[atrPeriod - 1] = trSum / atrPeriod;

  for (let i = atrPeriod; i < barsCount; i++) {
    atr[i] = (atr[i - 1] * (atrPeriod - 1) + tr[i]) / atrPeriod;
  }

  const signals: number[] = new Array(barsCount).fill(0);
  let finalUp = 0;
  let finalDn = 0;
  let trend = 1;

  for (let i = atrPeriod; i < barsCount; i++) {
    const hl2 = (candles[i].high + candles[i].low) / 2;
    const basicUp = hl2 + multiplier * atr[i];
    const basicDn = hl2 - multiplier * atr[i];

    if (i === atrPeriod) {
      finalUp = basicUp;
      finalDn = basicDn;
      trend = candles[i].close > finalUp ? 1 : -1;
    } else {
      const prevClose = candles[i - 1].close;
      finalUp = prevClose <= finalUp || basicUp < finalUp ? basicUp : finalUp;
      finalDn = prevClose >= finalDn || basicDn > finalDn ? basicDn : finalDn;

      if (trend === 1 && candles[i].close < finalDn) {
        trend = -1;
      } else if (trend === -1 && candles[i].close > finalUp) {
        trend = 1;
      }
    }

    signals[i] = trend;
  }

  return computeMetricsFromSignals(candles, signals, atrPeriod, symbol);
}

// ── LuxAlgo Smart Money Concepts: Fair Value Gap (FVG) ─────────────────
export function evaluateFairValueGap(
  candles: Candle4h[],
  minGapPct: number = 0.3,
  holdBars: number = 8,
  symbol: string = "UNKNOWN"
): StrategyEvaluationResult {
  const barsCount = candles.length;
  if (barsCount < 10) {
    return computeMetricsFromSignals(candles, [], 5, symbol);
  }

  const signals: number[] = new Array(barsCount).fill(0);
  let currentPosition = 0;
  let targetPrice = 0;
  let barsInTrade = 0;

  interface FvgZone {
    type: "bull" | "bear";
    top: number;
    bottom: number;
    ce: number;
    createdIdx: number;
  }
  const activeZones: FvgZone[] = [];

  for (let i = 2; i < barsCount; i++) {
    const bar0 = candles[i - 2];
    const bar2 = candles[i];

    if (bar2.low > bar0.high) {
      const gapPct = ((bar2.low - bar0.high) / bar0.high) * 100;
      if (gapPct >= minGapPct) {
        activeZones.push({
          type: "bull",
          top: bar2.low,
          bottom: bar0.high,
          ce: (bar2.low + bar0.high) / 2,
          createdIdx: i,
        });
      }
    } else if (bar2.high < bar0.low) {
      const gapPct = ((bar0.low - bar2.high) / bar0.low) * 100;
      if (gapPct >= minGapPct) {
        activeZones.push({
          type: "bear",
          top: bar0.low,
          bottom: bar2.high,
          ce: (bar0.low + bar2.high) / 2,
          createdIdx: i,
        });
      }
    }

    const currClose = candles[i].close;
    const currLow = candles[i].low;
    const currHigh = candles[i].high;

    if (currentPosition === 1) {
      barsInTrade++;
      if (currClose >= targetPrice || barsInTrade >= holdBars) {
        currentPosition = 0;
      }
    } else if (currentPosition === -1) {
      barsInTrade++;
      if (currClose <= targetPrice || barsInTrade >= holdBars) {
        currentPosition = 0;
      }
    }

    if (currentPosition === 0) {
      for (let z = activeZones.length - 1; z >= 0; z--) {
        const zone = activeZones[z];
        if (i - zone.createdIdx > 30) {
          activeZones.splice(z, 1);
          continue;
        }

        if (zone.type === "bull") {
          if (currLow <= zone.ce && currClose > zone.bottom) {
            currentPosition = 1;
            targetPrice = zone.top * 1.025;
            barsInTrade = 0;
            activeZones.splice(z, 1);
            break;
          }
        } else if (zone.type === "bear") {
          if (currHigh >= zone.ce && currClose < zone.top) {
            currentPosition = -1;
            targetPrice = zone.bottom * 0.975;
            barsInTrade = 0;
            activeZones.splice(z, 1);
            break;
          }
        }
      }
    }

    signals[i] = currentPosition;
  }

  return computeMetricsFromSignals(candles, signals, 5, symbol);
}

// ── LuxAlgo Smart Money Concepts: Order Block Retest ──────────────────
export function evaluateOrderBlock(
  candles: Candle4h[],
  lookback: number = 20,
  holdBars: number = 8,
  symbol: string = "UNKNOWN"
): StrategyEvaluationResult {
  const barsCount = candles.length;
  if (barsCount < lookback + 5) {
    return computeMetricsFromSignals(candles, [], lookback, symbol);
  }

  const signals: number[] = new Array(barsCount).fill(0);
  let currentPosition = 0;
  let targetPrice = 0;
  let barsInTrade = 0;

  interface OrderBlockZone {
    type: "bull" | "bear";
    top: number;
    bottom: number;
    idx: number;
  }
  const obZones: OrderBlockZone[] = [];

  for (let i = lookback; i < barsCount; i++) {
    let priorHigh = -Infinity;
    let priorLow = Infinity;
    for (let j = i - lookback; j < i; j++) {
      if (candles[j].high > priorHigh) priorHigh = candles[j].high;
      if (candles[j].low < priorLow) priorLow = candles[j].low;
    }

    if (candles[i].close > priorHigh) {
      for (let k = i - 1; k >= i - 6 && k >= 0; k--) {
        if (candles[k].close < candles[k].open) {
          obZones.push({
            type: "bull",
            top: candles[k].high,
            bottom: candles[k].low,
            idx: i,
          });
          break;
        }
      }
    } else if (candles[i].close < priorLow) {
      for (let k = i - 1; k >= i - 6 && k >= 0; k--) {
        if (candles[k].close > candles[k].open) {
          obZones.push({
            type: "bear",
            top: candles[k].high,
            bottom: candles[k].low,
            idx: i,
          });
          break;
        }
      }
    }

    const currClose = candles[i].close;
    const currLow = candles[i].low;
    const currHigh = candles[i].high;

    if (currentPosition === 1) {
      barsInTrade++;
      if (currClose >= targetPrice || barsInTrade >= holdBars) {
        currentPosition = 0;
      }
    } else if (currentPosition === -1) {
      barsInTrade++;
      if (currClose <= targetPrice || barsInTrade >= holdBars) {
        currentPosition = 0;
      }
    }

    if (currentPosition === 0) {
      for (let z = obZones.length - 1; z >= 0; z--) {
        const ob = obZones[z];
        if (i - ob.idx > 30) {
          obZones.splice(z, 1);
          continue;
        }

        if (ob.type === "bull") {
          if (currLow <= ob.top && currClose >= ob.bottom) {
            currentPosition = 1;
            targetPrice = currClose * 1.03;
            barsInTrade = 0;
            obZones.splice(z, 1);
            break;
          }
        } else if (ob.type === "bear") {
          if (currHigh >= ob.bottom && currClose <= ob.top) {
            currentPosition = -1;
            targetPrice = currClose * 0.97;
            barsInTrade = 0;
            obZones.splice(z, 1);
            break;
          }
        }
      }
    }

    signals[i] = currentPosition;
  }

  return computeMetricsFromSignals(candles, signals, lookback, symbol);
}

export async function runBacktest(
  config: StrategyConfig
): Promise<BacktestResult> {
  const fromSec = Math.floor(new Date(config.from).getTime() / 1000);
  const toSec = Math.floor(new Date(config.to).getTime() / 1000);

  const perSymbolMetrics: SymbolBacktestResult[] = [];
  const allTrades: IBacktestTrade[] = [];

  for (const sym of config.symbols) {
    const candles = await getOhlcv4h(sym, fromSec, toSec);
    let warmupBars = 0;
    switch (config.type) {
      case "rsi_oversold":
        warmupBars = config.params.period || config.params.rsiPeriod || 14;
        break;
      case "breakout":
        warmupBars = config.params.lookback || config.params.period || 20;
        break;
      case "liquidity_sweep":
        warmupBars = config.params.lookback || 20;
        break;
      case "supertrend":
        warmupBars = config.params.atrPeriod || 10;
        break;
      case "fair_value_gap":
        warmupBars = 6;
        break;
      case "order_block":
        warmupBars = config.params.lookback || 20;
        break;
      case "ema_crossover":
      default:
        warmupBars = config.params.slowPeriod || config.params.slow || 26;
        break;
    }

    if (!candles || candles.length <= warmupBars) {
      throw new Error(
        `Insufficient 4h candles for ${sym}: got ${candles ? candles.length : 0}, requires > ${warmupBars} bars for warmup`
      );
    }

    let evalResult: StrategyEvaluationResult;

    switch (config.type) {
      case "rsi_oversold": {
        const period = config.params.period || config.params.rsiPeriod || 14;
        const oversold = config.params.oversold || config.params.oversoldThreshold || 30;
        const overbought = config.params.overbought || config.params.overboughtThreshold || 70;
        evalResult = evaluateRsiOversold(candles, period, oversold, overbought, sym);
        break;
      }
      case "breakout": {
        const lookback = config.params.lookback || config.params.period || 20;
        evalResult = evaluateBreakout(candles, lookback, sym);
        break;
      }
      case "liquidity_sweep": {
        const lookback = config.params.lookback || 20;
        const volMultiplier = config.params.volMultiplier || 1.2;
        evalResult = evaluateLiquiditySweep(candles, lookback, volMultiplier, sym);
        break;
      }
      case "supertrend": {
        const atrPeriod = config.params.atrPeriod || 10;
        const multiplier = config.params.multiplier || 3;
        evalResult = evaluateSupertrend(candles, atrPeriod, multiplier, sym);
        break;
      }
      case "fair_value_gap": {
        const minGapPct = config.params.minGapPct || 0.3;
        const holdBars = config.params.holdBars || 8;
        evalResult = evaluateFairValueGap(candles, minGapPct, holdBars, sym);
        break;
      }
      case "order_block": {
        const lookback = config.params.lookback || 20;
        const holdBars = config.params.holdBars || 8;
        evalResult = evaluateOrderBlock(candles, lookback, holdBars, sym);
        break;
      }
      case "ema_crossover":
      default: {
        const fastPeriod = config.params.fastPeriod || config.params.fast || 12;
        const slowPeriod = config.params.slowPeriod || config.params.slow || 26;
        evalResult = evaluateEmaCrossover(candles, fastPeriod, slowPeriod, sym);
        break;
      }
    }

    perSymbolMetrics.push({ symbol: sym, metrics: evalResult.metrics });
    allTrades.push(...evalResult.trades);
  }

  allTrades.sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime());

  const count = perSymbolMetrics.length;
  const aggregateMetrics: StrategyMetrics =
    count === 0
      ? {
          totalReturn: 0,
          annualizedReturn: 0,
          sharpe: 0,
          maxDrawdown: 0,
          winRate: 0,
          tradesCount: 0,
          barsCount: 0,
        }
      : {
          totalReturn:
            perSymbolMetrics.reduce((s, m) => s + m.metrics.totalReturn, 0) / count,
          annualizedReturn:
            perSymbolMetrics.reduce(
              (s, m) => s + m.metrics.annualizedReturn,
              0
            ) / count,
          sharpe:
            perSymbolMetrics.reduce((s, m) => s + m.metrics.sharpe, 0) / count,
          maxDrawdown: Math.max(
            ...perSymbolMetrics.map((m) => m.metrics.maxDrawdown)
          ),
          winRate:
            perSymbolMetrics.reduce((s, m) => s + m.metrics.winRate, 0) / count,
          tradesCount: perSymbolMetrics.reduce(
            (s, m) => s + m.metrics.tradesCount,
            0
          ),
          barsCount: Math.round(
            perSymbolMetrics.reduce((s, m) => s + m.metrics.barsCount, 0) / count
          ),
        };

  return {
    config,
    metrics: aggregateMetrics,
    perSymbolMetrics,
    trades: allTrades,
  };
}
