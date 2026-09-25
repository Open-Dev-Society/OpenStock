'use client';

import React, { useState } from 'react';
import {
  Code,
  Copy,
  Check,
  Download,
  Terminal,
  FileCode,
  X,
  ExternalLink,
  Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StrategyType } from './types';
import { exportStrategyCode, StrategyExportBundle } from '@/lib/strategy/codeExport';

interface CodeExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategyType: StrategyType | string;
  symbol: string;
  timeframe: string;
  params: Record<string, number>;
}

type TabType = 'pine' | 'vectorbt' | 'nautilus' | 'qlib' | 'tensortrade';

export default function CodeExportModal({
  open,
  onOpenChange,
  strategyType,
  symbol,
  timeframe,
  params,
}: CodeExportModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('pine');
  const [copied, setCopied] = useState<boolean>(false);

  if (!open) return null;

  const cleanSymbol = symbol.replace('BINANCE:', '').trim() || 'BTCUSDT';

  let bundle: StrategyExportBundle;
  try {
    bundle = exportStrategyCode({
      type: strategyType,
      params,
      symbol: cleanSymbol,
      timeframe,
    }) as StrategyExportBundle;
  } catch {
    bundle = exportStrategyCode({
      type: 'ema_crossover',
      params,
      symbol: cleanSymbol,
      timeframe,
    }) as StrategyExportBundle;
  }

  const currentExport = bundle.exports[activeTab];
  const activeCode = currentExport ? currentExport.code : '';
  const filename = currentExport ? currentExport.filename : `${strategyType}_${cleanSymbol}.txt`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  const handleDownload = () => {
    const blob = new Blob([activeCode], { type: `${currentExport?.mimeType || 'text/plain'};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800 bg-gray-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Code className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Export Production Strategy Code
                <span className="text-xs font-mono font-normal bg-teal-500/10 text-teal-400 border border-teal-500/30 px-2 py-0.5 rounded">
                  {strategyType.toUpperCase()}
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                1-click exportable executable code for TradingView, Python Vectorbt, NautilusTrader, and Microsoft Qlib.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-5 pt-3 bg-gray-950/40 border-b border-gray-800">
          <div className="flex space-x-1">
            <button
              type="button"
              onClick={() => setActiveTab('pine')}
              className={`px-4 py-2 text-xs font-bold font-mono rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'pine'
                  ? 'border-teal-400 text-teal-300 bg-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              <FileCode className="h-3.5 w-3.5" />
              TradingView Pine v5
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('vectorbt')}
              className={`px-4 py-2 text-xs font-bold font-mono rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'vectorbt'
                  ? 'border-teal-400 text-teal-300 bg-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              Python Vectorbt
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('nautilus')}
              className={`px-4 py-2 text-xs font-bold font-mono rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'nautilus'
                  ? 'border-teal-400 text-teal-300 bg-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              NautilusTrader (HFT/DMA)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('qlib')}
              className={`px-4 py-2 text-xs font-bold font-mono rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'qlib'
                  ? 'border-teal-400 text-teal-300 bg-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              <Code className="h-3.5 w-3.5" />
              Microsoft Qlib
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tensortrade')}
              className={`px-4 py-2 text-xs font-bold font-mono rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'tensortrade'
                  ? 'border-teal-400 text-teal-300 bg-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              <Cpu className="h-3.5 w-3.5" />
              TensorTrade (RL)
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="h-8 text-xs font-mono bg-gray-800/80 hover:bg-gray-700 text-gray-200 border-gray-700 gap-1.5"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              className="h-8 text-xs font-mono bg-teal-600 hover:bg-teal-500 text-white gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 p-5 overflow-auto bg-gray-950 font-mono text-xs text-gray-300 leading-relaxed select-all">
          <pre className="whitespace-pre overflow-x-auto selection:bg-teal-500/30">
            <code>{activeCode}</code>
          </pre>
        </div>

        {/* Footer info banner */}
        <div className="p-3 bg-gray-900/90 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span>Target: {cleanSymbol} ({timeframe})</span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-400">{currentExport?.description || ''}</span>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'pine' && (
              <a
                href="https://www.tradingview.com/pine-script-docs/en/v5/index.html"
                target="_blank"
                rel="noreferrer"
                className="text-teal-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                Pine Docs <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {activeTab === 'vectorbt' && (
              <a
                href="https://vectorbt.pro/"
                target="_blank"
                rel="noreferrer"
                className="text-teal-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                Vectorbt Docs <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {activeTab === 'nautilus' && (
              <a
                href="https://nautilustrader.io/"
                target="_blank"
                rel="noreferrer"
                className="text-teal-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                Nautilus Docs <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {activeTab === 'qlib' && (
              <a
                href="https://qlib.readthedocs.io/"
                target="_blank"
                rel="noreferrer"
                className="text-teal-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                Qlib Docs <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
