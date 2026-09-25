import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/database/mongoose";
import BacktestResult from "@/database/models/backtestResult.model";
import {
  exportStrategyCode,
  getSupportedStrategies,
  normalizeStrategyType,
  ExportPlatform,
  ExportResultItem,
  StrategyExportBundle,
} from "@/lib/strategy/codeExport";

const VALID_PLATFORMS: ExportPlatform[] = ["pine", "vectorbt", "nautilus", "qlib", "all"];

/**
 * Helper to determine if an exported result is a single platform item.
 */
function isSingleExport(
  result: StrategyExportBundle | ExportResultItem
): result is ExportResultItem {
  return "code" in result && "filename" in result;
}

/**
 * GET /api/strategy/export
 * Query params:
 *   - backtestId: string (MongoDB ID of an existing backtest)
 *   - type: string (e.g. "supertrend", "fair_value_gap", "ema_crossover", ...)
 *   - symbol: string (e.g. "AAPL")
 *   - symbols: comma-separated string (e.g. "AAPL,MSFT")
 *   - timeframe: string (e.g. "4h", "1d")
 *   - platform: "pine" | "vectorbt" | "nautilus" | "qlib" | "all"
 *   - format: "json" | "raw" (raw returns text/attachment for downloading)
 *   - params: JSON-encoded string (e.g. '{"atrPeriod":14,"multiplier":3}')
 *
 * If no query params provided, returns documentation of supported strategies and platforms.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const backtestId = searchParams.get("backtestId") || searchParams.get("id");
    const rawType = searchParams.get("type");

    // If neither backtestId nor type is provided, return API info and catalog
    if (!backtestId && !rawType) {
      return NextResponse.json(
        {
          ok: true,
          data: {
            service: "OpenStock Multi-Platform Strategy Code Export API",
            supportedPlatforms: VALID_PLATFORMS,
            supportedStrategies: getSupportedStrategies(),
            usage: {
              get: "/api/strategy/export?type=supertrend&platform=pine&symbol=AAPL&timeframe=4h",
              getByBacktest: "/api/strategy/export?backtestId=64a...&platform=vectorbt",
              post: "POST JSON to /api/strategy/export with { type, params, symbol, platform }",
            },
          },
        },
        { status: 200 }
      );
    }

    const platformParam = (searchParams.get("platform") || "all").toLowerCase() as ExportPlatform;
    const platform: ExportPlatform = VALID_PLATFORMS.includes(platformParam)
      ? platformParam
      : "all";

    const format = (searchParams.get("format") || "json").toLowerCase();

    let strategyType = rawType || "";
    let params: Record<string, number> = {};
    let symbols: string[] = [];
    let timeframe = searchParams.get("timeframe") || "4h";

    // Parse custom params query if present
    const rawParams = searchParams.get("params");
    if (rawParams) {
      try {
        params = JSON.parse(rawParams);
      } catch {
        return NextResponse.json(
          { ok: false, error: "Invalid JSON format in 'params' query parameter" },
          { status: 400 }
        );
      }
    }

    // Parse symbol(s)
    const sym = searchParams.get("symbol");
    const syms = searchParams.get("symbols");
    if (syms) {
      symbols = syms.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    } else if (sym) {
      symbols = [sym.trim().toUpperCase()];
    }

    // Load from DB if backtestId is provided
    if (backtestId) {
      if (!mongoose.Types.ObjectId.isValid(backtestId)) {
        return NextResponse.json(
          { ok: false, error: "Invalid backtest ID format" },
          { status: 400 }
        );
      }

      await connectToDatabase();
      const backtest = await BacktestResult.findById(backtestId).lean();
      if (!backtest) {
        return NextResponse.json(
          { ok: false, error: "Backtest not found" },
          { status: 404 }
        );
      }

      strategyType = strategyType || backtest.strategyType;
      params = Object.keys(params).length > 0 ? params : (backtest.params as Record<string, number>) || {};
      symbols = symbols.length > 0 ? symbols : backtest.symbols || ["AAPL"];
      timeframe = searchParams.get("timeframe") || backtest.timeframe || "4h";
    }

    if (!strategyType) {
      return NextResponse.json(
        { ok: false, error: "Strategy type is required" },
        { status: 400 }
      );
    }

    let normalizedType;
    try {
      normalizedType = normalizeStrategyType(strategyType);
    } catch (err: any) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: 400 }
      );
    }

    const exportResult = exportStrategyCode(
      {
        type: normalizedType,
        params,
        symbols: symbols.length > 0 ? symbols : ["AAPL"],
        symbol: symbols[0] || "AAPL",
        timeframe,
      },
      platform
    );

    // If format=raw and single platform was requested, return text file attachment
    if (format === "raw") {
      if (isSingleExport(exportResult)) {
        return new NextResponse(exportResult.code, {
          status: 200,
          headers: {
            "Content-Type": `${exportResult.mimeType}; charset=utf-8`,
            "Content-Disposition": `attachment; filename="${exportResult.filename}"`,
          },
        });
      } else {
        // If all platforms were requested with format=raw, default to Pine Script
        const pine = exportResult.exports.pine;
        return new NextResponse(pine.code, {
          status: 200,
          headers: {
            "Content-Type": `${pine.mimeType}; charset=utf-8`,
            "Content-Disposition": `attachment; filename="${pine.filename}"`,
          },
        });
      }
    }

    return NextResponse.json({ ok: true, data: exportResult }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/strategy/export error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/strategy/export
 * Body payload:
 *   - backtestId?: string
 *   - type?: string
 *   - params?: Record<string, number>
 *   - symbol?: string
 *   - symbols?: string[]
 *   - timeframe?: string
 *   - platform?: "pine" | "vectorbt" | "nautilus" | "qlib" | "all"
 *   - format?: "json" | "raw"
 *   - initialCapital?: number
 */
export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const { backtestId } = body;
    let strategyType = body.type;
    let params: Record<string, number> = body.params && typeof body.params === "object" ? body.params : {};
    let symbols: string[] = Array.isArray(body.symbols) ? body.symbols : [];
    let timeframe = typeof body.timeframe === "string" ? body.timeframe.trim() : "4h";

    if (body.symbol && typeof body.symbol === "string" && symbols.length === 0) {
      symbols = [body.symbol.trim().toUpperCase()];
    }

    // Load from DB if backtestId provided
    if (backtestId) {
      if (!mongoose.Types.ObjectId.isValid(backtestId)) {
        return NextResponse.json(
          { ok: false, error: "Invalid backtest ID format" },
          { status: 400 }
        );
      }

      await connectToDatabase();
      const backtest = await BacktestResult.findById(backtestId).lean();
      if (!backtest) {
        return NextResponse.json(
          { ok: false, error: "Backtest not found" },
          { status: 404 }
        );
      }

      strategyType = strategyType || backtest.strategyType;
      params = Object.keys(params).length > 0 ? params : (backtest.params as Record<string, number>) || {};
      symbols = symbols.length > 0 ? symbols : backtest.symbols || ["AAPL"];
      timeframe = body.timeframe || backtest.timeframe || "4h";
    }

    if (!strategyType) {
      return NextResponse.json(
        { ok: false, error: "Missing required field: 'type' or valid 'backtestId'" },
        { status: 400 }
      );
    }

    let normalizedType;
    try {
      normalizedType = normalizeStrategyType(strategyType);
    } catch (err: any) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: 400 }
      );
    }

    const platformParam = (body.platform || "all").toLowerCase() as ExportPlatform;
    const platform: ExportPlatform = VALID_PLATFORMS.includes(platformParam)
      ? platformParam
      : "all";

    const cleanSymbols = symbols
      .filter((s) => typeof s === "string" && s.trim().length > 0)
      .map((s) => s.trim().toUpperCase());

    const finalSymbols = cleanSymbols.length > 0 ? cleanSymbols : ["AAPL"];

    const exportResult = exportStrategyCode(
      {
        type: normalizedType,
        params,
        symbols: finalSymbols,
        symbol: finalSymbols[0],
        timeframe,
        initialCapital: typeof body.initialCapital === "number" ? body.initialCapital : 100000,
        stopLossPct: typeof body.stopLossPct === "number" ? body.stopLossPct : undefined,
        takeProfitPct: typeof body.takeProfitPct === "number" ? body.takeProfitPct : undefined,
      },
      platform
    );

    if (body.format === "raw") {
      if (isSingleExport(exportResult)) {
        return new NextResponse(exportResult.code, {
          status: 200,
          headers: {
            "Content-Type": `${exportResult.mimeType}; charset=utf-8`,
            "Content-Disposition": `attachment; filename="${exportResult.filename}"`,
          },
        });
      } else {
        const pine = exportResult.exports.pine;
        return new NextResponse(pine.code, {
          status: 200,
          headers: {
            "Content-Type": `${pine.mimeType}; charset=utf-8`,
            "Content-Disposition": `attachment; filename="${pine.filename}"`,
          },
        });
      }
    }

    return NextResponse.json({ ok: true, data: exportResult }, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/strategy/export error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
