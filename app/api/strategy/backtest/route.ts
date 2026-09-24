import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { connectToDatabase } from "@/database/mongoose";
import BacktestResult from "@/database/models/backtestResult.model";
import { StrategyConfig, runBacktest } from "@/lib/strategy/backtest4h";

export async function GET(_req: NextRequest) {
  try {
    await connectToDatabase();
    const list = await BacktestResult.find()
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    return NextResponse.json({ ok: true, data: list }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/strategy/backtest error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let docId: string | null = null;
  try {
    const body = await req.json();

    const allowedTypes = ["ema_crossover", "rsi_oversold", "breakout", "liquidity_sweep"];
    if (!body.type || !allowedTypes.includes(body.type)) {
      return NextResponse.json(
        { ok: false, error: `Invalid or missing type. Must be one of: ${allowedTypes.join(", ")}` },
        { status: 400 }
      );
    }

    if (!body.symbols || !Array.isArray(body.symbols) || body.symbols.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Missing or empty symbols array" },
        { status: 400 }
      );
    }

    if (body.symbols.length > 20) {
      return NextResponse.json(
        { ok: false, error: "Symbols array exceeds maximum limit of 20 symbols" },
        { status: 400 }
      );
    }

    const cleanSymbols = body.symbols
      .filter((s: unknown) => typeof s === "string" && s.trim().length > 0)
      .map((s: string) => s.trim().toUpperCase());

    if (cleanSymbols.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No valid symbol strings provided" },
        { status: 400 }
      );
    }

    const fromDate = body.from ? new Date(body.from) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const toDate = body.to ? new Date(body.to) : new Date();

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json(
        { ok: false, error: "Invalid date format for 'from' or 'to'" },
        { status: 400 }
      );
    }

    if (fromDate.getTime() >= toDate.getTime()) {
      return NextResponse.json(
        { ok: false, error: "'from' date must be strictly before 'to' date" },
        { status: 400 }
      );
    }

    const config: StrategyConfig = {
      type: body.type,
      params: body.params && typeof body.params === "object" ? body.params : {},
      symbols: cleanSymbols,
      from: fromDate,
      to: toDate,
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

    docId = (doc._id as any).toString();

    // If runDirect is specified, execute synchronously for immediate UI feedback
    if (body.runDirect === true) {
      try {
        const result = await runBacktest(config);
        const updatedDoc = await BacktestResult.findByIdAndUpdate(
          docId,
          {
            metrics: result.metrics,
            perSymbolMetrics: result.perSymbolMetrics,
            trades: result.trades,
            status: "completed",
          },
          { new: true }
        ).lean();

        return NextResponse.json(
          { ok: true, backtestId: docId, data: updatedDoc },
          { status: 200 }
        );
      } catch (runErr: any) {
        await BacktestResult.findByIdAndUpdate(docId, {
          status: "failed",
          error: runErr?.message || "Execution error",
        });
        throw runErr;
      }
    }

    try {
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
    } catch (sendErr: any) {
      console.error("inngest.send failed, updating backtest record to failed:", sendErr);
      await BacktestResult.findByIdAndUpdate(docId, {
        status: "failed",
        error: `Job dispatch failed: ${sendErr?.message || "Inngest unavailable"}`,
      });
      throw sendErr;
    }

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
