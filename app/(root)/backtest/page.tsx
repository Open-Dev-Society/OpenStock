'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Play,
  RotateCcw,
  Sparkles,
  DollarSign,
  Activity,
  Layers,
  Clock,
  AlertCircle,
  Code,
  TableProperties,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QUANT_SYMBOL_UNIVERSE } from '@/lib/market/symbols';
import KpiMetricsGrid from '@/components/backtest/KpiMetricsGrid';
import AlphaMatrixTable from '@/components/backtest/AlphaMatrixTable';
import CodeExportModal from '@/components/backtest/CodeExportModal';
import { StrategyType } from '@/components/backtest/types';

interface Trade {
  id: string;
  symbol: string;
  type: 'long' | 'short';
  entryTime: string;
  entryPrice: number;
  exitTime: string;
  exitPrice: number;
  pnl: number;
  returnPct: number;
  balance: number;
  durationBars: number;
}

interface BacktestData {
  _id: string;
  timeframe?: string;
  strategyType: string;
  symbols: string[];
  params: Record<string, number>;
  from: string;
  to: string;
  status: string;
  metrics?: {
    totalReturn: number;
    annualizedReturn: number;
    sharpe: number;
    maxDrawdown: number;
    winRate: number;
    tradesCount: number;
    barsCount: number;
  };
  trades?: Trade[];
}

export default function BacktestDashboardPage() {
  const [strategyType, setStrategyType] = useState<StrategyType>('liquidity_sweep');
  const [symbol, setSymbol] = useState('BINANCE:BTCUSDT');
  const [timeframe, setTimeframe] = useState<'15m' | '1h' | '4h' | '1d'>('4h');
  const [lookbackDays, setLookbackDays] = useState(365);
  const [activeViewTab, setActiveViewTab] = useState<'all' | 'backtest' | 'matrix'>('all');

  // Strategy Params - Classic
  const [fastPeriod, setFastPeriod] = useState(12);
  const [slowPeriod, setSlowPeriod] = useState(26);
  const [rsiPeriod, setRsiPeriod] = useState(14);
  const [rsiOversold, setRsiOversold] = useState(30);
  const [rsiOverbought, setRsiOverbought] = useState(70);
  const [breakoutLookback, setBreakoutLookback] = useState(20);
  const [sweepLookback, setSweepLookback] = useState(20);
  const [volMultiplier, setVolMultiplier] = useState(1.2);

  // LuxAlgo Strategy Parameters
  const [atrPeriod, setAtrPeriod] = useState(10);
  const [multiplier, setMultiplier] = useState(3);
  const [minGapPct, setMinGapPct] = useState(0.3);
  const [fvgHoldBars, setFvgHoldBars] = useState(8);
  const [obLookback, setObLookback] = useState(20);
  const [obHoldBars, setObHoldBars] = useState(8);

  // New Strategy Parameters
  const [macdFast, setMacdFast] = useState(12);
  const [macdSlow, setMacdSlow] = useState(26);
  const [macdSignal, setMacdSignal] = useState(9);
  const [bbPeriod, setBbPeriod] = useState(20);
  const [bbStdDev, setBbStdDev] = useState(2.0);
  const [smaFast, setSmaFast] = useState(50);
  const [smaSlow, setSmaSlow] = useState(200);
  const [hmaFast, setHmaFast] = useState(9);
  const [hmaSlow, setHmaSlow] = useState(21);
  const [adxPeriod, setAdxPeriod] = useState(14);
  const [adxThreshold, setAdxThreshold] = useState(25);
  const [stochPeriod, setStochPeriod] = useState(14);
  const [stochK, setStochK] = useState(3);
  const [stochD, setStochD] = useState(3);
  const [stochOversold, setStochOversold] = useState(20);
  const [stochOverbought, setStochOverbought] = useState(80);
  const [zscorePeriod, setZscorePeriod] = useState(20);
  const [zscoreThreshold, setZscoreThreshold] = useState(2.0);
  const [keltnerEma, setKeltnerEma] = useState(20);
  const [keltnerAtr, setKeltnerAtr] = useState(10);
  const [keltnerMult, setKeltnerMult] = useState(1.5);

  // Code Export Modal State
  const [isCodeExportOpen, setIsCodeExportOpen] = useState(false);

  // Backtest & AI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeBacktest, setActiveBacktest] = useState<BacktestData | null>(null);
  const [historyList, setHistoryList] = useState<BacktestData[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  // Fetch recent history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/strategy/backtest');
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setHistoryList(json.data);
        if (!activeBacktest && json.data.length > 0) {
          loadBacktest(json.data[0]._id);
        }
      }
    } catch (_) {}
  };

  const loadBacktest = async (id: string) => {
    try {
      const res = await fetch(`/api/strategy/backtest/${id}`);
      const json = await res.json();
      if (json.ok && json.data) {
        setActiveBacktest(json.data);
        setAiAnalysis(null);
      }
    } catch (_) {}
  };

  const getParamsForType = (): Record<string, number> => {
    switch (strategyType) {
      case 'ema_crossover':
        return { fastPeriod, slowPeriod };
      case 'rsi_oversold':
        return { period: rsiPeriod, oversold: rsiOversold, overbought: rsiOverbought };
      case 'breakout':
        return { lookback: breakoutLookback };
      case 'liquidity_sweep':
        return { lookback: sweepLookback, volMultiplier };
      case 'supertrend':
        return { atrPeriod, multiplier };
      case 'fair_value_gap':
        return { minGapPct, holdBars: fvgHoldBars };
      case 'order_block':
        return { lookback: obLookback, holdBars: obHoldBars };
      case 'macd_cross':
      case 'macd_momentum':
        return { fastPeriod: macdFast, slowPeriod: macdSlow, signalPeriod: macdSignal };
      case 'bb_rev':
      case 'bollinger_reversion':
        return { period: bbPeriod, stdDevMult: bbStdDev };
      case 'sma_golden':
      case 'buy_and_hold':
        return { fastPeriod: smaFast, slowPeriod: smaSlow };
      case 'hma_trend':
        return { fastPeriod: hmaFast, slowPeriod: hmaSlow };
      case 'adx_trend':
        return { period: adxPeriod, adxThreshold };
      case 'stoch_rsi':
        return {
          period: stochPeriod,
          smoothK: stochK,
          smoothD: stochD,
          oversold: stochOversold,
          overbought: stochOverbought,
        };
      case 'zscore_rev':
        return { period: zscorePeriod, threshold: zscoreThreshold };
      case 'keltner':
        return { emaPeriod: keltnerEma, atrPeriod: keltnerAtr, atrMult: keltnerMult };
      case 'overnight':
      case 'overnight_hold':
      default:
        return {};
    }
  };

  const handleRunBacktest = async () => {
    setLoading(true);
    setError(null);
    setAiAnalysis(null);

    const now = new Date();
    const from = new Date(now.getTime() - lookbackDays * 24 * 3600 * 1000);

    const payload = {
      type: strategyType,
      symbols: [symbol.trim()],
      timeframe,
      params: getParamsForType(),
      from: from.toISOString(),
      to: now.toISOString(),
      runDirect: true,
    };

    try {
      const res = await fetch('/api/strategy/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Failed to execute backtest');
      }

      if (json.data) {
        setActiveBacktest(json.data);
      } else if (json.backtestId) {
        await loadBacktest(json.backtestId);
      }
      await fetchHistory();
    } catch (err: any) {
      setError(err?.message || 'Backtest failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAiAnalysis = async () => {
    if (!activeBacktest) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/strategy/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backtestId: activeBacktest._id,
          prompt: `Conduct a professional quantitative trade audit for this ${activeBacktest.strategyType} strategy. Breakdown win-rate consistency, drawdown severity, Sortino, Calmar, and 2 concrete rule adjustments to improve Sharpe.`,
        }),
      });
      const json = await res.json();
      if (json.ok && json.analysis) {
        setAiAnalysis(json.analysis);
      } else {
        setAiAnalysis(json.error || 'AI analysis could not be generated.');
      }
    } catch (e: any) {
      setAiAnalysis(`AI Error: ${e.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleLoadStrategyFromMatrix = (matrixSymbol: string, matrixStrategy: StrategyType) => {
    const formattedSymbol = matrixSymbol === 'BTC' ? 'BINANCE:BTCUSDT' : matrixSymbol;
    setSymbol(formattedSymbol);
    setStrategyType(matrixStrategy);
    window.scrollTo({ top: 200, behavior: 'smooth' });
  };

  const metrics = activeBacktest?.metrics;
  const trades = activeBacktest?.trades || [];
  const initialCapital = 10000;
  const finalBalance =
    trades.length > 0
      ? trades[trades.length - 1].balance
      : initialCapital * (1 + (metrics?.totalReturn || 0));
  const totalProfit = finalBalance - initialCapital;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Layers className="h-6 w-6" />
            </span>
            Multi-Timeframe Quant Backtester &amp; Alpha Matrix
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Empirical cross-sectional performance matrix, 15m/1h/4h/daily algorithmic backtesting, Sortino/Calmar risk analytics, and 1-click multi-platform code export.
          </p>
        </div>

        {/* View Switcher & Export Code Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-gray-950 p-1 rounded-xl border border-gray-800">
            <button
              type="button"
              onClick={() => setActiveViewTab('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeViewTab === 'all'
                  ? 'bg-teal-500 text-black shadow-md shadow-teal-500/20'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Unified
            </button>
            <button
              type="button"
              onClick={() => setActiveViewTab('backtest')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeViewTab === 'backtest'
                  ? 'bg-teal-500 text-black shadow-md shadow-teal-500/20'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Backtester
            </button>
            <button
              type="button"
              onClick={() => setActiveViewTab('matrix')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeViewTab === 'matrix'
                  ? 'bg-teal-500 text-black shadow-md shadow-teal-500/20'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <TableProperties className="h-3.5 w-3.5" />
              Alpha Matrix
            </button>
          </div>

          <Button
            type="button"
            onClick={() => setIsCodeExportOpen(true)}
            variant="outline"
            className="border-teal-500/30 text-teal-300 hover:bg-teal-500/10 text-xs font-bold h-9 gap-1.5 shadow-sm"
          >
            <Code className="h-4 w-4 text-teal-400" />
            Export Strategy Code
          </Button>

          {/* History Quick-Select */}
          {historyList.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={activeBacktest?._id || ''}
                onChange={(e) => loadBacktest(e.target.value)}
                className="bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none max-w-[200px] truncate"
              >
                {historyList.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.strategyType.toUpperCase()} - {item.symbols.join(', ')}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Control Panel / Strategy Configuration */}
      {(activeViewTab === 'all' || activeViewTab === 'backtest') && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
              <Activity className="h-5 w-5 text-teal-400" />
              Strategy Parameters &amp; Asset Configuration
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCodeExportOpen(true)}
              className="text-xs text-teal-400 hover:text-teal-300 hover:bg-teal-500/10"
            >
              <Code className="h-3.5 w-3.5 mr-1" />
              Generate Pine/Python
            </Button>
          </div>

          {/* Quick Ticker Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-1 border-b border-gray-800/80">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mr-1">
              Quick Select:
            </span>
            {[
              { label: 'BTC', sym: 'BINANCE:BTCUSDT' },
              { label: 'ETH', sym: 'BINANCE:ETHUSDT' },
              { label: 'SOL', sym: 'BINANCE:SOLUSDT' },
              { label: 'NVDA', sym: 'NVDA' },
              { label: 'AAPL', sym: 'AAPL' },
              { label: 'MSFT', sym: 'MSFT' },
              { label: 'AMZN', sym: 'AMZN' },
              { label: 'SPY', sym: 'SPY' },
              { label: 'QQQ', sym: 'QQQ' },
              { label: 'IWM', sym: 'IWM' },
            ].map((chip) => (
              <button
                key={chip.sym}
                type="button"
                onClick={() => setSymbol(chip.sym)}
                className={`text-xs px-2.5 py-1 rounded-md font-mono transition-all ${
                  symbol === chip.sym
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold'
                    : 'bg-gray-950 text-gray-400 hover:text-gray-200 hover:bg-gray-800 border border-gray-800'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Strategy Selector with Expanded Taxonomy */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Strategy Algorithm
              </label>
              <select
                value={strategyType}
                onChange={(e) => setStrategyType(e.target.value as StrategyType)}
                className="w-full bg-gray-950 border border-gray-700 text-gray-200 rounded-lg p-2.5 text-sm focus:border-teal-500 outline-none"
              >
                <optgroup label="Smart Money Concepts (SMC)" className="bg-gray-900 text-gray-200">
                  <option value="liquidity_sweep">Liquidity Sweep &amp; Reclaim (BTC / Crypto)</option>
                  <option value="fair_value_gap">LuxAlgo SMC Fair Value Gap (FVG Retest)</option>
                  <option value="order_block">LuxAlgo SMC Order Block (Displacement Retest)</option>
                </optgroup>
                <optgroup label="Classic Trend &amp; Momentum" className="bg-gray-900 text-gray-200">
                  <option value="supertrend">LuxAlgo SuperTrend (ATR Trailing Stop)</option>
                  <option value="ema_crossover">Dual EMA Crossover (Trend Following)</option>
                  <option value="macd_cross">MACD Momentum Filter (Trend &amp; Signal)</option>
                  <option value="breakout">Donchian Channel Breakout (Momentum)</option>
                  <option value="hma_trend">Hull Moving Average (HMA 9/21 Trend)</option>
                  <option value="adx_trend">ADX Directional Trend &amp; Momentum</option>
                  <option value="sma_golden">Dual SMA Golden / Death Cross (50/200)</option>
                </optgroup>
                <optgroup label="Statistical &amp; Mean Reversion" className="bg-gray-900 text-gray-200">
                  <option value="rsi_oversold">RSI Oversold / Overbought (Mean Reversion)</option>
                  <option value="bb_rev">Bollinger Bands Mean Reversion (Statistical 2σ)</option>
                  <option value="stoch_rsi">Stochastic RSI Momentum Swing</option>
                  <option value="zscore_rev">Z-Score Statistical Mean Reversion</option>
                  <option value="keltner">Keltner Channel Volatility Reversion</option>
                </optgroup>
                <optgroup label="Session Drift &amp; Benchmark" className="bg-gray-900 text-gray-200">
                  <option value="overnight">Overnight Gap Drift (Close-to-Open Holding)</option>
                  <option value="buy_and_hold">Passive Buy &amp; Hold Benchmark</option>
                </optgroup>
              </select>
            </div>

            {/* Symbol */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Ticker Symbol
                </label>
                <select
                  onChange={(e) => {
                    if (e.target.value) setSymbol(e.target.value);
                  }}
                  className="bg-transparent text-[11px] text-teal-400 hover:text-teal-300 outline-none cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled className="bg-gray-900 text-gray-400">
                    All Tickers ▾
                  </option>
                  <optgroup label="Crypto Majors (Binance)" className="bg-gray-900 text-gray-200">
                    {QUANT_SYMBOL_UNIVERSE.filter((s) => s.category === 'crypto').map((s) => (
                      <option key={s.symbol} value={s.symbol}>
                        {s.name} ({s.symbol.replace('BINANCE:', '')})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Tech Mega-Caps" className="bg-gray-900 text-gray-200">
                    {QUANT_SYMBOL_UNIVERSE.filter((s) => s.category === 'tech').map((s) => (
                      <option key={s.symbol} value={s.symbol}>
                        {s.name} ({s.symbol})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="ETFs &amp; Indices" className="bg-gray-900 text-gray-200">
                    {QUANT_SYMBOL_UNIVERSE.filter((s) => s.category === 'etf').map((s) => (
                      <option key={s.symbol} value={s.symbol}>
                        {s.name} ({s.symbol})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="High-Beta &amp; Growth" className="bg-gray-900 text-gray-200">
                    {QUANT_SYMBOL_UNIVERSE.filter((s) => s.category === 'growth').map((s) => (
                      <option key={s.symbol} value={s.symbol}>
                        {s.name} ({s.symbol})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="e.g. BINANCE:BTCUSDT, AAPL, NVDA"
                className="bg-gray-950 border-gray-700 text-gray-200 font-mono text-sm"
              />
            </div>

            {/* Timeframe Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Candle Timeframe
              </label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as any)}
                className="w-full bg-gray-950 border border-gray-700 text-gray-200 rounded-lg p-2.5 text-sm focus:border-teal-500 outline-none"
              >
                <option value="15m">15m (15 Minutes - Intraday)</option>
                <option value="1h">1h (1 Hour - Short Swing)</option>
                <option value="4h">4h (4 Hours - Swing)</option>
                <option value="1d">1d (1 Day - Macro Trend)</option>
              </select>
            </div>

            {/* Lookback Horizon */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Lookback Horizon
              </label>
              <select
                value={lookbackDays}
                onChange={(e) => setLookbackDays(Number(e.target.value))}
                className="w-full bg-gray-950 border border-gray-700 text-gray-200 rounded-lg p-2.5 text-sm focus:border-teal-500 outline-none"
              >
                <option value={30}>Last 30 Days</option>
                <option value={90}>Last 3 Months (90 days)</option>
                <option value={180}>Last 6 Months (180 days)</option>
                <option value={365}>Last 1 Year (365 days)</option>
                <option value={730}>Last 2 Years (730 days)</option>
              </select>
            </div>

            {/* Action Button */}
            <div className="flex items-end">
              <Button
                onClick={handleRunBacktest}
                disabled={loading}
                className="w-full bg-teal-500 hover:bg-teal-600 text-black font-bold py-2.5 rounded-lg transition-all duration-200 shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RotateCcw className="h-4 w-4 animate-spin" />
                    Simulating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    Run {timeframe.toUpperCase()} Backtest
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Dynamic Parameter Grid for All Strategies */}
          <div className="pt-4 border-t border-gray-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {strategyType === 'ema_crossover' && (
              <>
                <div>
                  <label className="text-xs text-gray-400">Fast EMA Period</label>
                  <Input
                    type="number"
                    value={fastPeriod}
                    onChange={(e) => setFastPeriod(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Slow EMA Period</label>
                  <Input
                    type="number"
                    value={slowPeriod}
                    onChange={(e) => setSlowPeriod(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
              </>
            )}

            {strategyType === 'rsi_oversold' && (
              <>
                <div>
                  <label className="text-xs text-gray-400">RSI Period</label>
                  <Input
                    type="number"
                    value={rsiPeriod}
                    onChange={(e) => setRsiPeriod(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Oversold (Buy &lt; X)</label>
                  <Input
                    type="number"
                    value={rsiOversold}
                    onChange={(e) => setRsiOversold(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Overbought (Sell &gt; X)</label>
                  <Input
                    type="number"
                    value={rsiOverbought}
                    onChange={(e) => setRsiOverbought(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
              </>
            )}

            {(strategyType === 'macd_cross' || strategyType === 'macd_momentum') && (
              <>
                <div>
                  <label className="text-xs text-gray-400">Fast Period (12)</label>
                  <Input
                    type="number"
                    value={macdFast}
                    onChange={(e) => setMacdFast(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Slow Period (26)</label>
                  <Input
                    type="number"
                    value={macdSlow}
                    onChange={(e) => setMacdSlow(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Signal Period (9)</label>
                  <Input
                    type="number"
                    value={macdSignal}
                    onChange={(e) => setMacdSignal(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
              </>
            )}

            {(strategyType === 'bb_rev' || strategyType === 'bollinger_reversion') && (
              <>
                <div>
                  <label className="text-xs text-gray-400">SMA Period</label>
                  <Input
                    type="number"
                    value={bbPeriod}
                    onChange={(e) => setBbPeriod(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">StdDev Multiplier (σ)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={bbStdDev}
                    onChange={(e) => setBbStdDev(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
              </>
            )}

            {strategyType === 'breakout' && (
              <div>
                <label className="text-xs text-gray-400">Donchian Lookback (bars)</label>
                <Input
                  type="number"
                  value={breakoutLookback}
                  onChange={(e) => setBreakoutLookback(Number(e.target.value))}
                  className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                />
              </div>
            )}

            {strategyType === 'liquidity_sweep' && (
              <>
                <div>
                  <label className="text-xs text-gray-400">Sweep Channel Lookback</label>
                  <Input
                    type="number"
                    value={sweepLookback}
                    onChange={(e) => setSweepLookback(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Volume Multiplier (vs SMA)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={volMultiplier}
                    onChange={(e) => setVolMultiplier(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
              </>
            )}

            {strategyType === 'supertrend' && (
              <>
                <div>
                  <label className="text-xs text-gray-400">ATR Period</label>
                  <Input
                    type="number"
                    value={atrPeriod}
                    onChange={(e) => setAtrPeriod(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">ATR Multiplier</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={multiplier}
                    onChange={(e) => setMultiplier(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
              </>
            )}

            {strategyType === 'fair_value_gap' && (
              <>
                <div>
                  <label className="text-xs text-gray-400">Min Gap Threshold (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={minGapPct}
                    onChange={(e) => setMinGapPct(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Max Hold Period (bars)</label>
                  <Input
                    type="number"
                    value={fvgHoldBars}
                    onChange={(e) => setFvgHoldBars(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
              </>
            )}

            {strategyType === 'order_block' && (
              <>
                <div>
                  <label className="text-xs text-gray-400">Swing Break Lookback</label>
                  <Input
                    type="number"
                    value={obLookback}
                    onChange={(e) => setObLookback(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Max Hold Period (bars)</label>
                  <Input
                    type="number"
                    value={obHoldBars}
                    onChange={(e) => setObHoldBars(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
              </>
            )}

            {(strategyType === 'sma_golden' || strategyType === 'buy_and_hold') && (
              <>
                <div>
                  <label className="text-xs text-gray-400">Fast SMA Period (50)</label>
                  <Input
                    type="number"
                    value={smaFast}
                    onChange={(e) => setSmaFast(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Slow SMA Period (200)</label>
                  <Input
                    type="number"
                    value={smaSlow}
                    onChange={(e) => setSmaSlow(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
              </>
            )}

            {strategyType === 'hma_trend' && (
              <>
                <div>
                  <label className="text-xs text-gray-400">Fast HMA Period (9)</label>
                  <Input
                    type="number"
                    value={hmaFast}
                    onChange={(e) => setHmaFast(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Slow HMA Period (21)</label>
                  <Input
                    type="number"
                    value={hmaSlow}
                    onChange={(e) => setHmaSlow(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
              </>
            )}

            {strategyType === 'adx_trend' && (
              <>
                <div>
                  <label className="text-xs text-gray-400">ADX Period (14)</label>
                  <Input
                    type="number"
                    value={adxPeriod}
                    onChange={(e) => setAdxPeriod(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">ADX Threshold (25)</label>
                  <Input
                    type="number"
                    value={adxThreshold}
                    onChange={(e) => setAdxThreshold(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
              </>
            )}

            {strategyType === 'stoch_rsi' && (
              <>
                <div>
                  <label className="text-xs text-gray-400">RSI Period (14)</label>
                  <Input
                    type="number"
                    value={stochPeriod}
                    onChange={(e) => setStochPeriod(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">%K / %D Smooth (3/3)</label>
                  <Input
                    type="number"
                    value={stochK}
                    onChange={(e) => setStochK(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Oversold (20)</label>
                  <Input
                    type="number"
                    value={stochOversold}
                    onChange={(e) => setStochOversold(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
              </>
            )}

            {strategyType === 'zscore_rev' && (
              <>
                <div>
                  <label className="text-xs text-gray-400">Lookback Period (20)</label>
                  <Input
                    type="number"
                    value={zscorePeriod}
                    onChange={(e) => setZscorePeriod(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Threshold (2.0σ)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={zscoreThreshold}
                    onChange={(e) => setZscoreThreshold(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
              </>
            )}

            {strategyType === 'keltner' && (
              <>
                <div>
                  <label className="text-xs text-gray-400">EMA Period (20)</label>
                  <Input
                    type="number"
                    value={keltnerEma}
                    onChange={(e) => setKeltnerEma(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">ATR Mult (1.5)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={keltnerMult}
                    onChange={(e) => setKeltnerMult(Number(e.target.value))}
                    className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                  />
                </div>
              </>
            )}

            {(strategyType === 'overnight' || strategyType === 'overnight_hold') && (
              <div className="col-span-2 md:col-span-4 p-3 bg-teal-950/20 border border-teal-500/20 rounded-xl text-teal-300 text-xs">
                <strong>Overnight Gap Drift Strategy:</strong> Systematically enters on 16:00 close and exits on 09:30 open. Exploits institutional rebalance imbalance and overnight flow with zero intraday drawdowns.
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-950/40 border border-red-800 rounded-xl text-red-300 text-sm flex items-center gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Expanded KPI Metrics Grid (Item 3: Sortino, Calmar, Profit Factor, Exposure %) */}
      {(activeViewTab === 'all' || activeViewTab === 'backtest') && metrics && (
        <KpiMetricsGrid
          initialCapital={initialCapital}
          finalBalance={finalBalance}
          totalProfit={totalProfit}
          metrics={metrics}
          trades={trades}
        />
      )}

      {/* Alpha Matrix View (Item 1: Interactive Comparison Table across multiple assets & strategies) */}
      {(activeViewTab === 'all' || activeViewTab === 'matrix') && (
        <AlphaMatrixTable onSelectStrategy={handleLoadStrategyFromMatrix} />
      )}

      {/* AI Strategy Review & Edge Diagnosis */}
      {(activeViewTab === 'all' || activeViewTab === 'backtest') && activeBacktest && (
        <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-teal-950/20 border border-teal-500/20 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-teal-400" />
                AI Strategy Review &amp; Edge Diagnosis
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Powered by local 9Router gateway with Gemini model. Analyzes parameters, false breakout traps, and trade expectancy.
              </p>
            </div>
            <Button
              onClick={handleRunAiAnalysis}
              disabled={aiLoading}
              variant="outline"
              className="border-teal-500/40 text-teal-300 hover:bg-teal-500/10 text-xs font-semibold px-4 py-2 rounded-lg"
            >
              {aiLoading ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Generating Audit...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Run AI Strategy Audit
                </>
              )}
            </Button>
          </div>

          {aiAnalysis && (
            <div className="p-4 bg-gray-950/70 border border-gray-800 rounded-xl text-gray-300 text-sm whitespace-pre-wrap leading-relaxed font-sans">
              {aiAnalysis}
            </div>
          )}
        </div>
      )}

      {/* Executed Trade Ledger & Balance Progression */}
      {(activeViewTab === 'all' || activeViewTab === 'backtest') && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-teal-400" />
                Executed Trade Ledger &amp; Balance Progression
              </h3>
              <p className="text-xs text-gray-400">
                Complete chronological audit of every buy/sell execution price, timestamps, profit/loss, and portfolio balance.
              </p>
            </div>
            <span className="text-xs font-mono bg-gray-800 text-gray-300 px-3 py-1 rounded-full">
              {trades.length} Closed Trades
            </span>
          </div>

          {trades.length === 0 ? (
            <div className="py-16 text-center text-gray-500 border border-dashed border-gray-800 rounded-xl">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                No trades executed yet. Select a strategy above and click &quot;Run {timeframe.toUpperCase()} Backtest&quot; or choose an entry from the Alpha Matrix.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-gray-950 text-gray-400 uppercase tracking-wider border-b border-gray-800">
                  <tr>
                    <th className="py-3 px-4">Trade #</th>
                    <th className="py-3 px-4">Symbol</th>
                    <th className="py-3 px-4">Direction</th>
                    <th className="py-3 px-4">Entry Time</th>
                    <th className="py-3 px-4">Entry Price</th>
                    <th className="py-3 px-4">Exit Time</th>
                    <th className="py-3 px-4">Exit Price</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Return %</th>
                    <th className="py-3 px-4">Profit / Loss ($)</th>
                    <th className="py-3 px-4 text-right">Account Balance ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 bg-gray-900/40">
                  {trades.map((t, idx) => {
                    const isWin = t.pnl >= 0;
                    return (
                      <tr key={t.id || idx} className="hover:bg-gray-800/40 transition-colors">
                        <td className="py-3 px-4 text-gray-400">#{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-gray-200">{t.symbol}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              t.type === 'long'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                                : 'bg-rose-950 text-rose-400 border border-rose-800/50'
                            }`}
                          >
                            {t.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          {new Date(t.entryTime).toLocaleString([], {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 text-gray-200">${t.entryPrice.toFixed(2)}</td>
                        <td className="py-3 px-4 text-gray-300">
                          {new Date(t.exitTime).toLocaleString([], {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 text-gray-200">${t.exitPrice.toFixed(2)}</td>
                        <td className="py-3 px-4 text-gray-400">
                          {t.durationBars} bars ({activeBacktest?.timeframe || timeframe})
                        </td>
                        <td className={`py-3 px-4 font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isWin ? '+' : ''}
                          {(t.returnPct * 100).toFixed(2)}%
                        </td>
                        <td className={`py-3 px-4 font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isWin ? '+' : ''}${t.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-white">
                          ${t.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Code Export Modal (Item 2: Pine Script v5, Python Vectorbt, NautilusTrader, Qlib) */}
      <CodeExportModal
        open={isCodeExportOpen}
        onOpenChange={setIsCodeExportOpen}
        strategyType={strategyType}
        symbol={symbol}
        timeframe={timeframe}
        params={getParamsForType()}
      />
    </div>
  );
}
