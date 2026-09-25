'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Shield,
  TrendingUp,
  Brain,
  Play,
  Code,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QUANT_SYMBOL_UNIVERSE } from '@/lib/market/symbols';
import { StrategyType } from './types';
import { VibeTraderResponse, RiskAppetite } from '@/lib/strategy/vibeTrader';

interface VibeTraderPanelProps {
  onDeployStrategy: (
    symbol: string,
    strategyType: StrategyType,
    params: Record<string, number>,
    timeframe: string
  ) => void;
  onOpenCodeExport: (
    strategyType: StrategyType,
    symbol: string,
    timeframe: string,
    params: Record<string, number>
  ) => void;
}

const PRESET_VIBES = [
  {
    label: '⚡ TensorTrade RL Scalper (HYPEUSDT)',
    prompt: 'Deploy deep reinforcement learning adaptive policy with Sortino reward optimization and 1.5% risk tolerance cutoff',
    symbol: 'BINANCE:HYPEUSDT',
    timeframe: '1h' as const,
    risk: 'aggressive' as RiskAppetite,
  },
  {
    label: '🌊 BTC Liquidity Sweep & Reclaim',
    prompt: 'Institutional liquidity sweep piercing 20-bar swing low with high volume absorption and mean equilibrium target',
    symbol: 'BINANCE:BTCUSDT',
    timeframe: '4h' as const,
    risk: 'balanced' as RiskAppetite,
  },
  {
    label: '📈 NVDA Trend Following with Hard Stop',
    prompt: 'Trend capture on NVDA using dual EMA 9/21 cross with dynamic ATR volatility trailing stop',
    symbol: 'NVDA',
    timeframe: '4h' as const,
    risk: 'balanced' as RiskAppetite,
  },
  {
    label: '🛡️ SPY Overnight Gap Drift',
    prompt: 'Zero-intraday-drawdown overnight drift entering 16:00 close and exiting 09:30 market open',
    symbol: 'SPY',
    timeframe: '1d' as const,
    risk: 'conservative' as RiskAppetite,
  },
];

export default function VibeTraderPanel({
  onDeployStrategy,
  onOpenCodeExport,
}: VibeTraderPanelProps) {
  const [prompt, setPrompt] = useState(
    'Deploy deep reinforcement learning adaptive policy with Sortino reward optimization and 1.5% risk tolerance cutoff'
  );
  const [selectedSymbol, setSelectedSymbol] = useState('BINANCE:HYPEUSDT');
  const [timeframe, setTimeframe] = useState<'15m' | '1h' | '4h' | '1d'>('1h');
  const [riskAppetite, setRiskAppetite] = useState<RiskAppetite>('aggressive');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VibeTraderResponse | null>(null);

  const handleConsultVibeCommittee = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/strategy/vibe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          symbol: selectedSymbol,
          timeframe,
          riskAppetite,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Failed to synthesize Vibe strategy.');
      }

      setResult(json);
    } catch (err: any) {
      setError(err?.message || 'Error communicating with Vibe Trader agent.');
    } finally {
      setLoading(false);
    }
  };

  const cleanSymbol = selectedSymbol.replace('BINANCE:', '');

  return (
    <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-teal-500/20 to-purple-500/20 text-teal-300 border border-teal-500/30 shadow-inner">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Vibe Trader Studio
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  HKUDS/Vibe-Trading AI Agent
                </span>
              </h2>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1 max-w-2xl">
            Autonomous quantitative research desk inspired by <strong>HKUDS/Vibe-Trading</strong>.
            Formulate any trading hypothesis in natural language — our 4-agent committee debates, generates
            empirical parameters, and deploys directly to backtest engines.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-gray-400 bg-gray-950 px-3 py-1.5 rounded-lg border border-gray-800">
          <Zap className="h-3.5 w-3.5 text-teal-400" />
          <span>87 Tickers Supported</span>
        </div>
      </div>

      {/* Preset Vibe Chips */}
      <div>
        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
          Curated Vibe Presets:
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESET_VIBES.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setPrompt(preset.prompt);
                setSelectedSymbol(preset.symbol);
                setTimeframe(preset.timeframe);
                setRiskAppetite(preset.risk);
              }}
              className="text-xs font-mono px-3 py-1.5 rounded-lg bg-gray-950 hover:bg-gray-800 text-gray-300 border border-gray-800 hover:border-gray-700 transition-all flex items-center gap-1.5"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt Bar */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
          Natural Language Strategy Prompt:
        </label>
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            placeholder="Describe your strategy vibe, trade setup, or risk goals (e.g., 'Deploy deep reinforcement learning adaptive policy with Sortino reward optimization on HYPEUSDT')..."
            className="w-full bg-gray-950 border border-gray-700 text-gray-100 rounded-xl p-3.5 text-sm focus:border-teal-500 outline-none leading-relaxed font-sans shadow-inner resize-none"
          />
        </div>
      </div>

      {/* Control Grid: Symbol, Timeframe, Risk Profile */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Ticker Selector */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Target Instrument (All 87)
          </label>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="w-full bg-gray-950 border border-gray-700 text-gray-200 rounded-lg p-2.5 text-xs font-mono focus:border-teal-500 outline-none"
          >
            <optgroup label="Crypto Majors (26)" className="bg-gray-950 text-gray-200">
              {QUANT_SYMBOL_UNIVERSE.filter((s) => s.category === 'crypto').map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol.replace('BINANCE:', '')} - {s.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Tech Mega-Caps (18)" className="bg-gray-950 text-gray-200">
              {QUANT_SYMBOL_UNIVERSE.filter((s) => s.category === 'tech').map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol} - {s.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Index & Sector ETFs (15)" className="bg-gray-950 text-gray-200">
              {QUANT_SYMBOL_UNIVERSE.filter((s) => s.category === 'etf').map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol} - {s.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="High-Beta & Growth (16)" className="bg-gray-950 text-gray-200">
              {QUANT_SYMBOL_UNIVERSE.filter((s) => s.category === 'growth').map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol} - {s.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Blue-Chip & Defensive (12)" className="bg-gray-950 text-gray-200">
              {QUANT_SYMBOL_UNIVERSE.filter((s) => s.category === 'bluechip').map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol} - {s.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Timeframe */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Execution Timeframe
          </label>
          <div className="grid grid-cols-4 gap-1.5 bg-gray-950 p-1 rounded-lg border border-gray-800">
            {(['15m', '1h', '4h', '1d'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`py-1.5 text-xs font-mono rounded font-semibold transition-all ${
                  timeframe === tf
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Risk Appetite */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Risk Profile
          </label>
          <div className="grid grid-cols-3 gap-1.5 bg-gray-950 p-1 rounded-lg border border-gray-800">
            {(['conservative', 'balanced', 'aggressive'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRiskAppetite(r)}
                className={`py-1.5 text-xs font-mono rounded capitalize font-semibold transition-all ${
                  riskAppetite === r
                    ? r === 'aggressive'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : r === 'conservative'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {r === 'aggressive' ? 'RL / High' : r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Consult Committee Button */}
      <div className="flex justify-end pt-1">
        <Button
          onClick={handleConsultVibeCommittee}
          disabled={loading}
          className="bg-gradient-to-r from-teal-500 to-purple-600 hover:from-teal-400 hover:to-purple-500 text-white font-bold px-6 py-2 rounded-xl shadow-lg flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Consulting Multi-Agent Committee...</span>
            </>
          ) : (
            <>
              <Brain className="h-4 w-4" />
              <span>Consult Vibe Committee &amp; Synthesize</span>
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Synthesis Result Card */}
      {result && (
        <div className="bg-gray-950/90 border border-teal-500/30 rounded-2xl p-6 space-y-6 shadow-2xl animate-in fade-in duration-300">
          {/* Top Result Banner */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-teal-500/20 text-teal-400 font-mono text-xs px-2 font-bold">
                  {cleanSymbol}
                </span>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {result.strategyName}
                </h3>
                <span className="text-xs font-mono bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
                  {result.timeframe}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{result.thesis}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-gray-500">Vibe Consensus</span>
                <div className="text-2xl font-extrabold font-mono text-teal-400 flex items-center gap-1 justify-end">
                  <Flame className="h-5 w-5 text-orange-400" />
                  {result.vibeScore}
                  <span className="text-xs text-gray-500 font-normal">/100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Agent Committee Debate Grid */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Bot className="h-4 w-4 text-purple-400" />
              The Vibe Committee Deliberation:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Alpha Seeker */}
              <div className="p-3.5 bg-gray-900/80 border border-emerald-500/20 rounded-xl space-y-1">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Alpha Seeker (Bull)
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{result.committee.alphaSeeker}</p>
              </div>

              {/* Risk Auditor */}
              <div className="p-3.5 bg-gray-900/80 border border-amber-500/20 rounded-xl space-y-1">
                <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  Risk Auditor (Bear)
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{result.committee.riskAuditor}</p>
              </div>

              {/* TensorTrade RL Specialist */}
              <div className="p-3.5 bg-gray-900/80 border border-purple-500/20 rounded-xl space-y-1">
                <div className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                  <Brain className="h-3.5 w-3.5" />
                  TensorTrade RL Specialist
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{result.committee.rlSpecialist}</p>
              </div>

              {/* CIO Verdict */}
              <div className="p-3.5 bg-gray-900/80 border border-teal-500/20 rounded-xl space-y-1">
                <div className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Chief Investment Officer
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{result.committee.cioVerdict}</p>
              </div>
            </div>
          </div>

          {/* Expected Performance Targets */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-900/90 border border-gray-800 p-3 rounded-xl text-center">
              <span className="text-[10px] text-gray-400 uppercase font-mono">Target Win Rate</span>
              <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                {result.targetKpis.expectedWinRate.toFixed(1)}%
              </div>
            </div>
            <div className="bg-gray-900/90 border border-gray-800 p-3 rounded-xl text-center">
              <span className="text-[10px] text-gray-400 uppercase font-mono">Target Sharpe</span>
              <div className="text-lg font-bold font-mono text-teal-300 mt-0.5">
                {result.targetKpis.expectedSharpe.toFixed(2)}
              </div>
            </div>
            <div className="bg-gray-900/90 border border-gray-800 p-3 rounded-xl text-center">
              <span className="text-[10px] text-gray-400 uppercase font-mono">Target Sortino</span>
              <div className="text-lg font-bold font-mono text-cyan-300 mt-0.5">
                {result.targetKpis.expectedSortino.toFixed(2)}
              </div>
            </div>
            <div className="bg-gray-900/90 border border-gray-800 p-3 rounded-xl text-center">
              <span className="text-[10px] text-gray-400 uppercase font-mono">Max Expected DD</span>
              <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
                {result.targetKpis.maxExpectedDrawdown.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 border-t border-gray-800">
            <div className="text-xs font-mono text-gray-400">
              Parameters: <code className="text-teal-300">{JSON.stringify(result.params)}</code>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onOpenCodeExport(result.strategyType, result.symbol, result.timeframe, result.params)
                }
                className="text-xs font-mono border-gray-700 text-gray-300 hover:bg-gray-800 gap-1.5"
              >
                <Code className="h-3.5 w-3.5" />
                Export Code
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  onDeployStrategy(result.symbol, result.strategyType, result.params, result.timeframe)
                }
                className="text-xs font-bold font-mono bg-teal-600 hover:bg-teal-500 text-white gap-1.5 shadow-lg"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Deploy &amp; Run Backtest
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
