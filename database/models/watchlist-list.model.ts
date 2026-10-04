import { Schema, model, models, type Document, type Model } from 'mongoose';

export interface NamedListSymbol {
    symbol: string;
    company: string;
    addedAt: Date;
}

export interface WatchlistList extends Document {
    userId: string;
    name: string;
    symbols: NamedListSymbol[];
    createdAt: Date;
}

// Named watchlists (e.g. "mishal watch list"), separate from the default starred list.
const WatchlistListSchema = new Schema<WatchlistList>(
    {
        userId: { type: String, required: true, index: true },
        name: { type: String, required: true, trim: true, maxlength: 60 },
        symbols: [
            {
                symbol: { type: String, required: true, uppercase: true, trim: true },
                company: { type: String, required: true, trim: true },
                addedAt: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: { createdAt: true, updatedAt: false } },
);

WatchlistListSchema.index({ userId: 1, name: 1 }, { unique: true });

export const WatchlistList: Model<WatchlistList> =
    (models?.WatchlistList as Model<WatchlistList>) || model<WatchlistList>('WatchlistList', WatchlistListSchema);
