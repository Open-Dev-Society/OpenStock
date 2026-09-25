import { Schema, model, models, type Document, type Model } from 'mongoose';

export interface WatchlistItem extends Document {
    userId: string;
    symbol: string;
    company: string;
    assetClass: 'equity' | 'crypto';
    instrumentId?: string;
    provider?: string;
    providerSymbol?: string;
    quoteCurrency?: string;
    venue?: string;
    addedAt: Date;
}

const WatchlistSchema = new Schema<WatchlistItem>(
    {
        userId: { type: String, required: true, index: true },
        symbol: { type: String, required: true, uppercase: true, trim: true },
        company: { type: String, required: true, trim: true },
        assetClass: { type: String, enum: ['equity', 'crypto'], default: 'equity' },
        instrumentId: { type: String, trim: true },
        provider: { type: String, trim: true },
        providerSymbol: { type: String, trim: true },
        quoteCurrency: { type: String, uppercase: true, trim: true },
        venue: { type: String, trim: true },
        addedAt: { type: Date, default: Date.now },
    },
    { timestamps: false }
);

// Prevent duplicate symbols per user
WatchlistSchema.index({ userId: 1, symbol: 1 }, { unique: true });
WatchlistSchema.index({ userId: 1, instrumentId: 1 }, { unique: true, sparse: true });

export const Watchlist: Model<WatchlistItem> =
    (models?.Watchlist as Model<WatchlistItem>) || model<WatchlistItem>('Watchlist', WatchlistSchema);
