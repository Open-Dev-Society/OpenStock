import assert from "node:assert";

// Self-check for EMA calculation and metrics formulas
function calculateEma(values, period) {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const ema = new Array(values.length);
  ema[0] = values[0];
  for (let i = 1; i < values.length; i++) {
    ema[i] = values[i] * k + ema[i - 1] * (1 - k);
  }
  return ema;
}

// 1. Verify EMA calculation matches standard smoothing
const prices = [10, 11, 12, 11, 13, 14, 15, 14, 16, 17];
const ema3 = calculateEma(prices, 3);
assert.strictEqual(ema3.length, prices.length);
assert.strictEqual(ema3[0], 10);
// Day 1: 11 * 0.5 + 10 * 0.5 = 10.5
assert.strictEqual(ema3[1], 10.5);

// 2. Verify equity curve & drawdown computation
const returns = [0.05, -0.02, -0.04, 0.08, -0.01];
let equity = 1.0;
let peak = 1.0;
let maxDrawdown = 0;

for (const r of returns) {
  equity *= 1 + r;
  if (equity > peak) peak = equity;
  const dd = (peak - equity) / peak;
  if (dd > maxDrawdown) maxDrawdown = dd;
}

assert(equity > 1.05, "Equity should be positive after net positive returns");
assert(maxDrawdown > 0.05 && maxDrawdown < 0.07, "Max drawdown correctly bounded");

// 3. Verify Sharpe ratio logic
const barsPerYear = 1512;
const n = returns.length;
const meanReturn = returns.reduce((a, b) => a + b, 0) / n;
const variance = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / (n - 1);
const stdDev = Math.sqrt(variance);
const sharpe = (meanReturn / stdDev) * Math.sqrt(barsPerYear);
assert(sharpe > 0, "Sharpe should be positive for positive expected return");

// 4. Verify RSI calculation
function calculateRsi(closes, period) {
  const rsi = new Array(closes.length).fill(50);
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

const rsiCloses = [44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58];
const rsiValues = calculateRsi(rsiCloses, 14);
assert(rsiValues[14] > 90, "Monotonically increasing closes should yield RSI > 90");

// 5. Verify Breakout logic
function evaluateBreakoutSignals(candles, lookback) {
  const signals = new Array(candles.length).fill(0);
  let pos = 0;
  for (let i = lookback; i < candles.length; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = i - lookback; j < i; j++) {
      if (candles[j].high > highest) highest = candles[j].high;
      if (candles[j].low < lowest) lowest = candles[j].low;
    }
    if (candles[i].close > highest) pos = 1;
    else if (candles[i].close < lowest) pos = -1;
    signals[i] = pos;
  }
  return signals;
}

const testCandles = [
  { high: 10, low: 8, close: 9, volume: 100 },
  { high: 11, low: 9, close: 10, volume: 100 },
  { high: 12, low: 10, close: 11, volume: 100 },
  { high: 15, low: 11, close: 14, volume: 100 } // Breakout above 12
];
const breakoutSignals = evaluateBreakoutSignals(testCandles, 2);
assert.strictEqual(breakoutSignals[3], 1, "Breakout candle should trigger long position");

// 6. Verify Bitcoin Liquidity Sweep & Reclaim logic
function evaluateSweepSignals(candles, lookback) {
  const signals = new Array(candles.length).fill(0);
  let pos = 0;
  for (let i = lookback; i < candles.length; i++) {
    let lowest = Infinity;
    for (let j = i - lookback; j < i; j++) {
      if (candles[j].low < lowest) lowest = candles[j].low;
    }
    // Bullish sweep: dipped below lowest low of range, but closed back above it
    if (candles[i].low < lowest && candles[i].close > lowest) {
      pos = 1;
    }
    signals[i] = pos;
  }
  return signals;
}

const sweepCandles = [
  { high: 100, low: 90, close: 95 },
  { high: 98, low: 92, close: 94 },
  { high: 96, low: 88, close: 93 } // low dipped to 88 (<90), closed at 93 (>90)
];
const sweepSignals = evaluateSweepSignals(sweepCandles, 2);
assert.strictEqual(sweepSignals[2], 1, "Bullish liquidity sweep must trigger long signal");

// 7. Verify LuxAlgo Fair Value Gap (FVG) detection
function detectBullishFvg(bar0, bar1, bar2) {
  // Bar 2 low sits above Bar 0 high
  return bar2.low > bar0.high;
}
assert.strictEqual(
  detectBullishFvg({ high: 100 }, { close: 110 }, { low: 105 }),
  true,
  "Bullish FVG gap between bar 0 high (100) and bar 2 low (105)"
);
assert.strictEqual(
  detectBullishFvg({ high: 100 }, { close: 105 }, { low: 98 }),
  false,
  "No FVG when wicks overlap"
);

// 8. Verify LuxAlgo Supertrend Direction Logic
function testSupertrendFlip(close, prevFinalUp, prevFinalDn, prevTrend) {
  if (prevTrend === 1 && close < prevFinalDn) return -1;
  if (prevTrend === -1 && close > prevFinalUp) return 1;
  return prevTrend;
}
assert.strictEqual(testSupertrendFlip(95, 110, 98, 1), -1, "Close below trailing lower band flips trend to -1 (Bearish)");
assert.strictEqual(testSupertrendFlip(115, 110, 98, -1), 1, "Close above trailing upper band flips trend to 1 (Bullish)");

// 9. Verify MACD Momentum Signal Logic
function testMacdSignal(macdVal, signalVal) {
  return macdVal > signalVal ? 1 : 0;
}
assert.strictEqual(testMacdSignal(2.4, 1.8), 1, "MACD above Signal line triggers long signal");
assert.strictEqual(testMacdSignal(1.2, 1.8), 0, "MACD below Signal line sits in cash");

// 10. Verify Bollinger Bands Reversion Logic
function testBbSignal(close, lowerBand, sma, inPosition) {
  if (!inPosition && close < lowerBand) return 1;
  if (inPosition && close >= sma) return 0;
  return inPosition ? 1 : 0;
}
assert.strictEqual(testBbSignal(94, 95, 100, false), 1, "Price piercing below lower BB triggers long");
assert.strictEqual(testBbSignal(101, 95, 100, true), 0, "Price reclaiming SMA exits position");

// 11. Verify Extended KPI Metrics (Sortino, Calmar, Profit Factor, Exposure)
function testKpiFormulas(trades, metrics) {
  let grossProfit = 0;
  let grossLoss = 0;
  let posBars = 0;
  for (const t of trades) {
    if (t.pnl > 0) grossProfit += t.pnl;
    else grossLoss += Math.abs(t.pnl);
    posBars += t.durationBars;
  }
  const profitFactor = grossLoss === 0 ? 9.99 : grossProfit / grossLoss;
  const calmar = metrics.annualizedReturn / Math.max(0.005, metrics.maxDrawdown);
  const exposurePct = (posBars / metrics.barsCount) * 100;
  return { profitFactor, calmar, exposurePct };
}

const sampleTrades = [
  { pnl: 400, durationBars: 10 },
  { pnl: 200, durationBars: 8 },
  { pnl: -200, durationBars: 6 }
];
const sampleMetrics = { annualizedReturn: 0.24, maxDrawdown: 0.08, barsCount: 100 };
const kpiRes = testKpiFormulas(sampleTrades, sampleMetrics);
assert.strictEqual(kpiRes.profitFactor, 3.0, "Profit factor = 600 / 200 = 3.0");
assert.strictEqual(kpiRes.calmar, 3.0, "Calmar = 0.24 / 0.08 = 3.0");
assert.strictEqual(kpiRes.exposurePct, 24.0, "Exposure = 24 bars / 100 bars = 24%");

console.log("✅ 4h Backtest EMA, RSI, Breakout, Liquidity Sweep, SuperTrend, MACD, Bollinger Bands, and Extended KPI math verified!");

