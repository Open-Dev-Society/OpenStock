export type StrategyType =
  | 'liquidity_sweep'
  | 'supertrend'
  | 'fair_value_gap'
  | 'order_block'
  | 'ema_crossover'
  | 'rsi_oversold'
  | 'breakout'
  | 'macd_momentum'
  | 'macd_cross'
  | 'bollinger_reversion'
  | 'bb_rev'
  | 'overnight_hold'
  | 'overnight'
  | 'buy_and_hold'
  | 'sma_golden'
  | 'hma_trend'
  | 'adx_trend'
  | 'stoch_rsi'
  | 'zscore_rev'
  | 'keltner'
  | 'tensortrade_rl';

export interface MatrixItem {
  symbol: string;
  strategy: string;
  strategyKey?: StrategyType;
  ret: number;
  cagr: number;
  mdd: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  winRate: number;
}

export interface StrategyGuide {
  id: string;
  name: string;
  description: string;
  rule: string;
  category:
    | 'Momentum'
    | 'Mean Reversion'
    | 'SMC'
    | 'Benchmark'
    | 'Session & Drift'
    | 'Classic Trend'
    | 'Trend & Volatility'
    | 'Momentum & Breakout';
}

export interface ExtendedKpiMetrics {
  sortino: number;
  calmar: number;
  profitFactor: number;
  exposurePct: number;
}

export const STRATEGY_OPTIONS: { value: StrategyType; label: string; group: string }[] = [
  { value: 'liquidity_sweep', label: 'Liquidity Sweep & Reclaim (BTC / Crypto)', group: 'Smart Money Concepts' },
  { value: 'supertrend', label: 'LuxAlgo SuperTrend (ATR Trailing Stop)', group: 'Trend & Volatility' },
  { value: 'fair_value_gap', label: 'LuxAlgo Smart Money FVG (Imbalance Retest)', group: 'Smart Money Concepts' },
  { value: 'order_block', label: 'LuxAlgo SMC Order Block (Displacement Retest)', group: 'Smart Money Concepts' },
  { value: 'ema_crossover', label: 'Dual EMA Crossover (Trend Following)', group: 'Classic Trend' },
  { value: 'macd_momentum', label: 'MACD Momentum Filter (Trend & Signal)', group: 'Classic Trend' },
  { value: 'rsi_oversold', label: 'RSI Oversold / Overbought (Mean Reversion)', group: 'Mean Reversion' },
  { value: 'bollinger_reversion', label: 'Bollinger Bands Mean Reversion (Statistical 2σ)', group: 'Mean Reversion' },
  { value: 'breakout', label: 'Donchian Channel Breakout (Momentum)', group: 'Momentum & Breakout' },
  { value: 'overnight_hold', label: 'Overnight Gap Drift (Close-to-Open Holding)', group: 'Session & Drift' },
  { value: 'buy_and_hold', label: 'Passive Buy & Hold (Benchmark)', group: 'Benchmark' },
  { value: 'tensortrade_rl', label: 'TensorTrade Deep RL Adaptive Q-Policy (Strategy Discovery)', group: 'Reinforcement Learning' },
];

export const STRATEGY_GUIDES: StrategyGuide[] = [
  {
    id: 'overnight_hold',
    name: 'Overnight Gap Drift',
    description: 'Exploits institutional after-hours rebalancing and overnight news flow. Enters on market close (16:00) and exits on market open (09:30).',
    rule: 'Entry: Mkt Close | Exit: Mkt Open next day',
    category: 'Session & Drift',
  },
  {
    id: 'ema_crossover',
    name: 'EMA 9/21 Trend Crossover',
    description: 'Fast-moving exponential trend capture. Holds long while 9-day EMA is above 21-day EMA. Sits in cash during corrections.',
    rule: 'Long: EMA(9) > EMA(21) | Cash: EMA(9) < EMA(21)',
    category: 'Classic Trend',
  },
  {
    id: 'macd_momentum',
    name: 'MACD Momentum Filter',
    description: 'Filters out prolonged bear phases. Remains long when MACD Line (12,26) exceeds its 9-period signal line.',
    rule: 'Long: MACD Line > Signal Line | Cash: Otherwise',
    category: 'Classic Trend',
  },
  {
    id: 'bollinger_reversion',
    name: 'Bollinger Bands Mean Reversion',
    description: 'Buys extreme statistical pullbacks. Triggers long entry when price closes below Lower Band (SMA20 - 2σ) and exits when price reclaims SMA20.',
    rule: 'Entry: Price < Lower BB | Exit: Price > SMA20',
    category: 'Mean Reversion',
  },
  {
    id: 'breakout',
    name: '20-Day Donchian Breakout',
    description: 'Classic Turtle Trading channel breakout. Buys on 20-day high breakouts and trailing exits on 10-day lows.',
    rule: 'Entry: Price > 20D High | Exit: Price < 10D Low',
    category: 'Momentum & Breakout',
  },
  {
    id: 'liquidity_sweep',
    name: 'SMC Liquidity Sweep & Reclaim',
    description: 'Institutional stop-hunt detection. Pierces rolling swing low on volume surge, reclaims channel level, targets range equilibrium.',
    rule: 'Long: Pierces Low & Closes Above | Exit: Range Midpoint',
    category: 'SMC',
  },
  {
    id: 'supertrend',
    name: 'LuxAlgo SuperTrend (ATR Trailing)',
    description: 'Adaptive trend-following volatility envelope. Tracks ATR-offset boundaries with flip trigger on closes above upper band.',
    rule: 'Long: Close > Upper Band | Exit: Close < Lower Band',
    category: 'Trend & Volatility',
  },
  {
    id: 'buy_and_hold',
    name: 'Buy & Hold Benchmark',
    description: 'Passive continuous long exposure across the full sample window. Serves as baseline for alpha and drawdown comparison.',
    rule: '100% Invested continuous exposure',
    category: 'Benchmark',
  },
  {
    id: 'tensortrade_rl',
    name: 'TensorTrade Deep RL Q-Policy',
    description: 'Multi-factor adaptive policy combining trend (EMA spread), momentum (RSI), and mean-reversion (Z-Score) signals with risk-adjusted Sortino reward optimization.',
    rule: 'Long: PolicyScore > 0.4 | Exit: PolicyScore < -0.3 | StopLoss: -RiskTol%',
    category: 'Momentum',
  },
];

export const ALPHA_MATRIX_YTD: MatrixItem[] = [
  { symbol: 'NVDA', strategy: 'Overnight Only', strategyKey: 'overnight_hold', ret: 37.39, cagr: 0, mdd: -9.50, sharpe: 2.40, sortino: 3.65, calmar: 3.94, winRate: 59.4 },
  { symbol: 'MSFT', strategy: 'EMA 9/21 Cross', strategyKey: 'ema_crossover', ret: 23.09, cagr: 0, mdd: -17.23, sharpe: 1.29, sortino: 1.82, calmar: 1.34, winRate: 46.8 },
  { symbol: 'AAPL', strategy: 'MACD Momentum', strategyKey: 'macd_momentum', ret: 21.70, cagr: 0, mdd: -10.64, sharpe: 1.59, sortino: 2.34, calmar: 2.04, winRate: 52.3 },
  { symbol: 'IWM', strategy: 'Buy & Hold', strategyKey: 'buy_and_hold', ret: 19.65, cagr: 0, mdd: -11.03, sharpe: 1.63, sortino: 2.21, calmar: 1.78, winRate: 54.1 },
  { symbol: 'AAPL', strategy: 'Buy & Hold', strategyKey: 'buy_and_hold', ret: 18.67, cagr: 0, mdd: -12.71, sharpe: 1.08, sortino: 1.51, calmar: 1.47, winRate: 53.2 },
  { symbol: 'QQQ', strategy: 'Buy & Hold', strategyKey: 'buy_and_hold', ret: 17.21, cagr: 0, mdd: -11.72, sharpe: 1.23, sortino: 1.76, calmar: 1.47, winRate: 54.5 },
  { symbol: 'AMZN', strategy: 'Buy & Hold', strategyKey: 'buy_and_hold', ret: 17.16, cagr: 0, mdd: -19.64, sharpe: 0.76, sortino: 1.05, calmar: 0.87, winRate: 51.0 },
  { symbol: 'NVDA', strategy: 'Buy & Hold', strategyKey: 'buy_and_hold', ret: 16.75, cagr: 0, mdd: -19.30, sharpe: 0.84, sortino: 1.18, calmar: 0.87, winRate: 52.4 },
  { symbol: 'IWM', strategy: 'EMA 9/21 Cross', strategyKey: 'ema_crossover', ret: 16.31, cagr: 0, mdd: -5.17, sharpe: 1.56, sortino: 2.45, calmar: 3.15, winRate: 48.6 },
  { symbol: 'NVDA', strategy: 'Bollinger Reversion', strategyKey: 'bollinger_reversion', ret: 15.82, cagr: 0, mdd: -9.38, sharpe: 1.33, sortino: 1.95, calmar: 1.69, winRate: 64.2 },
  { symbol: 'MSFT', strategy: '20D Donchian', strategyKey: 'breakout', ret: 14.63, cagr: 0, mdd: -19.71, sharpe: 0.94, sortino: 1.30, calmar: 0.74, winRate: 44.1 },
  { symbol: 'AMZN', strategy: 'Bollinger Reversion', strategyKey: 'bollinger_reversion', ret: 13.74, cagr: 0, mdd: -11.50, sharpe: 0.87, sortino: 1.25, calmar: 1.19, winRate: 61.8 },
  { symbol: 'SPY', strategy: 'Buy & Hold', strategyKey: 'buy_and_hold', ret: 13.30, cagr: 0, mdd: -8.88, sharpe: 1.50, sortino: 2.15, calmar: 1.50, winRate: 55.2 },
  { symbol: 'QQQ', strategy: 'Overnight Only', strategyKey: 'overnight_hold', ret: 12.39, cagr: 0, mdd: -9.03, sharpe: 1.33, sortino: 1.92, calmar: 1.37, winRate: 57.0 },
  { symbol: 'QQQ', strategy: 'MACD Momentum', strategyKey: 'macd_momentum', ret: 11.12, cagr: 0, mdd: -6.28, sharpe: 1.58, sortino: 2.38, calmar: 1.77, winRate: 53.6 },
  { symbol: 'IWM', strategy: 'Overnight Only', strategyKey: 'overnight_hold', ret: 10.50, cagr: 0, mdd: -11.76, sharpe: 1.26, sortino: 1.79, calmar: 0.89, winRate: 56.1 },
  { symbol: 'QQQ', strategy: 'EMA 9/21 Cross', strategyKey: 'ema_crossover', ret: 10.29, cagr: 0, mdd: -7.71, sharpe: 1.00, sortino: 1.44, calmar: 1.33, winRate: 47.5 },
  { symbol: 'MSFT', strategy: 'Buy & Hold', strategyKey: 'buy_and_hold', ret: 9.91, cagr: 0, mdd: -26.70, sharpe: 0.48, sortino: 0.65, calmar: 0.37, winRate: 49.3 },
  { symbol: 'SPY', strategy: 'MACD Momentum', strategyKey: 'macd_momentum', ret: 9.75, cagr: 0, mdd: -2.85, sharpe: 2.06, sortino: 3.42, calmar: 3.42, winRate: 58.0 },
  { symbol: 'AMZN', strategy: 'MACD Momentum', strategyKey: 'macd_momentum', ret: 9.75, cagr: 0, mdd: -14.15, sharpe: 0.76, sortino: 1.08, calmar: 0.69, winRate: 50.8 },
  { symbol: 'AMZN', strategy: 'Overnight Only', strategyKey: 'overnight_hold', ret: 9.10, cagr: 0, mdd: -21.58, sharpe: 0.63, sortino: 0.88, calmar: 0.42, winRate: 55.4 },
  { symbol: 'SPY', strategy: 'Overnight Only', strategyKey: 'overnight_hold', ret: 9.01, cagr: 0, mdd: -7.09, sharpe: 1.50, sortino: 2.22, calmar: 1.27, winRate: 57.8 },
  { symbol: 'SPY', strategy: '20D Donchian', strategyKey: 'breakout', ret: 8.86, cagr: 0, mdd: -4.49, sharpe: 1.40, sortino: 2.10, calmar: 1.97, winRate: 46.2 },
  { symbol: 'SPY', strategy: 'Bollinger Reversion', strategyKey: 'bollinger_reversion', ret: 8.52, cagr: 0, mdd: -6.57, sharpe: 1.63, sortino: 2.52, calmar: 1.30, winRate: 67.5 },
  { symbol: 'IWM', strategy: 'MACD Momentum', strategyKey: 'macd_momentum', ret: 7.29, cagr: 0, mdd: -6.16, sharpe: 0.99, sortino: 1.41, calmar: 1.18, winRate: 51.4 },
  { symbol: 'QQQ', strategy: '20D Donchian', strategyKey: 'breakout', ret: 6.85, cagr: 0, mdd: -8.83, sharpe: 0.98, sortino: 1.39, calmar: 0.78, winRate: 45.0 },
  { symbol: 'AAPL', strategy: 'EMA 9/21 Cross', strategyKey: 'ema_crossover', ret: 6.22, cagr: 0, mdd: -10.78, sharpe: 0.55, sortino: 0.78, calmar: 0.58, winRate: 46.3 },
  { symbol: 'IWM', strategy: 'Bollinger Reversion', strategyKey: 'bollinger_reversion', ret: 5.96, cagr: 0, mdd: -5.36, sharpe: 0.97, sortino: 1.46, calmar: 1.11, winRate: 63.9 },
  { symbol: 'SPY', strategy: 'EMA 9/21 Cross', strategyKey: 'ema_crossover', ret: 5.55, cagr: 0, mdd: -4.87, sharpe: 0.88, sortino: 1.28, calmar: 1.14, winRate: 45.8 },
  { symbol: 'AAPL', strategy: 'Bollinger Reversion', strategyKey: 'bollinger_reversion', ret: 4.91, cagr: 0, mdd: -8.05, sharpe: 0.57, sortino: 0.84, calmar: 0.61, winRate: 62.0 },
  { symbol: 'QQQ', strategy: 'Bollinger Reversion', strategyKey: 'bollinger_reversion', ret: 3.85, cagr: 0, mdd: -7.35, sharpe: 0.57, sortino: 0.82, calmar: 0.52, winRate: 60.5 },
  { symbol: 'MSFT', strategy: 'Overnight Only', strategyKey: 'overnight_hold', ret: 3.68, cagr: 0, mdd: -12.71, sharpe: 0.34, sortino: 0.48, calmar: 0.29, winRate: 54.0 },
  { symbol: 'MSFT', strategy: 'MACD Momentum', strategyKey: 'macd_momentum', ret: 3.63, cagr: 0, mdd: -16.76, sharpe: 0.33, sortino: 0.45, calmar: 0.22, winRate: 48.7 },
  { symbol: 'IWM', strategy: '20D Donchian', strategyKey: 'breakout', ret: 3.10, cagr: 0, mdd: -6.71, sharpe: 0.42, sortino: 0.59, calmar: 0.46, winRate: 43.5 },
  { symbol: 'AMZN', strategy: 'EMA 9/21 Cross', strategyKey: 'ema_crossover', ret: 0.65, cagr: 0, mdd: -18.94, sharpe: 0.15, sortino: 0.20, calmar: 0.03, winRate: 44.0 },
  { symbol: 'NVDA', strategy: 'MACD Momentum', strategyKey: 'macd_momentum', ret: -0.31, cagr: 0, mdd: -11.96, sharpe: 0.10, sortino: 0.14, calmar: -0.03, winRate: 47.9 },
  { symbol: 'MSFT', strategy: 'Bollinger Reversion', strategyKey: 'bollinger_reversion', ret: -1.66, cagr: 0, mdd: -12.75, sharpe: -0.09, sortino: -0.12, calmar: -0.13, winRate: 58.3 },
  { symbol: 'AAPL', strategy: 'Overnight Only', strategyKey: 'overnight_hold', ret: -2.19, cagr: 0, mdd: -13.35, sharpe: -0.14, sortino: -0.19, calmar: -0.16, winRate: 52.8 },
  { symbol: 'AAPL', strategy: '20D Donchian', strategyKey: 'breakout', ret: -3.30, cagr: 0, mdd: -13.34, sharpe: -0.16, sortino: -0.22, calmar: -0.25, winRate: 42.1 },
  { symbol: 'AMZN', strategy: '20D Donchian', strategyKey: 'breakout', ret: -4.46, cagr: 0, mdd: -16.84, sharpe: -0.28, sortino: -0.37, calmar: -0.26, winRate: 41.5 },
  { symbol: 'NVDA', strategy: 'EMA 9/21 Cross', strategyKey: 'ema_crossover', ret: -9.70, cagr: 0, mdd: -21.62, sharpe: -0.36, sortino: -0.49, calmar: -0.45, winRate: 43.0 },
  { symbol: 'NVDA', strategy: '20D Donchian', strategyKey: 'breakout', ret: -14.48, cagr: 0, mdd: -17.64, sharpe: -0.85, sortino: -1.15, calmar: -0.82, winRate: 39.8 },
];

export const ALPHA_MATRIX_5YR: MatrixItem[] = [
  { symbol: 'NVDA', strategy: 'Buy & Hold', strategyKey: 'buy_and_hold', ret: 1018.0, cagr: 61.2, mdd: -66.3, sharpe: 1.18, sortino: 1.74, calmar: 0.92, winRate: 54.8 },
  { symbol: 'NVDA', strategy: 'Overnight Only', strategyKey: 'overnight_hold', ret: 548.9, cagr: 44.8, mdd: -56.4, sharpe: 1.31, sortino: 1.95, calmar: 0.79, winRate: 58.6 },
  { symbol: 'NVDA', strategy: 'EMA 9/21 Cross', strategyKey: 'ema_crossover', ret: 352.7, cagr: 34.8, mdd: -47.7, sharpe: 0.97, sortino: 1.42, calmar: 0.73, winRate: 47.9 },
  { symbol: 'NVDA', strategy: '20D Donchian', strategyKey: 'breakout', ret: 267.9, cagr: 29.4, mdd: -37.6, sharpe: 0.93, sortino: 1.38, calmar: 0.78, winRate: 46.2 },
  { symbol: 'NVDA', strategy: 'MACD Momentum', strategyKey: 'macd_momentum', ret: 234.7, cagr: 27.0, mdd: -52.2, sharpe: 0.84, sortino: 1.22, calmar: 0.52, winRate: 51.5 },
  { symbol: 'NVDA', strategy: 'Bollinger Reversion', strategyKey: 'bollinger_reversion', ret: 196.4, cagr: 24.0, mdd: -40.0, sharpe: 0.95, sortino: 1.40, calmar: 0.60, winRate: 64.0 },
  { symbol: 'AAPL', strategy: 'Buy & Hold', strategyKey: 'buy_and_hold', ret: 126.5, cagr: 17.5, mdd: -33.4, sharpe: 0.72, sortino: 1.05, calmar: 0.52, winRate: 53.6 },
  { symbol: 'QQQ', strategy: 'Buy & Hold', strategyKey: 'buy_and_hold', ret: 102.6, cagr: 15.0, mdd: -35.1, sharpe: 0.73, sortino: 1.06, calmar: 0.43, winRate: 54.0 },
  { symbol: 'AMZN', strategy: 'Overnight Only', strategyKey: 'overnight_hold', ret: 93.3, cagr: 13.9, mdd: -37.3, sharpe: 0.64, sortino: 0.92, calmar: 0.37, winRate: 56.4 },
  { symbol: 'MSFT', strategy: 'Buy & Hold', strategyKey: 'buy_and_hold', ret: 89.6, cagr: 13.5, mdd: -37.1, sharpe: 0.59, sortino: 0.84, calmar: 0.36, winRate: 52.8 },
  { symbol: 'MSFT', strategy: 'Bollinger Reversion', strategyKey: 'bollinger_reversion', ret: 88.7, cagr: 13.4, mdd: -13.1, sharpe: 0.91, sortino: 1.39, calmar: 1.02, winRate: 65.1 },
  { symbol: 'SPY', strategy: 'Buy & Hold', strategyKey: 'buy_and_hold', ret: 88.3, cagr: 13.3, mdd: -24.5, sharpe: 0.82, sortino: 1.19, calmar: 0.54, winRate: 55.4 },
  { symbol: 'AAPL', strategy: 'MACD Momentum', strategyKey: 'macd_momentum', ret: 73.3, cagr: 11.5, mdd: -20.9, sharpe: 0.70, sortino: 1.02, calmar: 0.55, winRate: 52.0 },
  { symbol: 'MSFT', strategy: 'EMA 9/21 Cross', strategyKey: 'ema_crossover', ret: 70.8, cagr: 11.2, mdd: -35.7, sharpe: 0.64, sortino: 0.91, calmar: 0.31, winRate: 46.5 },
  { symbol: 'IWM', strategy: 'Overnight Only', strategyKey: 'overnight_hold', ret: 65.7, cagr: 10.5, mdd: -19.2, sharpe: 0.80, sortino: 1.18, calmar: 0.55, winRate: 57.3 },
  { symbol: 'AAPL', strategy: '20D Donchian', strategyKey: 'breakout', ret: 63.2, cagr: 10.2, mdd: -17.9, sharpe: 0.70, sortino: 1.03, calmar: 0.57, winRate: 45.8 },
  { symbol: 'AAPL', strategy: 'EMA 9/21 Cross', strategyKey: 'ema_crossover', ret: 60.9, cagr: 9.9, mdd: -25.4, sharpe: 0.61, sortino: 0.88, calmar: 0.39, winRate: 46.1 },
  { symbol: 'QQQ', strategy: 'Overnight Only', strategyKey: 'overnight_hold', ret: 60.6, cagr: 9.8, mdd: -26.5, sharpe: 0.76, sortino: 1.11, calmar: 0.37, winRate: 57.8 },
  { symbol: 'AMZN', strategy: 'Buy & Hold', strategyKey: 'buy_and_hold', ret: 59.3, cagr: 9.6, mdd: -55.7, sharpe: 0.43, sortino: 0.61, calmar: 0.17, winRate: 50.8 },
  { symbol: 'SPY', strategy: 'EMA 9/21 Cross', strategyKey: 'ema_crossover', ret: 57.0, cagr: 9.3, mdd: -13.4, sharpe: 0.89, sortino: 1.34, calmar: 0.69, winRate: 47.4 },
  { symbol: 'AAPL', strategy: 'Bollinger Reversion', strategyKey: 'bollinger_reversion', ret: 56.1, cagr: 9.2, mdd: -17.5, sharpe: 0.62, sortino: 0.94, calmar: 0.53, winRate: 63.5 },
  { symbol: 'SPY', strategy: 'Bollinger Reversion', strategyKey: 'bollinger_reversion', ret: 53.7, cagr: 8.9, mdd: -10.4, sharpe: 0.80, sortino: 1.25, calmar: 0.86, winRate: 66.8 },
  { symbol: 'MSFT', strategy: 'Overnight Only', strategyKey: 'overnight_hold', ret: 52.3, cagr: 8.7, mdd: -25.9, sharpe: 0.55, sortino: 0.79, calmar: 0.34, winRate: 55.0 },
  { symbol: 'MSFT', strategy: '20D Donchian', strategyKey: 'breakout', ret: 51.4, cagr: 8.6, mdd: -24.6, sharpe: 0.56, sortino: 0.81, calmar: 0.35, winRate: 45.0 },
  { symbol: 'QQQ', strategy: 'EMA 9/21 Cross', strategyKey: 'ema_crossover', ret: 48.7, cagr: 8.2, mdd: -27.0, sharpe: 0.61, sortino: 0.89, calmar: 0.30, winRate: 46.8 },
  { symbol: 'AMZN', strategy: 'EMA 9/21 Cross', strategyKey: 'ema_crossover', ret: 47.3, cagr: 8.0, mdd: -33.5, sharpe: 0.44, sortino: 0.63, calmar: 0.24, winRate: 45.5 },
  { symbol: 'SPY', strategy: 'Overnight Only', strategyKey: 'overnight_hold', ret: 43.9, cagr: 7.5, mdd: -19.6, sharpe: 0.76, sortino: 1.13, calmar: 0.38, winRate: 57.2 },
  { symbol: 'IWM', strategy: 'Buy & Hold', strategyKey: 'buy_and_hold', ret: 43.4, cagr: 7.4, mdd: -31.9, sharpe: 0.43, sortino: 0.60, calmar: 0.23, winRate: 53.0 },
  { symbol: 'QQQ', strategy: '20D Donchian', strategyKey: 'breakout', ret: 41.9, cagr: 7.2, mdd: -17.8, sharpe: 0.62, sortino: 0.91, calmar: 0.40, winRate: 46.0 },
  { symbol: 'SPY', strategy: '20D Donchian', strategyKey: 'breakout', ret: 39.8, cagr: 6.9, mdd: -9.5, sharpe: 0.75, sortino: 1.15, calmar: 0.73, winRate: 46.9 },
  { symbol: 'SPY', strategy: 'MACD Momentum', strategyKey: 'macd_momentum', ret: 38.8, cagr: 6.7, mdd: -15.0, sharpe: 0.68, sortino: 1.01, calmar: 0.45, winRate: 52.4 },
  { symbol: 'AMZN', strategy: 'Bollinger Reversion', strategyKey: 'bollinger_reversion', ret: 36.6, cagr: 6.4, mdd: -34.9, sharpe: 0.39, sortino: 0.56, calmar: 0.18, winRate: 62.0 },
  { symbol: 'QQQ', strategy: 'MACD Momentum', strategyKey: 'macd_momentum', ret: 33.2, cagr: 5.8, mdd: -24.8, sharpe: 0.48, sortino: 0.70, calmar: 0.23, winRate: 51.1 },
  { symbol: 'IWM', strategy: 'EMA 9/21 Cross', strategyKey: 'ema_crossover', ret: 25.2, cagr: 4.6, mdd: -25.2, sharpe: 0.37, sortino: 0.52, calmar: 0.18, winRate: 45.2 },
  { symbol: 'IWM', strategy: 'Bollinger Reversion', strategyKey: 'bollinger_reversion', ret: 25.0, cagr: 4.5, mdd: -12.0, sharpe: 0.42, sortino: 0.63, calmar: 0.38, winRate: 63.1 },
  { symbol: 'AMZN', strategy: '20D Donchian', strategyKey: 'breakout', ret: 19.8, cagr: 3.6, mdd: -20.7, sharpe: 0.28, sortino: 0.40, calmar: 0.17, winRate: 44.5 },
  { symbol: 'IWM', strategy: 'MACD Momentum', strategyKey: 'macd_momentum', ret: 18.3, cagr: 3.4, mdd: -22.0, sharpe: 0.29, sortino: 0.41, calmar: 0.15, winRate: 50.3 },
  { symbol: 'QQQ', strategy: 'Bollinger Reversion', strategyKey: 'bollinger_reversion', ret: 16.7, cagr: 3.1, mdd: -15.9, sharpe: 0.28, sortino: 0.42, calmar: 0.19, winRate: 61.2 },
  { symbol: 'IWM', strategy: '20D Donchian', strategyKey: 'breakout', ret: 14.9, cagr: 2.8, mdd: -15.6, sharpe: 0.28, sortino: 0.40, calmar: 0.18, winRate: 44.0 },
  { symbol: 'MSFT', strategy: 'MACD Momentum', strategyKey: 'macd_momentum', ret: -11.2, cagr: -2.3, mdd: -41.9, sharpe: -0.02, sortino: -0.03, calmar: -0.05, winRate: 48.0 },
  { symbol: 'AMZN', strategy: 'MACD Momentum', strategyKey: 'macd_momentum', ret: -17.3, cagr: -3.7, mdd: -34.5, sharpe: -0.03, sortino: -0.04, calmar: -0.11, winRate: 47.6 },
  { symbol: 'AAPL', strategy: 'Overnight Only', strategyKey: 'overnight_hold', ret: -43.5, cagr: -10.7, mdd: -58.0, sharpe: -0.57, sortino: -0.78, calmar: -0.18, winRate: 50.1 },
];
