import { NextResponse } from "next/server";
import { QUANT_SYMBOL_UNIVERSE } from "@/lib/market/symbols";

export async function GET() {
  const grouped = {
    crypto: QUANT_SYMBOL_UNIVERSE.filter((s) => s.category === "crypto"),
    tech: QUANT_SYMBOL_UNIVERSE.filter((s) => s.category === "tech"),
    etf: QUANT_SYMBOL_UNIVERSE.filter((s) => s.category === "etf"),
    growth: QUANT_SYMBOL_UNIVERSE.filter((s) => s.category === "growth"),
    bluechip: QUANT_SYMBOL_UNIVERSE.filter((s) => s.category === "bluechip"),
  };

  return NextResponse.json({
    ok: true,
    total: QUANT_SYMBOL_UNIVERSE.length,
    symbols: QUANT_SYMBOL_UNIVERSE,
    grouped,
  });
}
