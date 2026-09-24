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
  ShieldAlert,
  Award,
  Layers,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  const [strategyType, setStrategyType] = useState<'ema_crossover' | 'rsi_oversold' | 'breakout' | 'liquidity_sweep'>('liquidity_sweep');
  const [symbol, setSymbol] = useState('BINANCE:BTCUSDT');
  const [lookbackDays, setLookbackDays] = useState(365);

  // Strategy Params
  const [fastPeriod, setFastPeriod] = useState(12);
  const [slowPeriod, setSlowPeriod] = useState(26);
  const [rsiPeriod, setRsiPeriod] = useState(14);
  const [rsiOversold, setRsiOversold] = useState(30);
  const [rsiOverbought, setRsiOverbought] = useState(70);
  const [breakoutLookback, setBreakoutLookback] = useState(20);
  const [sweepLookback, setSweepLookback] = useState(20);
  const [volMultiplier, setVolMultiplier] = useState(1.2);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeBacktest, setActiveBacktest] = useState<BacktestData | null>(null);
  const [historyList, setHistoryList] = useState<BacktestData[]>([]);

  // AI Analysis State
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

  const getParamsForType = () => {
    switch (strategyType) {
      case 'ema_crossover':
        return { fastPeriod, slowPeriod };
      case 'rsi_oversold':
        return { period: rsiPeriod, oversold: rsiOversold, overbought: rsiOverbought };
      case 'breakout':
        return { lookback: breakoutLookback };
      case 'liquidity_sweep':
        return { lookback: sweepLookback, volMultiplier };
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
          prompt: `Conduct a professional quantitative trade audit for this ${activeBacktest.strategyType} strategy. Breakdown win-rate consistency, drawdown severity, and 2 concrete rule adjustments to improve Sharpe.`,
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

  const metrics = activeBacktest?.metrics;
  const trades = activeBacktest?.trades || [];
  const initialCapital = 10000;
  const finalBalance = trades.length > 0 ? trades[trades.length - 1].balance : initialCapital * (1 + (metrics?.totalReturn || 0));
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
            Quant Strategy Backtester &amp; Trade Ledger
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Evaluate 4-hour historical algorithmic strategies, inspect individual trade execution prices, track balance growth, and query 9Router AI analysis.
          </p>
        </div>

        {/* History Quick-Select */}
        {historyList.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">History:</span>
            <select
              value={activeBacktest?._id || ''}
              onChange={(e) => loadBacktest(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none"
            >
              {historyList.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.strategyType.toUpperCase()} - {item.symbols.join(', ')} ({new Date(item.from).toLocaleDateString()} - {new Date(item.to).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Control Panel / Strategy Configuration */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-6">
        <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
          <Activity className="h-5 w-5 text-teal-400" />
          Strategy Parameters &amp; Asset Configuration
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Strategy Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Strategy Algorithm
            </label>
            <select
              value={strategyType}
              onChange={(e) => setStrategyType(e.target.value as any)}
              className="w-full bg-gray-950 border border-gray-700 text-gray-200 rounded-lg p-2.5 text-sm focus:border-teal-500 outline-none"
            >
              <option value="liquidity_sweep">4H Liquidity Sweep &amp; Reclaim (BTC / Crypto)</option>
              <option value="ema_crossover">4H Dual EMA Crossover (Trend Following)</option>
              <option value="rsi_oversold">4H RSI Oversold / Overbought (Mean Reversion)</option>
              <option value="breakout">4H Donchian Channel Breakout (Momentum)</option>
            </select>
          </div>

          {/* Symbol */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Ticker Symbol
            </label>
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="e.g. BINANCE:BTCUSDT, AAPL, NVDA"
              className="bg-gray-950 border-gray-700 text-gray-200 font-mono text-sm"
            />
          </div>

          {/* Timeframe Range */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Lookback Horizon
            </label>
            <select
              value={lookbackDays}
              onChange={(e) => setLookbackDays(Number(e.target.value))}
              className="w-full bg-gray-950 border border-gray-700 text-gray-200 rounded-lg p-2.5 text-sm focus:border-teal-500 outline-none"
            >
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
                  Run 4H Backtest
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Dynamic Parameter Grid */}
        <div className="pt-4 border-t border-gray-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {strategyType === 'ema_crossover' && (
            <>
              <div>
                <label className="text-xs text-gray-400">Fast EMA Period (bars)</label>
                <Input
                  type="number"
                  value={fastPeriod}
                  onChange={(e) => setFastPeriod(Number(e.target.value))}
                  className="bg-gray-950 border-gray-700 text-gray-200 mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Slow EMA Period (bars)</label>
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
                <label className="text-xs text-gray-400">Sweep Channel Lookback (bars)</label>
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
        </div>

        {error && (
          <div className="p-4 bg-red-950/40 border border-red-800 rounded-xl text-red-300 text-sm flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
            <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Initial Balance</div>
            <div className="text-xl font-bold text-white mt-1">${initialCapital.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">Starting Allocation</div>
          </div>

          <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
            <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Final Balance</div>
            <div className={`text-xl font-bold mt-1 ${finalBalance >= initialCapital ? 'text-teal-400' : 'text-rose-400'}`}>
              ${Math.round(finalBalance).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Net: {totalProfit >= 0 ? '+' : ''}${Math.round(totalProfit).toLocaleString()}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
            <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Total Return</div>
            <div className={`text-xl font-bold mt-1 flex items-center gap-1 ${metrics.totalReturn >= 0 ? 'text-teal-400' : 'text-rose-400'}`}>
              {metrics.totalReturn >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              {(metrics.totalReturn * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Ann: {(metrics.annualizedReturn * 100).toFixed(1)}%</div>
          </div>

          <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
            <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Sharpe Ratio</div>
            <div className="text-xl font-bold text-white mt-1">{metrics.sharpe.toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1">Risk-Adjusted Return</div>
          </div>

          <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
            <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Max Drawdown</div>
            <div className="text-xl font-bold text-rose-400 mt-1 flex items-center gap-1">
              <ShieldAlert className="h-4 w-4" />
              {(metrics.maxDrawdown * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Peak-to-Trough Loss</div>
          </div>

          <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
            <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Win Rate</div>
            <div className="text-xl font-bold text-teal-400 mt-1 flex items-center gap-1">
              <Award className="h-4 w-4" />
              {(metrics.winRate * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">{metrics.tradesCount} Total Trades</div>
          </div>
        </div>
      )}

      {/* AI Strategy Analysis Card */}
      {activeBacktest && (
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

      {/* Trade Log & Ledger Table */}
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
            <p className="text-sm">No trades executed yet. Select a strategy above and click &quot;Run 4H Backtest&quot;.</p>
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
                      <td className="py-3 px-4 text-gray-400">{t.durationBars * 4}h ({t.durationBars}b)</td>
                      <td className={`py-3 px-4 font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isWin ? '+' : ''}{(t.returnPct * 100).toFixed(2)}%
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
    </div>
  );
}
