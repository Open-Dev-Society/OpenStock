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
    | "order_block"
    | "macd_momentum"
    | "bollinger_reversion"
    | "overnight_hold"
    | "buy_and_hold"
    | "hma_trend"
    | "adx_trend"
    | "stoch_rsi"
    | "zscore_rev"
    | "bb_rev"
    | "keltner"
    | "macd_cross"
    | "overnight"
    | "sma_golden";
  params: Record<string, number>;
  symbols: string[];
  from: Date | string;
  to: Date | string;
  timeframe?: string;
}

export interface StrategyMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  profitFactor: number;
  maxDrawdown: number;
  winRate: number;
  exposure: number;
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

export function calcSMA(values: number[], period: number): number[] {
  const n = values.length;
  const p = Math.max(1, Math.round(period));
  const sma = new Array(n).fill(values[0] || 0);
  if (n < p) return sma;

  let sum = 0;
  for (let i = 0; i < p; i++) sum += values[i];
  sma[p - 1] = sum / p;

  for (let i = p; i < n; i++) {
    sum += values[i] - values[i - p];
    sma[i] = sum / p;
  }
  return sma;
}

export function calcWMA(prices: number[], period: number): number[] {
  const n = prices.length;
  const p = Math.max(1, Math.round(period));
  const wma = new Array(n).fill(prices[0] || 0);
  if (n < p) return wma;

  const denom = (p * (p + 1)) / 2;
  let sum = 0;
  let weightedSum = 0;

  for (let i = 0; i < p; i++) {
    sum += prices[i];
    weightedSum += prices[i] * (i + 1);
  }
  wma[p - 1] = weightedSum / denom;

  for (let i = p; i < n; i++) {
    weightedSum += prices[i] * p - sum;
    sum += prices[i] - prices[i - p];
    wma[i] = weightedSum / denom;
  }
  return wma;
}

export function calcHMA(prices: number[], period: number): number[] {
  const p = Math.max(2, Math.round(period));
  const halfP = Math.max(1, Math.round(p / 2));
  const sqrtP = Math.max(1, Math.round(Math.sqrt(p)));
  const wmaHalf = calcWMA(prices, halfP);
  const wmaFull = calcWMA(prices, p);
  const diff = new Array(prices.length);
  for (let i = 0; i < prices.length; i++) {
    diff[i] = 2 * wmaHalf[i] - wmaFull[i];
  }
  return calcWMA(diff, sqrtP);
}

export function calcATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number
): number[] {
  const n = closes.length;
  if (n === 0) return [];
  const p = Math.max(1, Math.round(period));
  const tr = new Array(n);
  tr[0] = highs[0] - lows[0];
  for (let i = 1; i < n; i++) {
    tr[i] = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
  }

  const atr = new Array(n).fill(tr[0]);
  if (n < p) return atr;

  let sum = 0;
  for (let i = 0; i < p; i++) sum += tr[i];
  atr[p - 1] = sum / p;

  for (let i = p; i < n; i++) {
    atr[i] = (atr[i - 1] * (p - 1) + tr[i]) / p;
  }
  return atr;
}

export function calcADX(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number
): { adx: number[]; plusDI: number[]; minusDI: number[] } {
  const n = closes.length;
  if (n === 0) return { adx: [], plusDI: [], minusDI: [] };
  const p = Math.max(1, Math.round(period));

  const tr = new Array(n);
  const plusDM = new Array(n);
  const minusDM = new Array(n);

  tr[0] = highs[0] - lows[0];
  plusDM[0] = 0;
  minusDM[0] = 0;

  for (let i = 1; i < n; i++) {
    tr[i] = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    plusDM[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDM[i] = downMove > upMove && downMove > 0 ? downMove : 0;
  }

  const trSmooth = calculateEma(tr, p);
  const plusDMSmooth = calculateEma(plusDM, p);
  const minusDMSmooth = calculateEma(minusDM, p);

  const dx = new Array(n).fill(0);
  const plusDI = new Array(n).fill(0);
  const minusDI = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    plusDI[i] = trSmooth[i] === 0 ? 0 : (plusDMSmooth[i] / trSmooth[i]) * 100;
    minusDI[i] = trSmooth[i] === 0 ? 0 : (minusDMSmooth[i] / trSmooth[i]) * 100;
    const sum = plusDI[i] + minusDI[i];
    dx[i] = sum === 0 ? 0 : (Math.abs(plusDI[i] - minusDI[i]) / sum) * 100;
  }

  const adx = calculateEma(dx, p);
  return { adx, plusDI, minusDI };
}

export function calcStochRSI(
  prices: number[],
  period: number,
  smoothK: number = 3,
  smoothD: number = 3
): { k: number[]; d: number[] } {
  const rsi = calculateRsi(prices, period);
  const n = prices.length;
  const p = Math.max(1, Math.round(period));
  const rawStoch = new Array(n).fill(50);

  for (let i = p - 1; i < n; i++) {
    let minRsi = rsi[i];
    let maxRsi = rsi[i];
    const start = Math.max(0, i - p + 1);
    for (let j = start; j < i; j++) {
      if (rsi[j] < minRsi) minRsi = rsi[j];
      if (rsi[j] > maxRsi) maxRsi = rsi[j];
    }
    rawStoch[i] =
      maxRsi - minRsi === 0 ? 50 : ((rsi[i] - minRsi) / (maxRsi - minRsi)) * 100;
  }
  const k = calcSMA(rawStoch, smoothK);
  const d = calcSMA(k, smoothD);
  return { k, d };
}

export function calcZScore(prices: number[], period: number): number[] {
  const n = prices.length;
  const zscores = new Array(n).fill(0);
  const p = Math.max(2, Math.round(period));
  if (n < p) return zscores;

  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < p; i++) {
    sum += prices[i];
    sumSq += prices[i] * prices[i];
  }
  let mean = sum / p;
  let variance = Math.max(0, sumSq / p - mean * mean);
  let std = Math.sqrt(variance);
  zscores[p - 1] = std === 0 ? 0 : (prices[p - 1] - mean) / std;

  for (let i = p; i < n; i++) {
    const prev = prices[i - p];
    const curr = prices[i];
    sum += curr - prev;
    sumSq += curr * curr - prev * prev;
    mean = sum / p;
    variance = Math.max(0, sumSq / p - mean * mean);
    std = Math.sqrt(variance);
    zscores[i] = std === 0 ? 0 : (curr - mean) / std;
  }
  return zscores;
}

export function calcBollingerBands(
  prices: number[],
  period: number,
  stdDevMult: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const n = prices.length;
  const p = Math.max(2, Math.round(period));
  const middle = calcSMA(prices, p);
  const upper = new Array(n).fill(prices[0] || 0);
  const lower = new Array(n).fill(prices[0] || 0);

  if (n < p) return { upper, middle, lower };

  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < p; i++) {
    sum += prices[i];
    sumSq += prices[i] * prices[i];
  }
  let mean = sum / p;
  let variance = Math.max(0, sumSq / p - mean * mean);
  let std = Math.sqrt(variance);
  upper[p - 1] = middle[p - 1] + stdDevMult * std;
  lower[p - 1] = middle[p - 1] - stdDevMult * std;

  for (let i = p; i < n; i++) {
    const prev = prices[i - p];
    const curr = prices[i];
    sum += curr - prev;
    sumSq += curr * curr - prev * prev;
    mean = sum / p;
    variance = Math.max(0, sumSq / p - mean * mean);
    std = Math.sqrt(variance);
    upper[i] = middle[i] + stdDevMult * std;
    lower[i] = middle[i] - stdDevMult * std;
  }

  return { upper, middle, lower };
}

export function calcKeltner(
  highs: number[],
  lows: number[],
  closes: number[],
  emaPeriod: number = 20,
  atrPeriod: number = 10,
  atrMult: number = 1.5
): { upper: number[]; middle: number[]; lower: number[] } {
  const n = closes.length;
  const middle = calculateEma(closes, emaPeriod);
  const atr = calcATR(highs, lows, closes, atrPeriod);
  const upper = new Array(n).fill(0);
  const lower = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    upper[i] = middle[i] + atrMult * atr[i];
    lower[i] = middle[i] - atrMult * atr[i];
  }

  return { upper, middle, lower };
}

function computeMetricsFromSignals(
  candles: Candle4h[],
  signals: number[],
  warmupBars: number,
  symbol: string = "UNKNOWN",
  initialBalance: number = 10000,
  isOvernight: boolean = false,
  timeframe: string = "4h"
): StrategyEvaluationResult {
  const barsCount = candles.length;
  if (barsCount < warmupBars + 1) {
    return {
      metrics: {
        totalReturn: 0,
        annualizedReturn: 0,
        sharpe: 0,
        sortino: 0,
        calmar: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        winRate: 0,
        exposure: 0,
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

  if (isOvernight) {
    for (let i = 1; i < barsCount; i++) {
      const prevClose = closes[i - 1];
      const currOpen = candles[i].open;
      const barReturn = prevClose !== 0 ? (currOpen - prevClose) / prevClose : 0;
      returns.push(barReturn);
      totalPositionBars++;
      if (barReturn > 0) winningTrades++;
      tradesCount++;

      const tradePnl = currentBalance * barReturn;
      currentBalance += tradePnl;

      trades.push({
        id: `${symbol}-${tradeIndex++}`,
        symbol,
        type: "long",
        entryTime: new Date(candles[i - 1].time),
        entryPrice: Math.round(prevClose * 100) / 100,
        exitTime: new Date(candles[i].time),
        exitPrice: Math.round(currOpen * 100) / 100,
        pnl: Math.round(tradePnl * 100) / 100,
        returnPct: Math.round(barReturn * 10000) / 10000,
        balance: Math.round(currentBalance * 100) / 100,
        durationBars: 1,
      });
    }
  } else {
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

      if (currSignal !== prevSignal) {
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
          entryTime: new Date(entryTime),
          entryPrice: Math.round(entryPrice * 100) / 100,
          exitTime: new Date(candles[i].time),
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
  }

  if (returns.length === 0) {
    return {
      metrics: {
        totalReturn: 0,
        annualizedReturn: 0,
        sharpe: 0,
        sortino: 0,
        calmar: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        winRate: 0,
        exposure: 0,
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
  const firstTime = candles[warmupBars]?.time
    ? new Date(candles[warmupBars].time).getTime()
    : new Date(candles[0].time).getTime();
  const lastTime = new Date(candles[barsCount - 1].time).getTime();
  const years = Math.max((lastTime - firstTime) / (365.25 * 24 * 3600 * 1000), 0.01);
  const isCrypto = /USDT$|USD$|BTC$|ETH$|^BINANCE:/i.test(symbol);
  const TF_ANNUAL_BARS: Record<string, { crypto: number; tradfi: number }> = {
    "15m": { crypto: 35040, tradfi: 6552 },
    "1h":  { crypto: 8760,  tradfi: 1638 },
    "4h":  { crypto: 2190,  tradfi: 504 },
    "1d":  { crypto: 365,   tradfi: 252 },
  };
  const barsPerYear =
    TF_ANNUAL_BARS[timeframe]?.[isCrypto ? "crypto" : "tradfi"] ??
    (years > 0 ? n / years : isCrypto ? 2190 : 504);

  const meanReturn = returns.reduce((acc, v) => acc + v, 0) / n;
  const variance =
    n > 1
      ? returns.reduce((acc, v) => acc + Math.pow(v - meanReturn, 2), 0) / (n - 1)
      : 0;
  const stdDev = Math.sqrt(variance);

  const sharpe =
    stdDev > 0 && barsPerYear > 0 ? (meanReturn / stdDev) * Math.sqrt(barsPerYear) : 0;
  const annualizedReturn =
    n > 0 && barsPerYear > 0 && totalReturn > -1
      ? Math.pow(1 + totalReturn, barsPerYear / n) - 1
      : totalReturn <= -1
      ? -1
      : 0;

  // 1. Sortino Ratio (annualized mean return over downside semi-deviation where r < 0 over total N)
  const downsideSumSq = returns.reduce((acc, v) => (v < 0 ? acc + v * v : acc), 0);
  const downsideVariance = n > 0 ? downsideSumSq / n : 0;
  const downsideDev = Math.sqrt(downsideVariance);
  const sortino =
    downsideDev > 0 && barsPerYear > 0
      ? (meanReturn / downsideDev) * Math.sqrt(barsPerYear)
      : meanReturn > 0
      ? 99.9
      : 0;

  // 2. Calmar Ratio (annualized return over max drawdown, bounded when MDD is 0)
  const calmar =
    maxDrawdown > 0
      ? annualizedReturn / maxDrawdown
      : annualizedReturn > 0
      ? 99.9
      : 0;

  // 3. Profit Factor (gross winning dollars / gross losing dollars)
  const grossProfit = trades
    .filter((t) => t.pnl > 0)
    .reduce((acc, t) => acc + t.pnl, 0);
  const grossLoss = Math.abs(
    trades
      .filter((t) => t.pnl < 0)
      .reduce((acc, t) => acc + t.pnl, 0)
  );
  const profitFactor =
    grossLoss > 0
      ? Math.round((grossProfit / grossLoss) * 100) / 100
      : grossProfit > 0
      ? 99.9
      : 0;

  // 4. Exposure Percentage (bars in market / total bars)
  const exposure =
    barsCount > 0
      ? Math.round((totalPositionBars / barsCount) * 10000) / 100
      : 0;

  const winRate =
    trades.length > 0
      ? Math.round((trades.filter((t) => t.pnl > 0).length / trades.length) * 10000) / 10000
      : totalPositionBars > 0
      ? winningTrades / totalPositionBars
      : 0;

  return {
    metrics: {
      totalReturn,
      annualizedReturn,
      sharpe,
      sortino,
      calmar,
      profitFactor,
      maxDrawdown,
      winRate,
      exposure,
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

// ── AlphaStudio: Hull Moving Average (HMA) Trend ─────────────────────
export function evaluateHmaTrend(
  candles: Candle4h[],
  fastPeriod: number = 9,
  slowPeriod: number = 21,
  symbol: string = "UNKNOWN",
  allowShort: boolean = false
): StrategyEvaluationResult {
  const barsCount = candles.length;
  const warmupBars = slowPeriod + Math.round(Math.sqrt(slowPeriod)) + 2;
  if (barsCount < warmupBars + 1) {
    return computeMetricsFromSignals(candles, [], warmupBars, symbol);
  }

  const closes = candles.map((c) => c.close);
  const hmaFast = calcHMA(closes, fastPeriod);
  const hmaSlow = calcHMA(closes, slowPeriod);

  const signals: number[] = new Array(barsCount).fill(0);
  for (let i = warmupBars; i < barsCount; i++) {
    signals[i] = hmaFast[i - 1] > hmaSlow[i - 1] ? 1 : (allowShort ? -1 : 0);
  }

  return computeMetricsFromSignals(candles, signals, warmupBars, symbol);
}

// ── AlphaStudio: ADX Directional Trend & Momentum ─────────────────────
export function evaluateAdxTrend(
  candles: Candle4h[],
  period: number = 14,
  adxThreshold: number = 25,
  symbol: string = "UNKNOWN",
  allowShort: boolean = false
): StrategyEvaluationResult {
  const barsCount = candles.length;
  const warmupBars = period * 2;
  if (barsCount < warmupBars + 1) {
    return computeMetricsFromSignals(candles, [], warmupBars, symbol);
  }

  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const closes = candles.map((c) => c.close);
  const { adx, plusDI, minusDI } = calcADX(highs, lows, closes, period);

  const signals: number[] = new Array(barsCount).fill(0);
  for (let i = warmupBars; i < barsCount; i++) {
    if (adx[i - 1] >= adxThreshold) {
      if (plusDI[i - 1] > minusDI[i - 1]) {
        signals[i] = 1;
      } else if (minusDI[i - 1] > plusDI[i - 1]) {
        signals[i] = allowShort ? -1 : 0;
      } else {
        signals[i] = 0;
      }
    } else {
      signals[i] = 0;
    }
  }

  return computeMetricsFromSignals(candles, signals, warmupBars, symbol);
}

// ── AlphaStudio: Stochastic RSI Momentum Swing ───────────────────────
export function evaluateStochRsi(
  candles: Candle4h[],
  period: number = 14,
  smoothK: number = 3,
  smoothD: number = 3,
  oversold: number = 20,
  overbought: number = 80,
  symbol: string = "UNKNOWN",
  allowShort: boolean = false
): StrategyEvaluationResult {
  const barsCount = candles.length;
  const warmupBars = period + smoothK + smoothD + 2;
  if (barsCount < warmupBars + 1) {
    return computeMetricsFromSignals(candles, [], warmupBars, symbol);
  }

  const closes = candles.map((c) => c.close);
  const { k, d } = calcStochRSI(closes, period, smoothK, smoothD);

  const signals: number[] = new Array(barsCount).fill(0);
  let currentPosition = 0;

  for (let i = warmupBars; i < barsCount; i++) {
    if (k[i - 1] < oversold && k[i - 1] > d[i - 1]) {
      currentPosition = 1;
    } else if (k[i - 1] > overbought && k[i - 1] < d[i - 1]) {
      currentPosition = allowShort ? -1 : 0;
    }
    signals[i] = currentPosition;
  }

  return computeMetricsFromSignals(candles, signals, warmupBars, symbol);
}

// ── AlphaStudio: Z-Score Statistical Mean Reversion ───────────────────
export function evaluateZScoreRev(
  candles: Candle4h[],
  period: number = 20,
  threshold: number = 2.0,
  symbol: string = "UNKNOWN",
  allowShort: boolean = false
): StrategyEvaluationResult {
  const barsCount = candles.length;
  const warmupBars = period + 2;
  if (barsCount < warmupBars + 1) {
    return computeMetricsFromSignals(candles, [], warmupBars, symbol);
  }

  const closes = candles.map((c) => c.close);
  const zscores = calcZScore(closes, period);

  const signals: number[] = new Array(barsCount).fill(0);
  let currentPosition = 0;

  for (let i = warmupBars; i < barsCount; i++) {
    if (zscores[i - 1] <= -threshold) {
      currentPosition = 1;
    } else if (zscores[i - 1] >= 0 && currentPosition === 1) {
      currentPosition = 0;
    } else if (zscores[i - 1] >= threshold && allowShort) {
      currentPosition = -1;
    } else if (zscores[i - 1] <= 0 && currentPosition === -1) {
      currentPosition = 0;
    }
    signals[i] = currentPosition;
  }

  return computeMetricsFromSignals(candles, signals, warmupBars, symbol);
}

// ── AlphaStudio: Bollinger Bands Mean Reversion ───────────────────────
export function evaluateBbRev(
  candles: Candle4h[],
  period: number = 20,
  stdDevMult: number = 2.0,
  symbol: string = "UNKNOWN",
  allowShort: boolean = false
): StrategyEvaluationResult {
  const barsCount = candles.length;
  const warmupBars = period + 2;
  if (barsCount < warmupBars + 1) {
    return computeMetricsFromSignals(candles, [], warmupBars, symbol);
  }

  const closes = candles.map((c) => c.close);
  const { upper, middle, lower } = calcBollingerBands(closes, period, stdDevMult);

  const signals: number[] = new Array(barsCount).fill(0);
  let currentPosition = 0;

  for (let i = warmupBars; i < barsCount; i++) {
    if (closes[i - 1] < lower[i - 1]) {
      currentPosition = 1;
    } else if (closes[i - 1] > middle[i - 1] && currentPosition === 1) {
      currentPosition = 0;
    } else if (closes[i - 1] > upper[i - 1] && allowShort) {
      currentPosition = -1;
    } else if (closes[i - 1] < middle[i - 1] && currentPosition === -1) {
      currentPosition = 0;
    }
    signals[i] = currentPosition;
  }

  return computeMetricsFromSignals(candles, signals, warmupBars, symbol);
}

// ── AlphaStudio: Keltner Channel Reversion ────────────────────────────
export function evaluateKeltner(
  candles: Candle4h[],
  emaPeriod: number = 20,
  atrPeriod: number = 10,
  atrMult: number = 1.5,
  symbol: string = "UNKNOWN",
  allowShort: boolean = false
): StrategyEvaluationResult {
  const barsCount = candles.length;
  const warmupBars = Math.max(emaPeriod, atrPeriod) + 2;
  if (barsCount < warmupBars + 1) {
    return computeMetricsFromSignals(candles, [], warmupBars, symbol);
  }

  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const closes = candles.map((c) => c.close);
  const { upper, middle, lower } = calcKeltner(highs, lows, closes, emaPeriod, atrPeriod, atrMult);

  const signals: number[] = new Array(barsCount).fill(0);
  let currentPosition = 0;

  for (let i = warmupBars; i < barsCount; i++) {
    if (closes[i - 1] < lower[i - 1]) {
      currentPosition = 1;
    } else if (closes[i - 1] > middle[i - 1] && currentPosition === 1) {
      currentPosition = 0;
    } else if (closes[i - 1] > upper[i - 1] && allowShort) {
      currentPosition = -1;
    } else if (closes[i - 1] < middle[i - 1] && currentPosition === -1) {
      currentPosition = 0;
    }
    signals[i] = currentPosition;
  }

  return computeMetricsFromSignals(candles, signals, warmupBars, symbol);
}

// ── AlphaStudio: MACD Momentum Cross ──────────────────────────────────
export function evaluateMacdCross(
  candles: Candle4h[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9,
  symbol: string = "UNKNOWN",
  allowShort: boolean = false
): StrategyEvaluationResult {
  const barsCount = candles.length;
  const warmupBars = slowPeriod + signalPeriod + 2;
  if (barsCount < warmupBars + 1) {
    return computeMetricsFromSignals(candles, [], warmupBars, symbol);
  }

  const closes = candles.map((c) => c.close);
  const fastEma = calculateEma(closes, fastPeriod);
  const slowEma = calculateEma(closes, slowPeriod);
  const macd = new Array(barsCount);
  for (let i = 0; i < barsCount; i++) macd[i] = fastEma[i] - slowEma[i];
  const signalLine = calculateEma(macd, signalPeriod);

  const signals: number[] = new Array(barsCount).fill(0);
  for (let i = warmupBars; i < barsCount; i++) {
    signals[i] = macd[i - 1] > signalLine[i - 1] ? 1 : (allowShort ? -1 : 0);
  }

  return computeMetricsFromSignals(candles, signals, warmupBars, symbol);
}

// ── AlphaStudio: Overnight Gap Drift (Close to Open) ──────────────────
export function evaluateOvernight(
  candles: Candle4h[],
  symbol: string = "UNKNOWN"
): StrategyEvaluationResult {
  const barsCount = candles.length;
  if (barsCount < 2) {
    return computeMetricsFromSignals(candles, [], 0, symbol);
  }

  return computeMetricsFromSignals(candles, [], 0, symbol, 10000, true);
}

// ── AlphaStudio: Dual SMA Golden/Death Cross ──────────────────────────
export function evaluateSmaGolden(
  candles: Candle4h[],
  fastPeriod: number = 50,
  slowPeriod: number = 200,
  symbol: string = "UNKNOWN",
  allowShort: boolean = false
): StrategyEvaluationResult {
  const barsCount = candles.length;
  const warmupBars = slowPeriod + 1;
  if (barsCount < warmupBars + 1) {
    return computeMetricsFromSignals(candles, [], warmupBars, symbol);
  }

  const closes = candles.map((c) => c.close);
  const smaFast = calcSMA(closes, fastPeriod);
  const smaSlow = calcSMA(closes, slowPeriod);

  const signals: number[] = new Array(barsCount).fill(0);
  for (let i = warmupBars; i < barsCount; i++) {
    signals[i] = smaFast[i - 1] > smaSlow[i - 1] ? 1 : (allowShort ? -1 : 0);
  }

  return computeMetricsFromSignals(candles, signals, warmupBars, symbol);
}

export async function runBacktest(
  config: StrategyConfig
): Promise<BacktestResult> {
  const fromSec = Math.floor(new Date(config.from).getTime() / 1000);
  const toSec = Math.floor(new Date(config.to).getTime() / 1000);

  const perSymbolMetrics: SymbolBacktestResult[] = [];
  const allTrades: IBacktestTrade[] = [];

  for (const sym of config.symbols) {
    const candles = await getOhlcv4h(sym, fromSec, toSec, config.timeframe || "4h");
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
      case "hma_trend":
        warmupBars =
          (config.params.slowPeriod || 21) +
          Math.round(Math.sqrt(config.params.slowPeriod || 21)) +
          2;
        break;
      case "adx_trend":
        warmupBars = (config.params.period || 14) * 2;
        break;
      case "stoch_rsi":
        warmupBars =
          (config.params.period || 14) +
          (config.params.smoothK || 3) +
          (config.params.smoothD || 3) +
          2;
        break;
      case "zscore_rev":
        warmupBars = (config.params.period || 20) + 2;
        break;
      case "bb_rev":
        warmupBars = (config.params.period || 20) + 2;
        break;
      case "keltner":
        warmupBars =
          Math.max(config.params.emaPeriod || 20, config.params.atrPeriod || 10) + 2;
        break;
      case "macd_cross":
        warmupBars =
          (config.params.slowPeriod || 26) +
          (config.params.signalPeriod || 9) +
          2;
        break;
      case "overnight":
        warmupBars = 1;
        break;
      case "sma_golden":
        warmupBars = (config.params.slowPeriod || 200) + 1;
        break;
      case "ema_crossover":
      default:
        warmupBars = config.params.slowPeriod || config.params.slow || 26;
        break;
    }

    if (!candles || candles.length <= warmupBars) {
      throw new Error(
        `Insufficient ${config.timeframe || "4h"} candles for ${sym}: got ${candles ? candles.length : 0}, requires > ${warmupBars} bars for warmup`
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
      case "hma_trend": {
        const fast = config.params.fastPeriod || config.params.fast || 9;
        const slow = config.params.slowPeriod || config.params.slow || 21;
        const allowShort = Boolean(config.params.allowShort);
        evalResult = evaluateHmaTrend(candles, fast, slow, sym, allowShort);
        break;
      }
      case "adx_trend": {
        const period = config.params.period || 14;
        const threshold =
          config.params.adxThreshold || config.params.minStrength || 25;
        const allowShort = Boolean(config.params.allowShort);
        evalResult = evaluateAdxTrend(candles, period, threshold, sym, allowShort);
        break;
      }
      case "stoch_rsi": {
        const period = config.params.period || 14;
        const smoothK = config.params.smoothK || 3;
        const smoothD = config.params.smoothD || 3;
        const oversold = config.params.oversold || 20;
        const overbought = config.params.overbought || 80;
        const allowShort = Boolean(config.params.allowShort);
        evalResult = evaluateStochRsi(
          candles,
          period,
          smoothK,
          smoothD,
          oversold,
          overbought,
          sym,
          allowShort
        );
        break;
      }
      case "zscore_rev": {
        const period = config.params.period || 20;
        const threshold =
          config.params.threshold !== undefined ? config.params.threshold : 2.0;
        const allowShort = Boolean(config.params.allowShort);
        evalResult = evaluateZScoreRev(candles, period, threshold, sym, allowShort);
        break;
      }
      case "bb_rev": {
        const period = config.params.period || 20;
        const stdDevMult =
          config.params.stdDevMult || config.params.mult || 2.0;
        const allowShort = Boolean(config.params.allowShort);
        evalResult = evaluateBbRev(candles, period, stdDevMult, sym, allowShort);
        break;
      }
      case "keltner": {
        const emaPeriod = config.params.emaPeriod || config.params.period || 20;
        const atrPeriod = config.params.atrPeriod || 10;
        const atrMult =
          config.params.atrMult || config.params.multiplier || 1.5;
        const allowShort = Boolean(config.params.allowShort);
        evalResult = evaluateKeltner(
          candles,
          emaPeriod,
          atrPeriod,
          atrMult,
          sym,
          allowShort
        );
        break;
      }
      case "macd_cross": {
        const fast = config.params.fastPeriod || config.params.fast || 12;
        const slow = config.params.slowPeriod || config.params.slow || 26;
        const signal = config.params.signalPeriod || config.params.signal || 9;
        const allowShort = Boolean(config.params.allowShort);
        evalResult = evaluateMacdCross(candles, fast, slow, signal, sym, allowShort);
        break;
      }
      case "overnight": {
        evalResult = evaluateOvernight(candles, sym);
        break;
      }
      case "sma_golden": {
        const fast = config.params.fastPeriod || config.params.fast || 50;
        const slow = config.params.slowPeriod || config.params.slow || 200;
        const allowShort = Boolean(config.params.allowShort);
        evalResult = evaluateSmaGolden(candles, fast, slow, sym, allowShort);
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
          sortino: 0,
          calmar: 0,
          profitFactor: 0,
          maxDrawdown: 0,
          winRate: 0,
          exposure: 0,
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
          sortino:
            perSymbolMetrics.reduce((s, m) => s + m.metrics.sortino, 0) / count,
          calmar:
            perSymbolMetrics.reduce((s, m) => s + m.metrics.calmar, 0) / count,
          profitFactor:
            perSymbolMetrics.reduce((s, m) => s + m.metrics.profitFactor, 0) / count,
          maxDrawdown: Math.max(
            ...perSymbolMetrics.map((m) => m.metrics.maxDrawdown)
          ),
          winRate:
            perSymbolMetrics.reduce((s, m) => s + m.metrics.winRate, 0) / count,
          exposure:
            perSymbolMetrics.reduce((s, m) => s + m.metrics.exposure, 0) / count,
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
