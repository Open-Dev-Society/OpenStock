'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Bot, Save, Settings, Shield, TrendingUp, Zap, ChevronDown, ChevronRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface AIConfig {
    enabled: boolean;
    apiEndpoint: string;
    apiKey: string;
    model: string;
    systemPrompt: string;
    strategy: string;
    maxPositionPct: number;
    stopLossPct: number;
    tradingIntervalMin: number;
    lastTradeAt: string | null;
}

const STRATEGY_INFO: Record<string, { icon: typeof Zap; label: string; desc: string; color: string }> = {
    aggressive: { icon: TrendingUp, label: 'Aggressive', desc: 'Maximize short-term gains, high risk tolerance', color: 'text-red-400' },
    moderate: { icon: Shield, label: 'Moderate', desc: 'Balanced risk & reward', color: 'text-yellow-400' },
    conservative: { icon: Shield, label: 'Conservative', desc: 'Capital preservation first', color: 'text-green-400' },
    custom: { icon: Settings, label: 'Custom', desc: 'Fully customized trading strategy', color: 'text-purple-400' },
};

const STRATEGY_PRESET_PROMPTS: Record<string, string> = {
    aggressive: `You are an aggressive stock trading AI. Your goal is to maximize short-term returns and you are willing to accept higher risk.
- Prefer high-volatility, high-growth-potential stocks (e.g. AI, semiconductors, clean energy)
- Single position can reach up to 25% of account
- Stop-loss set at -10%
- Actively seek breakout and momentum trading opportunities
- Quick entries and exits; do not hold losing positions long-term
- Pay attention to market sentiment and news-driven events`,

    moderate: `You are a moderate stock trading AI. You seek a balance between risk and reward.
- Prefer mid-to-large cap tech stocks with solid fundamentals
- Single position limit of 20% of account
- Stop-loss set at -8%
- Combine technical and fundamental analysis
- Holding period of 1-4 weeks
- Diversify across sectors; avoid over-concentration`,

    conservative: `You are a conservative stock trading AI. Your primary goal is capital preservation, with growth as a secondary priority.
- Prefer blue-chip stocks and index ETFs
- Single position limit of 10% of account
- Stop-loss set at -5%
- Only act on high-conviction opportunities
- Maintain at least 20% cash as a safety cushion
- Strictly avoid chasing highs or catching falling knives`,
    custom: '',
};
export default function AITradingPanel({ accountId, userId }: { accountId: string; userId: string }) {
    const [config, setConfig] = useState<AIConfig | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [marketStatus, setMarketStatus] = useState<{ isOpen: boolean; label: string; nextOpen: string } | null>(null);

    // Form state
    const [apiEndpoint, setApiEndpoint] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('');
    const [strategy, setStrategy] = useState('moderate');
    const [maxPositionPct, setMaxPositionPct] = useState(25);
    const [stopLossPct, setStopLossPct] = useState(-10);
    const [tradingIntervalMin, setTradingIntervalMin] = useState(60);
    const [showKey, setShowKey] = useState(false);

    const loadConfig = useCallback(async () => {
        const { getAIConfig } = await import('@/lib/actions/ai-trading.actions');
        const cfg = await getAIConfig(accountId, userId);
        if (cfg) {
            setConfig(cfg);
            setApiEndpoint(cfg.apiEndpoint);
            setApiKey(cfg.apiKey);
            setModel(cfg.model);
            setSystemPrompt(cfg.systemPrompt);
            setStrategy(cfg.strategy);
            setMaxPositionPct(cfg.maxPositionPct);
            setStopLossPct(cfg.stopLossPct);
            setTradingIntervalMin(cfg.tradingIntervalMin);
        }
    }, [accountId]);

    useEffect(() => {
        loadConfig();
        // Check market status
        import('@/lib/utils/market-hours').then(({ getMarketStatus }) => {
            setMarketStatus(getMarketStatus());
        });
        // Refresh every 60s
        const interval = setInterval(() => {
            import('@/lib/utils/market-hours').then(({ getMarketStatus: gms }) => {
                setMarketStatus(gms());
            });
        }, 60000);
        return () => clearInterval(interval);
    }, [loadConfig]);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        const { saveAIConfig } = await import('@/lib/actions/ai-trading.actions');
        const res = await saveAIConfig(accountId, userId, {
            apiEndpoint,
            apiKey,
            model,
            systemPrompt,
            strategy,
            maxPositionPct,
            stopLossPct,
            tradingIntervalMin,
        });
        setSaving(false);
        if (res.success) {
            if (res.connectionTest) {
                if (res.connectionTest.ok) {
                    setMessage({ text: res.connectionTest.message, type: 'success' });
                } else {
                    setMessage({ text: res.connectionTest.message, type: 'error' });
                }
            } else {
                setMessage({ text: 'AI config saved', type: 'success' });
            }
            setConfig(res.config);
        } else {
            setMessage({ text: res.error || 'Save failed', type: 'error' });
        }
    };

    const handleToggle = async () => {
        const newEnabled = !config?.enabled;
        const { toggleAITrading } = await import('@/lib/actions/ai-trading.actions');
        const res = await toggleAITrading(accountId, newEnabled);
        if (res.success) {
            setConfig(prev => prev ? { ...prev, enabled: newEnabled } : null);
            setMessage({ text: newEnabled ? 'AI auto-trading enabled' : 'AI auto-trading stopped', type: 'success' });
        }
    };

    const handleStrategyPreset = (s: string) => {
        setStrategy(s);
        if (s === 'custom') return; // Don't override anything for custom
        setSystemPrompt(STRATEGY_PRESET_PROMPTS[s] || '');
        if (s === 'aggressive') { setMaxPositionPct(25); setStopLossPct(-10); }
        if (s === 'moderate') { setMaxPositionPct(20); setStopLossPct(-8); }
        if (s === 'conservative') { setMaxPositionPct(10); setStopLossPct(-5); }
    };

    const si = STRATEGY_INFO[strategy] || STRATEGY_INFO.moderate;
    const StrategyIcon = si.icon;

    return (
        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div
                className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        config?.enabled ? 'bg-teal-500/20' : 'bg-white/5'
                    }`}>
                        <Bot className={`w-5 h-5 ${config?.enabled ? 'text-teal-400' : 'text-gray-500'}`} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            AI Auto Trading
                            {config?.enabled && (
                                <span className="text-xs bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded-full font-normal">
                                    Running
                                </span>
                            )}
                            {marketStatus && (
                                <span className={`text-xs font-normal flex items-center gap-1 ${
                                    marketStatus.isOpen ? 'text-green-400' : 'text-yellow-400'
                                }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                                        marketStatus.isOpen ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
                                    }`} />
                                    {marketStatus.isOpen ? 'Market Open' : 'Market Closed'}
                                </span>
                            )}
                        </h3>
                        <p className="text-xs text-gray-500">
                            {config?.enabled
                                ? `Strategy: ${si.label} · Check every ${config.tradingIntervalMin} min`
                                : 'Configure LLM API for AI auto-trading'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {expanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                </div>
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="px-5 pb-5 space-y-5 border-t border-white/5 pt-5">
                    {/* Message */}
                    {message && (
                        <div className={`px-4 py-2 rounded-lg text-sm ${
                            message.type === 'success'
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                            {message.text}
                        </div>
                    )}

                    {/* Enable Toggle */}
                    <div className="flex items-center justify-between bg-white/5 rounded-lg p-4">
                        <div>
                            <p className="text-white font-medium">Enable AI Auto Trading</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                AI will analyze markets and execute trades on your configured schedule
                            </p>
                        </div>
                        <button
                            onClick={handleToggle}
                            className={`relative w-12 h-7 rounded-full transition-colors ${
                                config?.enabled ? 'bg-teal-600' : 'bg-white/10'
                            }`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform ${
                                config?.enabled ? 'translate-x-5' : ''
                            }`} />
                        </button>
                    </div>

                    {/* Strategy Presets */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Strategy</label>
                        <div className="grid grid-cols-4 gap-2">
                            {Object.entries(STRATEGY_INFO).map(([key, info]) => {
                                const Icon = info.icon;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => handleStrategyPreset(key)}
                                        className={`p-3 rounded-lg text-left transition-all ${
                                            strategy === key
                                                ? 'bg-teal-600/20 border border-teal-500/30'
                                                : 'bg-white/5 border border-white/5 hover:bg-white/10'
                                        }`}
                                    >
                                        <Icon className={`w-4 h-4 mb-1 ${info.color}`} />
                                        <p className="text-white text-sm font-medium">{info.label}</p>
                                        <p className="text-gray-500 text-xs">{info.desc}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {strategy === 'custom' && (
                        <div className="px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs text-purple-300">
                            💡 Custom mode: Write your full trading strategy in the <strong>System Prompt</strong> below.
                            Advanced parameters (position sizing, stop-loss, etc.) are fully under your control.
                        </div>
                    )}

                    {/* API Config */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">API Endpoint</label>
                            <input
                                type="text"
                                value={apiEndpoint}
                                onChange={e => setApiEndpoint(e.target.value)}
                                placeholder="https://api.openai.com/v1/chat/completions"
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Model</label>
                            <input
                                type="text"
                                value={model}
                                onChange={e => setModel(e.target.value)}
                                placeholder="gpt-4o / claude-3-opus / deepseek-v3"
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs text-gray-400 mb-1">API Key</label>
                            <div className="relative">
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    value={apiKey}
                                    onChange={e => setApiKey(e.target.value)}
                                    placeholder="sk-..."
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 pr-10 text-white text-sm font-mono focus:outline-none focus:border-teal-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                >
                                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Advanced Settings */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Max Position (%)</label>
                            <input
                                type="number"
                                value={maxPositionPct}
                                onChange={e => setMaxPositionPct(Number(e.target.value))}
                                min={5} max={100}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Stop Loss (%)</label>
                            <input
                                type="number"
                                value={stopLossPct}
                                onChange={e => setStopLossPct(Number(e.target.value))}
                                max={0} min={-50}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Check Interval (min)</label>
                            <input
                                type="number"
                                value={tradingIntervalMin}
                                onChange={e => setTradingIntervalMin(Number(e.target.value))}
                                min={5} max={1440}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                            />
                        </div>
                    </div>

                    {/* System Prompt */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">
                            System Prompt
                            <span className="text-gray-600 ml-1">(Custom instructions; merged with strategy preset)</span>
                        </label>
                        <textarea
                            value={systemPrompt}
                            onChange={e => setSystemPrompt(e.target.value)}
                            rows={6}
                            placeholder="Enter custom trading instructions, or select a strategy preset above..."
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-teal-500 resize-y"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Config'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
