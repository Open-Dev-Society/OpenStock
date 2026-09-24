import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { connectToDatabase } from "@/database/mongoose";
import BacktestResult from "@/database/models/backtestResult.model";
import { StrategyConfig } from "@/lib/strategy/backtest4h";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.type || !body.symbols || !Array.isArray(body.symbols) || body.symbols.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: type, symbols" },
        { status: 400 }
      );
    }

    const config: StrategyConfig = {
      type: body.type || "ema_crossover",
      params: body.params || { fastPeriod: 12, slowPeriod: 26 },
      symbols: body.symbols.map((s: string) => s.toUpperCase()),
      from: body.from ? new Date(body.from) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      to: body.to ? new Date(body.to) : new Date(),
    };

    await connectToDatabase();

    const doc = await BacktestResult.create({
      timeframe: "4h",
      strategyType: config.type,
      params: config.params,
      symbols: config.symbols,
      from: config.from,
      to: config.to,
      status: "running",
    });

    const docId = (doc._id as any).toString();

    await inngest.send({
      name: "strategy/backtest.requested",
      data: {
        backtestId: docId,
        type: config.type,
        params: config.params,
        symbols: config.symbols,
        from: (config.from as Date).toISOString(),
        to: (config.to as Date).toISOString(),
      },
    });

    return NextResponse.json(
      { ok: true, backtestId: docId },
      { status: 202 }
    );
  } catch (error: any) {
    console.error("POST /api/strategy/backtest error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
