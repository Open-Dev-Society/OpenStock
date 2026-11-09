import { Schema, model, models, type Document, type Model } from 'mongoose';
import { MAX_LIST_NAME } from '@/lib/watchlist-lists';

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

// Named watchlists, e.g. "Banks". Separate from the starred watchlist in watchlist.model.ts: these
// are extra groupings the user creates, so nothing here changes how starring works.
const WatchlistListSchema = new Schema<WatchlistList>(
    {
        userId: { type: String, required: true, index: true },
        name: { type: String, required: true, trim: true, maxlength: MAX_LIST_NAME },
        symbols: [
            {
                symbol: { type: String, required: true, uppercase: true, trim: true },
                company: { type: String, required: true, trim: true },
                addedAt: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

// One name per user, so a list never has to be disambiguated in the interface.
WatchlistListSchema.index({ userId: 1, name: 1 }, { unique: true });

export const WatchlistList: Model<WatchlistList> =
    (models?.WatchlistList as Model<WatchlistList>) || model<WatchlistList>('WatchlistList', WatchlistListSchema);
