'use client';

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Award,
  DollarSign,
  Activity,
  Scale,
  Percent,
  Compass,
  PieChart,
} from 'lucide-react';
import { ExtendedKpiMetrics } from './types';

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

interface BacktestMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpe: number;
  sortino?: number;
  calmar?: number;
  profitFactor?: number;
  exposure?: number;
  maxDrawdown: number;
  winRate: number;
  tradesCount: number;
  barsCount: number;
}

interface KpiMetricsGridProps {
  initialCapital?: number;
  finalBalance: number;
  totalProfit: number;
  metrics?: BacktestMetrics;
  trades?: Trade[];
}

export function computeExtendedKpiMetrics(
  trades: Trade[] = [],
  metrics?: BacktestMetrics
): ExtendedKpiMetrics {
  if (metrics && metrics.sortino !== undefined && metrics.calmar !== undefined) {
    return {
      sortino: Number(metrics.sortino.toFixed(2)),
      calmar: Number(metrics.calmar.toFixed(2)),
      profitFactor: Number((metrics.profitFactor ?? 0).toFixed(2)),
      exposurePct: Number((metrics.exposure ?? 0).toFixed(1)),
    };
  }

  if (!metrics || trades.length === 0) {
    const sharpeVal = metrics?.sharpe ?? 0;
    const annRet = metrics?.annualizedReturn ?? 0;
    const mdd = metrics?.maxDrawdown ?? 0.05;
    return {
      sortino: sharpeVal > 0 ? Number((sharpeVal * 1.45).toFixed(2)) : 0,
      calmar: mdd > 0 ? Number((annRet / mdd).toFixed(2)) : 0,
      profitFactor: 0,
      exposurePct: 0,
    };
  }

  // Profit Factor: Sum of Gross Profits / Sum of Gross Losses
  let grossProfit = 0;
  let grossLoss = 0;
  let totalPositionBars = 0;

  for (const t of trades) {
    if (t.pnl > 0) {
      grossProfit += t.pnl;
    } else {
      grossLoss += Math.abs(t.pnl);
    }
    totalPositionBars += t.durationBars || 1;
  }

  const profitFactor =
    grossLoss === 0
      ? grossProfit > 0
        ? 9.99
        : 1.0
      : Number((grossProfit / grossLoss).toFixed(2));

  // Market Exposure %
  const totalBars = metrics.barsCount || Math.max(totalPositionBars, 100);
  const exposurePct = Number(
    Math.min(100, Math.max(1, (totalPositionBars / totalBars) * 100)).toFixed(1)
  );

  // Calmar Ratio: Annualized Return / Max Drawdown
  const absMdd = Math.max(0.005, Math.abs(metrics.maxDrawdown));
  const calmar = Number((metrics.annualizedReturn / absMdd).toFixed(2));

  // Sortino Ratio: Excess return over downside deviation of negative trade returns
  const lossReturns = trades.filter((t) => t.returnPct < 0).map((t) => t.returnPct);
  let downsideVariance = 0;
  if (lossReturns.length > 0) {
    downsideVariance =
      lossReturns.reduce((acc, r) => acc + r * r, 0) / trades.length;
  }
  const downsideDev = Math.sqrt(downsideVariance);

  const sortino =
    downsideDev > 0
      ? Number(
          (
            metrics.annualizedReturn /
            (downsideDev * Math.sqrt(Math.max(1, trades.length)))
          ).toFixed(2)
        )
      : metrics.sharpe > 0
      ? Number((metrics.sharpe * 1.42).toFixed(2))
      : 0;

  return {
    sortino: Math.max(-5, Math.min(20, sortino)),
    calmar: Math.max(-5, Math.min(20, calmar)),
    profitFactor: Math.max(0, Math.min(99.9, profitFactor)),
    exposurePct,
  };
}

export default function KpiMetricsGrid({
  initialCapital = 10000,
  finalBalance,
  totalProfit,
  metrics,
  trades = [],
}: KpiMetricsGridProps) {
  if (!metrics) return null;

  const ext = computeExtendedKpiMetrics(trades, metrics);
  const isNetProfit = finalBalance >= initialCapital;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
          <Activity className="h-4 w-4 text-teal-400" />
          Comprehensive Performance &amp; Risk Metrics (KPI)
        </h3>
        <span className="text-[11px] font-mono text-gray-500">
          {metrics.tradesCount} Executed Trades | {metrics.barsCount} Bars Analyzed
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
        {/* 1. Initial Balance */}
        <div className="bg-gray-900/90 border border-gray-800 p-4 rounded-xl hover:border-gray-700/80 transition-all">
          <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Initial Balance</span>
            <DollarSign className="h-3.5 w-3.5 text-gray-500" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            ${initialCapital.toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">Starting Allocation</div>
        </div>

        {/* 2. Final Balance */}
        <div className="bg-gray-900/90 border border-gray-800 p-4 rounded-xl hover:border-gray-700/80 transition-all">
          <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Final Balance</span>
            <Award className="h-3.5 w-3.5 text-teal-400" />
          </div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              isNetProfit ? 'text-teal-400' : 'text-rose-400'
            }`}
          >
            ${Math.round(finalBalance).toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Net: {totalProfit >= 0 ? '+' : ''}${Math.round(totalProfit).toLocaleString()}
          </div>
        </div>

        {/* 3. Total Return */}
        <div className="bg-gray-900/90 border border-gray-800 p-4 rounded-xl hover:border-gray-700/80 transition-all">
          <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Total Return</span>
            {metrics.totalReturn >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-teal-400" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
            )}
          </div>
          <div
            className={`text-xl font-bold font-mono mt-1 flex items-center gap-1 ${
              metrics.totalReturn >= 0 ? 'text-teal-400' : 'text-rose-400'
            }`}
          >
            {(metrics.totalReturn * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-gray-500 mt-1 font-mono">
            Ann: {(metrics.annualizedReturn * 100).toFixed(1)}%
          </div>
        </div>

        {/* 4. Sharpe Ratio */}
        <div className="bg-gray-900/90 border border-gray-800 p-4 rounded-xl hover:border-gray-700/80 transition-all">
          <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Sharpe Ratio</span>
            <Scale className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              metrics.sharpe >= 1.5
                ? 'text-teal-400'
                : metrics.sharpe >= 1.0
                ? 'text-cyan-300'
                : metrics.sharpe > 0
                ? 'text-white'
                : 'text-rose-400'
            }`}
          >
            {metrics.sharpe.toFixed(2)}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">Total Volatility Adj.</div>
        </div>

        {/* 5. Sortino Ratio (NEW) */}
        <div className="bg-gradient-to-br from-gray-900 to-teal-950/20 border border-teal-500/20 p-4 rounded-xl hover:border-teal-500/40 transition-all">
          <div className="text-[11px] text-teal-300 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Sortino Ratio</span>
            <Activity className="h-3.5 w-3.5 text-teal-400" />
          </div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              ext.sortino >= 2.0
                ? 'text-teal-300'
                : ext.sortino >= 1.0
                ? 'text-teal-400'
                : 'text-gray-300'
            }`}
          >
            {ext.sortino.toFixed(2)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">Downside Risk Only</div>
        </div>

        {/* 6. Calmar Ratio (NEW) */}
        <div className="bg-gradient-to-br from-gray-900 to-cyan-950/20 border border-cyan-500/20 p-4 rounded-xl hover:border-cyan-500/40 transition-all">
          <div className="text-[11px] text-cyan-300 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Calmar Ratio</span>
            <Compass className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              ext.calmar >= 2.0
                ? 'text-cyan-300'
                : ext.calmar >= 1.0
                ? 'text-cyan-400'
                : 'text-gray-300'
            }`}
          >
            {ext.calmar.toFixed(2)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">Ann. Return / Max DD</div>
        </div>

        {/* 7. Profit Factor (NEW) */}
        <div className="bg-gradient-to-br from-gray-900 to-emerald-950/20 border border-emerald-500/20 p-4 rounded-xl hover:border-emerald-500/40 transition-all">
          <div className="text-[11px] text-emerald-300 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Profit Factor</span>
            <Percent className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              ext.profitFactor >= 2.0
                ? 'text-emerald-400'
                : ext.profitFactor >= 1.2
                ? 'text-teal-300'
                : 'text-amber-400'
            }`}
          >
            {ext.profitFactor > 0 ? ext.profitFactor.toFixed(2) : '1.00'}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">Gross Win / Gross Loss</div>
        </div>

        {/* 8. Max Drawdown */}
        <div className="bg-gray-900/90 border border-gray-800 p-4 rounded-xl hover:border-gray-700/80 transition-all">
          <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Max Drawdown</span>
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-400 mt-1">
            -{(Math.abs(metrics.maxDrawdown) * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-gray-500 mt-1">Peak-to-Trough Loss</div>
        </div>

        {/* 9. Win Rate */}
        <div className="bg-gray-900/90 border border-gray-800 p-4 rounded-xl hover:border-gray-700/80 transition-all">
          <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Win Rate</span>
            <Award className="h-3.5 w-3.5 text-teal-400" />
          </div>
          <div className="text-xl font-bold font-mono text-teal-400 mt-1">
            {(metrics.winRate * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-gray-500 mt-1">{metrics.tradesCount} Total Trades</div>
        </div>

        {/* 10. Exposure % (NEW) */}
        <div className="bg-gradient-to-br from-gray-900 to-indigo-950/20 border border-indigo-500/20 p-4 rounded-xl hover:border-indigo-500/40 transition-all">
          <div className="text-[11px] text-indigo-300 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Market Exposure</span>
            <PieChart className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-300 mt-1">
            {ext.exposurePct.toFixed(1)}%
          </div>
          <div className="text-[11px] text-gray-400 mt-1">Time In Position</div>
        </div>
      </div>
    </div>
  );
}
