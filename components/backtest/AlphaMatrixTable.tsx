'use client';

import React, { useState, useMemo } from 'react';
import {
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Play,
  Search,
  BookOpen,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  MatrixItem,
  ALPHA_MATRIX_YTD,
  ALPHA_MATRIX_5YR,
  STRATEGY_GUIDES,
  StrategyType,
} from './types';
import { QUANT_SYMBOL_UNIVERSE } from '@/lib/market/symbols';

interface AlphaMatrixTableProps {
  onSelectStrategy?: (symbol: string, strategyKey: StrategyType) => void;
}

export default function AlphaMatrixTable({ onSelectStrategy }: AlphaMatrixTableProps) {
  const [horizon, setHorizon] = useState<'ytd' | '5yr'>('ytd');
  const [selectedAsset, setSelectedAsset] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortKey, setSortKey] = useState<keyof MatrixItem>('ret');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [showMethodology, setShowMethodology] = useState<boolean>(false);

  const assets = useMemo(() => {
    const syms = QUANT_SYMBOL_UNIVERSE.map(s => s.symbol.replace('BINANCE:', ''));
    return ['ALL', ...Array.from(new Set(syms))];
  }, []);

  const rawList = horizon === 'ytd' ? ALPHA_MATRIX_YTD : ALPHA_MATRIX_5YR;

  const filteredAndSortedList = useMemo(() => {
    let list = [...rawList];

    if (selectedAsset !== 'ALL') {
      list = list.filter((item) => item.symbol === selectedAsset);
    }

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.symbol.toLowerCase().includes(q) ||
          item.strategy.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      const numA = Number(valA ?? 0);
      const numB = Number(valB ?? 0);

      return sortAsc ? numA - numB : numB - numA;
    });

    return list;
  }, [rawList, selectedAsset, searchQuery, sortKey, sortAsc]);

  const maxPositiveRet = useMemo(() => {
    const maxVal = Math.max(...rawList.map((d) => (d.ret > 0 ? d.ret : 0)), 1);
    return maxVal;
  }, [rawList]);

  const handleSort = (key: keyof MatrixItem) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'mdd'); // ascending for drawdown (least negative first)
    }
  };

  const renderSortIndicator = (key: keyof MatrixItem) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="h-3 w-3 opacity-40 ml-1 inline" />;
    }
    return sortAsc ? (
      <ArrowUp className="h-3 w-3 text-teal-400 ml-1 inline" />
    ) : (
      <ArrowDown className="h-3 w-3 text-teal-400 ml-1 inline" />
    );
  };

  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-6">
      {/* Title & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Layers className="h-4 w-4" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Alpha Matrix: Multi-Asset Strategy Comparison
            </h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Empirical cross-sectional performance ranking evaluating Sortino, Calmar, Sharpe, Max Drawdown, and Win Rate.
          </p>
        </div>

        {/* Horizon Switcher */}
        <div className="flex items-center gap-2 bg-gray-950 p-1 rounded-xl border border-gray-800">
          <button
            type="button"
            onClick={() => setHorizon('ytd')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              horizon === 'ytd'
                ? 'bg-teal-500 text-black shadow-md shadow-teal-500/20'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            YTD (2026)
          </button>
          <button
            type="button"
            onClick={() => setHorizon('5yr')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              horizon === '5yr'
                ? 'bg-teal-500 text-black shadow-md shadow-teal-500/20'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            5-Year (2021–2026)
          </button>
        </div>
      </div>

      {/* 3 Highlight Stat Cards from matrix.html */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Pure Alpha */}
        <div className="bg-gradient-to-br from-gray-900 to-emerald-950/30 border border-emerald-500/20 p-4 rounded-xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              Top Pure Alpha Strategy
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-900/80 text-gray-400 border border-gray-800">
              {horizon === 'ytd' ? 'YTD 2026' : '5-Year'}
            </span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-1">
            {horizon === 'ytd' ? '+37.39%' : '+1018.0%'}
          </div>
          <div className="text-xs text-gray-300 mt-1 leading-snug">
            {horizon === 'ytd' ? (
              <>
                <strong>Overnight Hold (Close-to-Open)</strong> on <code className="text-emerald-300">NVDA</code>. Outperformed Buy &amp; Hold (+16.75%) by dodging intraday chop.
              </>
            ) : (
              <>
                <strong>Buy &amp; Hold Benchmark</strong> on <code className="text-emerald-300">NVDA</code> (+61.2% CAGR) with +548.9% on Overnight Only.
              </>
            )}
          </div>
        </div>

        {/* Top Risk Adjusted */}
        <div className="bg-gradient-to-br from-gray-900 to-teal-950/30 border border-teal-500/20 p-4 rounded-xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-teal-400" />
              Top Risk-Adjusted (Sharpe / Sortino)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-900/80 text-gray-400 border border-gray-800">
              {horizon === 'ytd' ? 'YTD 2026' : '5-Year'}
            </span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-teal-300 mt-1">
            {horizon === 'ytd' ? '2.06 Sharpe (3.42 Sortino)' : '1.31 Sharpe (1.95 Sortino)'}
          </div>
          <div className="text-xs text-gray-300 mt-1 leading-snug">
            {horizon === 'ytd' ? (
              <>
                <strong>MACD Momentum Filter</strong> on <code className="text-teal-300">SPY</code> (+9.75% Return, only <strong>-2.85% Max Drawdown</strong>, 3.42 Calmar).
              </>
            ) : (
              <>
                <strong>Overnight Only</strong> on <code className="text-teal-300">NVDA</code> compressed volatility with 58.6% win rate and 1.95 Sortino.
              </>
            )}
          </div>
        </div>

        {/* Drawdown Compression */}
        <div className="bg-gradient-to-br from-gray-900 to-amber-950/20 border border-amber-500/20 p-4 rounded-xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              Max Drawdown Compression
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-900/80 text-gray-400 border border-gray-800">
              5-Year Benchmark
            </span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-400 mt-1">
            -10.4% Max DD
          </div>
          <div className="text-xs text-gray-300 mt-1 leading-snug">
            <strong>Bollinger Bands Reversion</strong> on <code className="text-amber-300">SPY</code> compressed benchmark drawdown from -24.5% to -10.4% while returning +53.7%.
          </div>
        </div>
      </div>

      {/* Asset Filter & Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-gray-950/80 p-3 rounded-xl border border-gray-800">
        {/* Asset Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" />
            Asset:
          </span>
          {assets.map((ast) => (
            <button
              key={ast}
              type="button"
              onClick={() => setSelectedAsset(ast)}
              className={`text-xs px-2.5 py-1 rounded-md font-mono transition-all ${
                selectedAsset === ast
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold'
                  : 'bg-gray-900 text-gray-400 hover:text-gray-200 border border-gray-800'
              }`}
            >
              {ast}
            </button>
          ))}
        </div>

        {/* Search & Methodology Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticker or strategy..."
              className="bg-gray-900 border border-gray-800 text-gray-200 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:border-teal-500 outline-none w-48 font-mono"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowMethodology(!showMethodology)}
            className="text-xs border-gray-700 text-gray-300 hover:bg-gray-800 h-8 gap-1.5"
          >
            <BookOpen className="h-3.5 w-3.5 text-teal-400" />
            {showMethodology ? 'Hide Rules' : 'Strategy Rules'}
          </Button>
        </div>
      </div>

      {/* Interactive Performance Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-gray-950 text-gray-400 uppercase tracking-wider border-b border-gray-800 select-none">
            <tr>
              <th
                onClick={() => handleSort('symbol')}
                className="py-3 px-4 cursor-pointer hover:text-gray-200"
              >
                Symbol {renderSortIndicator('symbol')}
              </th>
              <th
                onClick={() => handleSort('strategy')}
                className="py-3 px-4 cursor-pointer hover:text-gray-200"
              >
                Strategy {renderSortIndicator('strategy')}
              </th>
              <th
                onClick={() => handleSort('ret')}
                className="py-3 px-4 cursor-pointer hover:text-gray-200"
              >
                Total Return {renderSortIndicator('ret')}
              </th>
              {horizon === '5yr' && (
                <th
                  onClick={() => handleSort('cagr')}
                  className="py-3 px-4 cursor-pointer hover:text-gray-200"
                >
                  CAGR {renderSortIndicator('cagr')}
                </th>
              )}
              <th
                onClick={() => handleSort('mdd')}
                className="py-3 px-4 cursor-pointer hover:text-gray-200"
              >
                Max Drawdown {renderSortIndicator('mdd')}
              </th>
              <th
                onClick={() => handleSort('sharpe')}
                className="py-3 px-4 cursor-pointer hover:text-gray-200"
              >
                Sharpe {renderSortIndicator('sharpe')}
              </th>
              <th
                onClick={() => handleSort('sortino')}
                className="py-3 px-4 cursor-pointer hover:text-gray-200"
              >
                Sortino {renderSortIndicator('sortino')}
              </th>
              <th
                onClick={() => handleSort('calmar')}
                className="py-3 px-4 cursor-pointer hover:text-gray-200"
              >
                Calmar {renderSortIndicator('calmar')}
              </th>
              <th
                onClick={() => handleSort('winRate')}
                className="py-3 px-4 cursor-pointer hover:text-gray-200"
              >
                Win Rate {renderSortIndicator('winRate')}
              </th>
              <th className="py-3 px-4">Alpha Strength</th>
              {onSelectStrategy && <th className="py-3 px-4 text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60 bg-gray-900/40">
            {filteredAndSortedList.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-gray-500">
                  No strategies match the selected asset and filter criteria.
                </td>
              </tr>
            ) : (
              filteredAndSortedList.map((row, idx) => {
                const isGain = row.ret >= 0;
                const retFormatted = `${isGain ? '+' : ''}${row.ret.toFixed(1)}%`;
                const cagrFormatted = `${row.cagr >= 0 ? '+' : ''}${row.cagr.toFixed(1)}%`;
                const barWidth = Math.min(
                  100,
                  Math.max(4, (Math.abs(row.ret) / maxPositiveRet) * 100)
                );

                return (
                  <tr
                    key={`${row.symbol}-${row.strategy}-${idx}`}
                    className="hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className="font-bold text-gray-200 bg-gray-950 px-2 py-0.5 rounded border border-gray-800">
                        {row.symbol}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-300 font-sans font-medium">
                      {row.strategy}
                    </td>
                    <td
                      className={`py-3 px-4 font-bold ${
                        isGain ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {retFormatted}
                    </td>
                    {horizon === '5yr' && (
                      <td className="py-3 px-4 text-gray-300">{cagrFormatted}</td>
                    )}
                    <td className="py-3 px-4 font-bold text-rose-400">
                      {row.mdd.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-gray-200">{row.sharpe.toFixed(2)}</td>
                    <td className="py-3 px-4 text-teal-300 font-bold">
                      {row.sortino.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-cyan-300">{row.calmar.toFixed(2)}</td>
                    <td className="py-3 px-4 text-gray-300">{row.winRate.toFixed(1)}%</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isGain ? 'bg-teal-400' : 'bg-rose-400'
                            }`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500">{barWidth.toFixed(0)}%</span>
                      </div>
                    </td>
                    {onSelectStrategy && (
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (row.strategyKey) {
                              onSelectStrategy(row.symbol, row.strategyKey);
                            }
                          }}
                          className="text-[11px] font-sans font-semibold text-teal-400 hover:text-teal-300 hover:underline flex items-center justify-end gap-1 ml-auto"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          Load
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Strategy Methodology Guide Cards (Expandable) */}
      {showMethodology && (
        <div className="pt-4 border-t border-gray-800 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-teal-400" />
              Quantitative Strategy Methodology Directory
            </h3>
            <span className="text-xs text-gray-500">8 Standard Quantitative Models</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {STRATEGY_GUIDES.map((g) => (
              <div
                key={g.id}
                className="bg-gray-950 border border-gray-800/80 p-3.5 rounded-xl space-y-2 hover:border-gray-700 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="text-xs font-bold text-teal-300 font-sans">{g.name}</div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-900 text-gray-400 border border-gray-800">
                    {g.category}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                  {g.description}
                </p>
                <div className="text-[10px] font-mono text-gray-400 bg-gray-900/90 p-1.5 rounded border-l-2 border-teal-500">
                  {g.rule}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
