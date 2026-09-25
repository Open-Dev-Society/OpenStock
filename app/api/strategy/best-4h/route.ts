import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/database/mongoose";
import Best4hStrategy from "@/database/models/best4hStrategy.model";
import BacktestResult from "@/database/models/backtestResult.model";
import { getBestStrategyForSymbolAndTimeframe } from "@/lib/strategy/bestStrategy";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol") || "";
    const timeframe = searchParams.get("timeframe") || "4h";

    // 1. If symbol is provided, calculate the optimal strategy and configuration for that asset & timeframe
    if (symbol) {
      const optimal = getBestStrategyForSymbolAndTimeframe(symbol, timeframe);

      // Attempt to find any completed historical backtest in MongoDB
      let dbTopRun = null;
      try {
        await connectToDatabase();
        dbTopRun = await BacktestResult.findOne({
          symbols: { $in: [symbol, symbol.replace("BINANCE:", "")] },
          timeframe,
          status: "completed",
        })
          .sort({ "metrics.sharpe": -1 })
          .lean();
      } catch (_) {}

      return NextResponse.json(
        {
          ok: true,
          data: {
            optimal,
            dbTopRun,
          },
        },
        { status: 200 }
      );
    }

    // 2. Default backward-compatible global 4h overview
    await connectToDatabase();

    const snapshot = await Best4hStrategy.findOne({ timeframe: "4h" })
      .populate("backtestId")
      .lean();

    const topRuns = await BacktestResult.find({
      timeframe: "4h",
      status: "completed",
    })
      .sort({ "metrics.sharpe": -1 })
      .limit(5)
      .lean();

    return NextResponse.json(
      {
        ok: true,
        data: {
          best: snapshot,
          topRanked: topRuns,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("GET /api/strategy/best-4h error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
