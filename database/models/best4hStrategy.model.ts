import mongoose, { Schema, Document, Model } from "mongoose";
import { IBacktestMetrics } from "./backtestResult.model";

export interface IBest4hStrategy extends Document {
  updatedAt: Date;
  timeframe: string;
  strategyType: string;
  params: Record<string, number>;
  symbols: string[];
  metrics: IBacktestMetrics;
  backtestId: mongoose.Types.ObjectId;
}

const Best4hStrategySchema = new Schema<IBest4hStrategy>(
  {
    updatedAt: { type: Date, default: Date.now },
    timeframe: { type: String, required: true, default: "4h" },
    strategyType: { type: String, required: true },
    params: { type: Schema.Types.Mixed, required: true },
    symbols: { type: [String], required: true },
    metrics: { type: Schema.Types.Mixed, required: true },
    backtestId: { type: Schema.Types.ObjectId, ref: "BacktestResult", required: true },
  },
  { timestamps: true }
);

Best4hStrategySchema.index({ "metrics.sharpe": -1 });
Best4hStrategySchema.index({ updatedAt: -1 });

export const Best4hStrategy: Model<IBest4hStrategy> =
  (mongoose.models?.Best4hStrategy as Model<IBest4hStrategy>) ||
  mongoose.model<IBest4hStrategy>("Best4hStrategy", Best4hStrategySchema);

export default Best4hStrategy;
