'use server';

import { connectToDatabase } from '@/database/mongoose';
import { AITradingConfigModel } from '@/database/models/paper-trading.model';
import { revalidatePath } from 'next/cache';
import { getAccountOverview, getPositions, buyStock, sellStock } from '@/lib/actions/paper-trading.actions';
import { isMarketOpen, getMarketStatus } from '@/lib/utils/market-hours';
import mongoose from 'mongoose';

// ── Config CRUD ──

export async function getAIConfig(accountId: string, userId?: string) {
    try {
        await connectToDatabase();
        const query: any = { accountId };
        if (userId) query.userId = userId;
        const config = await AITradingConfigModel.findOne(query);
        if (!config) {
            return {
                enabled: false,
                apiEndpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: '',
                model: 'gpt-4o',
                systemPrompt: '',
                strategy: 'moderate' as const,
                maxPositionPct: 25,
                stopLossPct: -10,
                tradingIntervalMin: 60,
                lastTradeAt: null,
            };
        }
        return JSON.parse(JSON.stringify(config));
    } catch (error) {
        console.error('Error getting AI config:', error);
        return null;
    }
}

function normalizeEndpoint(endpoint: string): string {
    try {
        const parsed = new URL(endpoint);
        if (parsed.pathname === '/' || parsed.pathname === '') {
            return `${endpoint.replace(/\/+$/, '')}/chat/completions`;
        }
    } catch {
        // If URL parsing fails, use as-is
    }
    return endpoint;
}

async function testAIConnection(endpoint: string, apiKey: string, model: string): Promise<{ ok: boolean; error?: string }> {
    try {
        // Use global fetch (Next.js polyfilled version) with proxy from env
        const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
        let dispatcher: any = undefined;
        try {
            const undici = await import('undici');
            if (proxyUrl) {
                dispatcher = new undici.ProxyAgent(proxyUrl);
            }
        } catch {
            // undici import failed, try without proxy
        }

        const url = normalizeEndpoint(endpoint);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const fetchOptions: any = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: 'Reply with just: ok' }],
                max_tokens: 10,
            }),
            signal: controller.signal,
        };
        if (dispatcher) fetchOptions.dispatcher = dispatcher;

        let resp: Response;
        try {
            resp = await globalThis.fetch(url, fetchOptions);
        } catch {
            // If globalThis.fetch fails (e.g. no proxy support), try undici directly
            const undici = await import('undici');
            resp = await undici.fetch(url, fetchOptions);
        }
        clearTimeout(timeoutId);

        if (!resp.ok) {
            const text = await resp.text().catch(() => '');
            return { ok: false, error: `HTTP ${resp.status}: ${text.slice(0, 100)}` };
        }

        const json = await resp.json() as any;
        if (!json.choices?.[0]?.message) {
            return { ok: false, error: 'API returned unexpected response format' };
        }
        // DeepSeek reasoning models put response in reasoning_content instead of content
        const message = json.choices[0].message;
        if (!message.content && !message.reasoning_content) {
            return { ok: false, error: 'API response has no content' };
        }

        return { ok: true };
    } catch (err: any) {
        return { ok: false, error: err.message };
    }
}

export async function saveAIConfig(accountId: string, userId: string, data: {
    apiEndpoint?: string;
    apiKey?: string;
    model?: string;
    systemPrompt?: string;
    strategy?: string;
    maxPositionPct?: number;
    stopLossPct?: number;
    tradingIntervalMin?: number;
}) {
    try {
        await connectToDatabase();
        const config = await AITradingConfigModel.findOneAndUpdate(
            { accountId },
            { $set: { ...data, accountId, userId, lastTradeAt: null } },
            { upsert: true, new: true }
        );
        revalidatePath('/paper-trading');

        // Only test connection if apiKey and apiEndpoint are provided
        const apiKey = data.apiKey || config.apiKey;
        const apiEndpoint = data.apiEndpoint || config.apiEndpoint;
        const model = data.model || config.model;

        if (apiKey && apiEndpoint) {
            const testResult = await testAIConnection(apiEndpoint, apiKey, model);

            if (testResult.ok) {
                // Auto-enable on successful connection test
                await AITradingConfigModel.findOneAndUpdate(
                    { accountId },
                    { $set: { enabled: true } }
                );
                const updated = await AITradingConfigModel.findOne({ accountId }).lean();
                revalidatePath('/paper-trading');
                return {
                    success: true,
                    config: JSON.parse(JSON.stringify(updated)),
                    connectionTest: { ok: true, message: 'Connected ✓ AI auto-trading enabled' },
                };
            } else {
                return {
                    success: true,
                    config: JSON.parse(JSON.stringify(config)),
                    connectionTest: { ok: false, message: `Connection failed: ${testResult.error}` },
                };
            }
        }

        return { success: true, config: JSON.parse(JSON.stringify(config)) };
    } catch (error: any) {
        console.error('Error saving AI config:', error);
        return { success: false, error: `Failed to save config: ${error.message}` };
    }
}

export async function toggleAITrading(accountId: string, enabled: boolean, userId?: string) {
    try {
        await connectToDatabase();
        await AITradingConfigModel.findOneAndUpdate(
            { accountId },
            { $set: { enabled, accountId, userId } },
            { upsert: true }
        );
        revalidatePath('/paper-trading');
        return { success: true, enabled };
    } catch (error) {
        console.error('Error toggling AI trading:', error);
        return { success: false, error: 'Failed to toggle AI trading' };
    }
}

// ── Strategy Presets ──

const STRATEGY_PROMPTS: Record<string, string> = {
    aggressive: `你是一个激进型股票交易 AI。你的目标是最大化短期收益，愿意承担较高风险。
- 偏好高波动性、高增长潜力的股票
- 单次持仓可达账户的 25%
- 止损设在 -10%
- 积极寻找突破、动量交易机会
- 快速进出，不长期持有亏损仓位`,

    moderate: `你是一个稳健型股票交易 AI。你追求风险与收益的平衡。
- 偏好基本面良好的中大盘股
- 单次持仓不超过账户的 20%
- 止损设在 -8%
- 结合技术面和基本面分析
- 持有周期 1-4 周`,

    conservative: `你是一个保守型股票交易 AI。你的首要目标是保护本金，其次才是增值。
- 偏好蓝筹股、ETF
- 单次持仓不超过账户的 10%
- 止损设在 -5%
- 只在确定性高的机会才出手
- 保持一定现金比例作为安全垫`,
};

// ── AI Trading Decision ──

interface AIDecision {
    action: 'BUY' | 'SELL' | 'HOLD';
    symbol: string;
    shares?: number;
    reason: string;
}

interface AITradeResult {
    decisions: AIDecision[];
    executed: { symbol: string; action: string; shares: number; price: number; total: number }[];
    errors: string[];
    summary: string;
}

export async function runAITradeCycle(accountId: string, force: boolean = false): Promise<AITradeResult> {
    try {
        await connectToDatabase();

        // 1. Load AI config
        const config = await AITradingConfigModel.findOne({ accountId });
        if (!config || !config.apiKey) {
            return { decisions: [], executed: [], errors: ['AI not configured or missing API key'], summary: '' };
        }

        // 2. Check interval (skip for manual "force" runs)
        if (!force && config.lastTradeAt && config.tradingIntervalMin > 0) {
            const elapsed = Date.now() - new Date(config.lastTradeAt).getTime();
            const intervalMs = config.tradingIntervalMin * 60 * 1000;
            if (elapsed < intervalMs) {
                const remaining = Math.ceil((intervalMs - elapsed) / 60000);
                return { decisions: [], executed: [], errors: [], summary: `Skipped — last trade ${Math.floor(elapsed / 60000)}m ago, interval set to ${config.tradingIntervalMin}m. Next check in ~${remaining}m.` };
            }
        }

        // 3. Load portfolio
        const overview = await getAccountOverview(accountId);
        const positions = await getPositions(accountId);
        if (!overview) {
            return { decisions: [], executed: [], errors: ['无法获取账户信息'], summary: '' };
        }

        const account = overview.account;

        // 3. Check if trading period has expired
        if (account.endDate && account.tradingPeriod !== 'unlimited') {
            const now = new Date();
            const end = new Date(account.endDate);
            if (now > end) {
                return {
                    decisions: [],
                    executed: [],
                    errors: [`Trading period ended ${end.toLocaleDateString('en-US')}. AI auto-trading stopped. You can still trade manually.`],
                    summary: '',
                };
            }
        }

        // 4. Check if market is open
        if (!isMarketOpen()) {
            const status = getMarketStatus();
            return {
                decisions: [],
                executed: [],
                errors: [`Market is currently closed (${status.label}). AI trading only runs during US market hours (Mon-Fri, 9:30 AM - 4:00 PM ET). ${status.nextOpen}.`],
                summary: '',
            };
        }

        // 5. Build portfolio context
        const totalValue = account.balance + positions.reduce((sum: number, p: any) => sum + p.marketValue, 0);
        const portfolioLines = [
            `账户总资产: $${totalValue.toFixed(2)}`,
            `现金余额: $${account.balance.toFixed(2)}`,
            `初始资金: $${account.initialCapital.toFixed(2)}`,
            `总盈亏: $${(totalValue - account.initialCapital).toFixed(2)} (${(((totalValue - account.initialCapital) / account.initialCapital) * 100).toFixed(2)}%)`,
            '',
            '当前持仓:',
        ];

        for (const pos of positions) {
            portfolioLines.push(
                `${pos.symbol} (${pos.company}): ${pos.shares}股, 成本 $${pos.avgCost.toFixed(2)}, 现价 $${pos.currentPrice.toFixed(2)}, 市值 $${pos.marketValue.toFixed(2)}, 盈亏 ${pos.pl >= 0 ? '+' : ''}$${pos.pl.toFixed(2)} (${pos.plPercent >= 0 ? '+' : ''}${pos.plPercent}%)`
            );
        }

        if (positions.length === 0) portfolioLines.push('(空仓)');

        portfolioLines.push('');
        portfolioLines.push(`策略: ${config.strategy}`);
        portfolioLines.push(`最大单仓占比: ${config.maxPositionPct}%`);
        portfolioLines.push(`止损线: ${config.stopLossPct}%`);

        const portfolioText = portfolioLines.join('\n');

        // 5. Build prompt
        const strategyPrompt = STRATEGY_PROMPTS[config.strategy] || STRATEGY_PROMPTS.moderate;
        const systemPrompt = config.systemPrompt || strategyPrompt;

        const userPrompt = `当前时间: ${new Date().toISOString()}

${portfolioText}

请分析当前持仓并做出交易决策。返回 JSON 数组，每个决策包含:
- action: "BUY" | "SELL" | "HOLD"
- symbol: 股票代码
- shares: 股数 (BUY/SELL 时必填)
- reason: 简短理由

只返回有效的 JSON 数组。示例:
[{"action": "SELL", "symbol": "AAPL", "shares": 10, "reason": "触及止损线 -8%"}]
如果没有需要操作的，返回空数组 []。`;

        // 6. Call LLM
        let aiResponse: string;
        try {
            const proxyUrl = process.env.HTTPS_PROXY;
            let dispatcher: any = undefined;
            const undici = await import('undici');
            if (proxyUrl) {
                const { ProxyAgent } = await import('undici');
                dispatcher = new ProxyAgent(proxyUrl);
            }

            // 30s timeout for LLM call
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const fetchOptions: any = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    temperature: 0.3,
                    max_tokens: 1000,
                }),
                signal: controller.signal,
            };
            if (dispatcher) fetchOptions.dispatcher = dispatcher;

            // Normalize endpoint: auto-append /chat/completions if base URL only
            const endpoint = normalizeEndpoint(config.apiEndpoint);

            const resp = await undici.fetch(endpoint, fetchOptions);
            clearTimeout(timeoutId);

            const json = await resp.json() as any;
            const msg = json.choices?.[0]?.message;
            aiResponse = msg?.content || msg?.reasoning_content || '';
        } catch (err: any) {
            return { decisions: [], executed: [], errors: [`AI API 调用失败: ${err.message}`], summary: '' };
        }

        // 7. Parse AI response
        let decisions: AIDecision[] = [];
        try {
            const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
            const jsonStr = jsonMatch ? jsonMatch[1].trim() : aiResponse.trim();
            decisions = JSON.parse(jsonStr);
        } catch {
            return { decisions: [], executed: [], errors: [`AI 返回格式错误: ${aiResponse.slice(0, 200)}`], summary: aiResponse };
        }

        if (!Array.isArray(decisions) || decisions.length === 0) {
            return { decisions: [], executed: [], errors: [], summary: aiResponse || '无操作建议' };
        }

        // 8. Execute trades
        const executed: any[] = [];
        const errors: string[] = [];

        for (const dec of decisions) {
            try {
                if (dec.action === 'BUY' && dec.shares && dec.shares > 0) {
                    const result = await buyStock(accountId, dec.symbol.toUpperCase(), dec.symbol.toUpperCase(), dec.shares);
                    if (result.success) {
                        const priceMatch = (result.message || '').match(/\$([\d.]+)/g);
                        const price = priceMatch && priceMatch.length >= 1 ? parseFloat(priceMatch[0].replace('$', '')) : 0;
                        executed.push({ symbol: dec.symbol.toUpperCase(), action: 'BUY', shares: dec.shares, price: price || 0, total: (price || 0) * dec.shares });
                    } else {
                        errors.push(`${dec.symbol} 买入失败: ${result.error}`);
                    }
                } else if (dec.action === 'SELL' && dec.shares && dec.shares > 0) {
                    const result = await sellStock(accountId, dec.symbol.toUpperCase(), dec.shares);
                    if (result.success) {
                        const priceMatch = (result.message || '').match(/\$([\d.]+)/g);
                        const price = priceMatch && priceMatch.length >= 1 ? parseFloat(priceMatch[0].replace('$', '')) : 0;
                        executed.push({ symbol: dec.symbol.toUpperCase(), action: 'SELL', shares: dec.shares, price: price || 0, total: (price || 0) * dec.shares });
                    } else {
                        errors.push(`${dec.symbol} 卖出失败: ${result.error}`);
                    }
                }
            } catch (err: any) {
                errors.push(`${dec.symbol} 交易异常: ${err.message}`);
            }
        }

        // Update lastTradeAt
        if (executed.length > 0) {
            await AITradingConfigModel.findOneAndUpdate(
                { accountId },
                { $set: { lastTradeAt: new Date() } }
            );
        }

        revalidatePath('/paper-trading');

        return { decisions, executed, errors, summary: aiResponse };
    } catch (error: any) {
        console.error('AI trade cycle error:', error);
        return { decisions: [], executed: [], errors: [`系统错误: ${error.message}`], summary: '' };
    }
}
