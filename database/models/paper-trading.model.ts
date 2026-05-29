import { Schema, model, models, type Document, type Model } from 'mongoose';

export type TradingPeriod = '1m' | '3m' | '6m' | '1y' | 'unlimited' | 'custom';

// ══════════════════════════════════════════════════
// Paper Trading Account (multi-account support)
// ══════════════════════════════════════════════════
export interface PaperTradingAccount extends Document {
    userId: string;             // owner user id
    name: string;               // account display name
    balance: number;
    initialCapital: number;
    tradingPeriod: TradingPeriod;
    customPeriodDays: number | null;
    startDate: Date;
    endDate: Date | null;
    isActive: boolean;          // which account is currently selected (client-driven, server tracks last)
    createdAt: Date;
    updatedAt: Date;
}

const AccountSchema = new Schema<PaperTradingAccount>(
    {
        userId: { type: String, required: true, index: true },
        name: { type: String, required: true, default: 'Default Account', trim: true },
        balance: { type: Number, required: true, default: 100000 },
        initialCapital: { type: Number, required: true, default: 100000 },
        tradingPeriod: { type: String, enum: ['1m', '3m', '6m', '1y', 'unlimited', 'custom'], default: 'unlimited' },
        customPeriodDays: { type: Number, default: null },
        startDate: { type: Date, default: Date.now },
        endDate: { type: Date, default: null },
        isActive: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Compound index: one active account per user
AccountSchema.index({ userId: 1, isActive: 1 });

// ══════════════════════════════════════════════════
// Paper Trade (scoped to accountId)
// ══════════════════════════════════════════════════
export interface PaperTrade extends Document {
    accountId: string;          // which account this trade belongs to
    userId: string;             // who made the trade (for backward compat)
    symbol: string;
    company: string;
    type: 'BUY' | 'SELL';
    shares: number;
    price: number;
    total: number;
    timestamp: Date;
}

const TradeSchema = new Schema<PaperTrade>(
    {
        accountId: { type: String, required: true, index: true },
        userId: { type: String, required: true, index: true },
        symbol: { type: String, required: true, uppercase: true, trim: true },
        company: { type: String, required: true, trim: true },
        type: { type: String, enum: ['BUY', 'SELL'], required: true },
        shares: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true },
        total: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now },
    },
    { timestamps: false }
);

TradeSchema.index({ accountId: 1, timestamp: -1 });
TradeSchema.index({ accountId: 1, symbol: 1 });

// ══════════════════════════════════════════════════
// AI Trading Config (scoped to accountId)
// ══════════════════════════════════════════════════
export type AIStrategy = 'aggressive' | 'moderate' | 'conservative' | 'custom';

export interface AITradingConfig extends Document {
    accountId: string;          // which account this config belongs to
    userId: string;             // owner user id
    enabled: boolean;
    apiEndpoint: string;
    apiKey: string;
    model: string;
    systemPrompt: string;
    strategy: AIStrategy;
    maxPositionPct: number;
    stopLossPct: number;
    tradingIntervalMin: number;
    lastTradeAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const AIConfigSchema = new Schema<AITradingConfig>(
    {
        accountId: { type: String, required: true, unique: true, index: true },
        userId: { type: String, required: true, index: true },
        enabled: { type: Boolean, default: false },
        apiEndpoint: { type: String, default: 'https://api.openai.com/v1/chat/completions' },
        apiKey: { type: String, default: '' },
        model: { type: String, default: 'gpt-4o' },
        systemPrompt: { type: String, default: '' },
        strategy: { type: String, enum: ['aggressive', 'moderate', 'conservative', 'custom'], default: 'moderate' },
        maxPositionPct: { type: Number, default: 25, min: 1, max: 100 },
        stopLossPct: { type: Number, default: -10, max: 0 },
        tradingIntervalMin: { type: Number, default: 60, min: 5 },
        lastTradeAt: { type: Date, default: null },
    },
    { timestamps: true }
);

// ══════════════════════════════════════════════════
// Exports
// ══════════════════════════════════════════════════
export const AITradingConfigModel: Model<AITradingConfig> =
    (models?.AITradingConfig as Model<AITradingConfig>) || model<AITradingConfig>('AITradingConfig', AIConfigSchema);

export const PaperAccount: Model<PaperTradingAccount> =
    (models?.PaperAccount as Model<PaperTradingAccount>) || model<PaperTradingAccount>('PaperAccount', AccountSchema);

export const PaperTrade: Model<PaperTrade> =
    (models?.PaperTrade as Model<PaperTrade>) || model<PaperTrade>('PaperTrade', TradeSchema);
