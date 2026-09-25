import { NextRequest, NextResponse } from "next/server";
import { generateVibeTradingPlan, VibeTraderRequest } from "@/lib/strategy/vibeTrader";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as VibeTraderRequest;
    if (!body || !body.prompt || !body.symbol) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: 'prompt' and 'symbol' are required." },
        { status: 400 }
      );
    }

    const plan = await generateVibeTradingPlan(body);

    return NextResponse.json(plan, { status: 200 });
  } catch (err: any) {
    console.error("POST /api/strategy/vibe error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to generate Vibe Trading plan." },
      { status: 500 }
    );
  }
}
