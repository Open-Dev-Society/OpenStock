import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBacktestMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpe: number;
  maxDrawdown: number;
  winRate: number;
  tradesCount: number;
  barsCount: number;
}

export interface IBacktestResult extends Document {
  createdAt: Date;
  timeframe: string;
  strategyType: string;
  params: Record<string, number>;
  symbols: string[];
  from: Date;
  to: Date;
  metrics?: IBacktestMetrics;
  perSymbolMetrics?: Array<{
    symbol: string;
    metrics: IBacktestMetrics;
  }>;
  status: "running" | "completed" | "failed";
  error?: string;
}

const MetricsSchema = new Schema<IBacktestMetrics>(
  {
    totalReturn: { type: Number, required: true },
    annualizedReturn: { type: Number, default: 0 },
    sharpe: { type: Number, required: true },
    maxDrawdown: { type: Number, required: true },
    winRate: { type: Number, default: 0 },
    tradesCount: { type: Number, default: 0 },
    barsCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const BacktestResultSchema = new Schema<IBacktestResult>(
  {
    createdAt: { type: Date, default: Date.now },
    timeframe: { type: String, required: true, default: "4h" },
    strategyType: { type: String, required: true },
    params: { type: Schema.Types.Mixed, required: true },
    symbols: { type: [String], required: true },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    metrics: { type: MetricsSchema },
    perSymbolMetrics: [
      {
        symbol: { type: String, required: true },
        metrics: { type: MetricsSchema, required: true },
      },
    ],
    status: {
      type: String,
      enum: ["running", "completed", "failed"],
      default: "running",
      required: true,
    },
    error: { type: String },
  },
  { timestamps: true }
);

BacktestResultSchema.index({ strategyType: 1, timeframe: 1 });
BacktestResultSchema.index({ createdAt: -1 });

export const BacktestResult: Model<IBacktestResult> =
  (mongoose.models?.BacktestResult as Model<IBacktestResult>) ||
  mongoose.model<IBacktestResult>("BacktestResult", BacktestResultSchema);

export default BacktestResult;
