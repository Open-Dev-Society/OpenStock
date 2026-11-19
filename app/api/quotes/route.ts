import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/better-auth/auth";
import { getLiveQuotes } from "@/lib/actions/finnhub.actions";
import { isRateLimited } from "@/lib/rate-limit";
import { MAX_LIST_SYMBOLS } from "@/lib/watchlist-lists";

// A full watchlist in one request: quotes come from the shared cache, so one call beats two.
const MAX_SYMBOLS = MAX_LIST_SYMBOLS;
const SYMBOL_PATTERN = /^[A-Z0-9.:\-]{1,20}$/;

// Polled by on-screen prices. Signed-in only and capped, so nobody can burn the shared Finnhub quota.
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const symbols = [...new Set(
        (req.nextUrl.searchParams.get("symbols") ?? "")
            .split(",")
            .map((s) => s.trim().toUpperCase())
            .filter((s) => SYMBOL_PATTERN.test(s)),
    )].slice(0, MAX_SYMBOLS);

    // Counted per symbol: unseen tickers each cost a Finnhub call. A 50-symbol watchlist polled every 15 s uses
    // about 200 a minute; the cap stops one free account from draining the shared key pool.
    if (await isRateLimited(`quotes:user:${session.user.id}`, 300, 60, symbols.length)) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    return NextResponse.json(await getLiveQuotes(symbols), {
        headers: { "Cache-Control": "private, max-age=5" },
    });
}
