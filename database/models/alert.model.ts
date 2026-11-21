import { Schema, model, models, type Document, type Model } from 'mongoose';
import { modelOn, type DbHandle } from '@/database/request-connection';
import { SMA_PERIODS } from '@/lib/sma';

export interface IAlert extends Document {
    userId: string;
    symbol: string;
    targetPrice: number;
    condition: 'ABOVE' | 'BELOW';
    // Absent on older alerts, which are all fixed-price ones. For an SMA alert targetPrice holds the average as
    // last computed (for the list and the email) and lastSide is where the price was at the last check.
    target?: 'PRICE' | 'SMA';
    smaPeriod?: number;
    lastSide?: 'ABOVE' | 'BELOW';
    active: boolean;
    triggered: boolean;
    expiresAt: Date;
    createdAt: Date;
}

const AlertSchema = new Schema<IAlert>(
    {
        userId: { type: String, required: true, index: true },
        symbol: { type: String, required: true, uppercase: true, trim: true },
        targetPrice: { type: Number, required: true },
        condition: { type: String, enum: ['ABOVE', 'BELOW'], required: true },
        target: { type: String, enum: ['PRICE', 'SMA'] },
        smaPeriod: { type: Number, enum: [...SMA_PERIODS] },
        lastSide: { type: String, enum: ['ABOVE', 'BELOW'] },
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

const compiledAlert: Model<IAlert> = (models?.Alert as Model<IAlert>) || model<IAlert>('Alert', AlertSchema);

export const Alert: Model<IAlert> = compiledAlert;

export function alertModel(db: DbHandle): Model<IAlert> {
    return modelOn(db, 'Alert', AlertSchema, compiledAlert);
}
