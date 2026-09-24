import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/database/mongoose";
import Best4hStrategy from "@/database/models/best4hStrategy.model";
import BacktestResult from "@/database/models/backtestResult.model";

export async function GET(_req: NextRequest) {
  try {
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
