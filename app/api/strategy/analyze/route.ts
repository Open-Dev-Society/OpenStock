import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/database/mongoose";
import BacktestResult from "@/database/models/backtestResult.model";
import { callAIProviderWithFallback } from "@/lib/ai-provider";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let prompt = body.prompt || "";
    const backtestId = body.backtestId;
    const symbol = body.symbol;

    if (!prompt && !backtestId && !symbol) {
      return NextResponse.json(
        { ok: false, error: "Provide at least one of: 'prompt', 'backtestId', or 'symbol'" },
        { status: 400 }
      );
    }

    let context = "";

    if (backtestId && mongoose.Types.ObjectId.isValid(backtestId)) {
      await connectToDatabase();
      const backtest = await BacktestResult.findById(backtestId).lean();
      if (backtest) {
        context += `\nBacktest Data:\nStrategy: ${backtest.strategyType}\nParameters: ${JSON.stringify(
          backtest.params
        )}\nSymbols: ${backtest.symbols.join(", ")}\nMetrics: ${JSON.stringify(
          backtest.metrics
        )}\n`;
      }
    }

    if (symbol) {
      context += `\nTarget Symbol: ${symbol.toUpperCase()}\n`;
    }

    const fullPrompt = `${prompt || "Analyze the following backtest performance and recommend improvements."}\n${context}`.trim();

    const aiResponse = await callAIProviderWithFallback(fullPrompt);

    return NextResponse.json(
      {
        ok: true,
        provider: process.env.AI_PROVIDER || "9router",
        model: process.env.NINEROUTER_MODEL || process.env.GEMINI_MODEL || "gemini",
        analysis: aiResponse,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("POST /api/strategy/analyze error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
