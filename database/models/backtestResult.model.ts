import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBacktestMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  profitFactor: number;
  maxDrawdown: number;
  winRate: number;
  exposure: number;
  tradesCount: number;
  barsCount: number;
}

export interface IBacktestTrade {
  id: string;
  symbol: string;
  type: "long" | "short";
  entryTime: Date;
  entryPrice: number;
  exitTime: Date;
  exitPrice: number;
  pnl: number;
  returnPct: number;
  balance: number;
  durationBars: number;
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
  trades?: IBacktestTrade[];
  status: "running" | "completed" | "failed";
  error?: string;
}

const TradeSchema = new Schema<IBacktestTrade>(
  {
    id: { type: String, required: true },
    symbol: { type: String, required: true },
    type: { type: String, enum: ["long", "short"], required: true },
    entryTime: { type: Date, required: true },
    entryPrice: { type: Number, required: true },
    exitTime: { type: Date, required: true },
    exitPrice: { type: Number, required: true },
    pnl: { type: Number, required: true },
    returnPct: { type: Number, required: true },
    balance: { type: Number, required: true },
    durationBars: { type: Number, required: true },
  },
  { _id: false }
);

const MetricsSchema = new Schema<IBacktestMetrics>(
  {
    totalReturn: { type: Number, required: true },
    annualizedReturn: { type: Number, default: 0 },
    sharpe: { type: Number, required: true },
    sortino: { type: Number, default: 0 },
    calmar: { type: Number, default: 0 },
    profitFactor: { type: Number, default: 0 },
    maxDrawdown: { type: Number, required: true },
    winRate: { type: Number, default: 0 },
    exposure: { type: Number, default: 0 },
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
    trades: [TradeSchema],
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
