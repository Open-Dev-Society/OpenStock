import { Schema, model, models, type Document, type Model } from 'mongoose';

/**
 * 自选列表项目接口
 */
export interface WatchlistItem extends Document {
    userId: string; // 用户 ID
    symbol: string; // 股票代码
    company: string; // 公司名称
    addedAt: Date; // 添加时间
}

/**
 * 自选列表数据结构定义
 */
const WatchlistSchema = new Schema<WatchlistItem>(
    {
        userId: { type: String, required: true, index: true },
        symbol: { type: String, required: true, uppercase: true, trim: true },
        company: { type: String, required: true, trim: true },
        addedAt: { type: Date, default: Date.now },
    },
    { timestamps: false }
);

// 为每个用户防止重复的股票代码
WatchlistSchema.index({ userId: 1, symbol: 1 }, { unique: true });

export const Watchlist: Model<WatchlistItem> =
    (models?.Watchlist as Model<WatchlistItem>) || model<WatchlistItem>('Watchlist', WatchlistSchema);