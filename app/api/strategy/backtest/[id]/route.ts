import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/database/mongoose";
import BacktestResult from "@/database/models/backtestResult.model";
import mongoose from "mongoose";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid backtest ID format" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const result = await BacktestResult.findById(id).lean();

    if (!result) {
      return NextResponse.json(
        { ok: false, error: "Backtest not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: result }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/strategy/backtest/[id] error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
