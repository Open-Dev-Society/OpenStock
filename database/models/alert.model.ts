import { Schema, model, models, type Document, type Model } from 'mongoose';

export interface IAlert extends Document {
    userId: string;
    symbol: string;
    assetClass: 'equity' | 'crypto';
    instrumentId?: string;
    provider?: string;
    providerSymbol?: string;
    currency?: string;
    targetPrice: number;
    condition: 'ABOVE' | 'BELOW';
    active: boolean;
    triggered: boolean;
    expiresAt: Date;
    createdAt: Date;
}

const AlertSchema = new Schema<IAlert>(
    {
        userId: { type: String, required: true, index: true },
        symbol: { type: String, required: true, uppercase: true, trim: true },
        assetClass: { type: String, enum: ['equity', 'crypto'], default: 'equity' },
        instrumentId: { type: String, trim: true },
        provider: { type: String, trim: true },
        providerSymbol: { type: String, trim: true },
        currency: { type: String, uppercase: true, trim: true },
        targetPrice: { type: Number, required: true },
        condition: { type: String, enum: ['ABOVE', 'BELOW'], required: true },
        active: { type: Boolean, default: true },
        triggered: { type: Boolean, default: false },
        expiresAt: {
            type: Date,
            default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        },
        createdAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export const Alert: Model<IAlert> = (models?.Alert as Model<IAlert>) || model<IAlert>('Alert', AlertSchema);
