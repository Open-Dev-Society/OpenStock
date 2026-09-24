import { getOhlcv4h, Candle4h } from "@/lib/market/ohlcv4h";

export interface StrategyConfig {
  type: "ema_crossover" | "rsi_oversold" | "breakout";
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

export interface BacktestResult {
  config: StrategyConfig;
  metrics: StrategyMetrics;
  perSymbolMetrics: SymbolBacktestResult[];
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
  warmupBars: number
): StrategyMetrics {
  const barsCount = candles.length;
  if (barsCount < warmupBars + 1) {
    return {
      totalReturn: 0,
      annualizedReturn: 0,
      sharpe: 0,
      maxDrawdown: 0,
      winRate: 0,
      tradesCount: 0,
      barsCount,
    };
  }

  const closes = candles.map((c) => c.close);
  const returns: number[] = [];
  let tradesCount = 0;
  let winningTrades = 0;
  let totalPositionBars = 0;

  for (let i = warmupBars + 1; i < barsCount; i++) {
    const prevSignal = signals[i - 1];
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
  }

  if (returns.length === 0) {
    return {
      totalReturn: 0,
      annualizedReturn: 0,
      sharpe: 0,
      maxDrawdown: 0,
      winRate: 0,
      tradesCount,
      barsCount,
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
    totalReturn,
    annualizedReturn,
    sharpe,
    maxDrawdown,
    winRate,
    tradesCount,
    barsCount,
  };
}

export function evaluateEmaCrossover(
  candles: Candle4h[],
  fastPeriod: number,
  slowPeriod: number
): StrategyMetrics {
  const barsCount = candles.length;
  if (barsCount < slowPeriod + 1) {
    return computeMetricsFromSignals(candles, [], slowPeriod);
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

  return computeMetricsFromSignals(candles, signals, slowPeriod);
}

export function evaluateRsiOversold(
  candles: Candle4h[],
  period: number,
  oversold: number,
  overbought: number
): StrategyMetrics {
  const barsCount = candles.length;
  if (barsCount < period + 1) {
    return computeMetricsFromSignals(candles, [], period);
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

  return computeMetricsFromSignals(candles, signals, period);
}

export function evaluateBreakout(
  candles: Candle4h[],
  lookback: number
): StrategyMetrics {
  const barsCount = candles.length;
  if (barsCount < lookback + 1) {
    return computeMetricsFromSignals(candles, [], lookback);
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

  return computeMetricsFromSignals(candles, signals, lookback);
}

export async function runBacktest(
  config: StrategyConfig
): Promise<BacktestResult> {
  const fromSec = Math.floor(new Date(config.from).getTime() / 1000);
  const toSec = Math.floor(new Date(config.to).getTime() / 1000);

  const perSymbolMetrics: SymbolBacktestResult[] = [];

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

    let metrics: StrategyMetrics;

    switch (config.type) {
      case "rsi_oversold": {
        const period = config.params.period || config.params.rsiPeriod || 14;
        const oversold = config.params.oversold || config.params.oversoldThreshold || 30;
        const overbought = config.params.overbought || config.params.overboughtThreshold || 70;
        metrics = evaluateRsiOversold(candles, period, oversold, overbought);
        break;
      }
      case "breakout": {
        const lookback = config.params.lookback || config.params.period || 20;
        metrics = evaluateBreakout(candles, lookback);
        break;
      }
      case "ema_crossover":
      default: {
        const fastPeriod = config.params.fastPeriod || config.params.fast || 12;
        const slowPeriod = config.params.slowPeriod || config.params.slow || 26;
        metrics = evaluateEmaCrossover(candles, fastPeriod, slowPeriod);
        break;
      }
    }

    perSymbolMetrics.push({ symbol: sym, metrics });
  }

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
  };
}
