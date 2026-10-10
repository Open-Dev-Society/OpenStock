import { NextResponse } from "next/server";
import { getSession } from "@/lib/better-auth/auth";
import { getNseFnoEquityInstruments } from "@/lib/upstox/instruments";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function GET() {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const instruments = await getNseFnoEquityInstruments();
        return NextResponse.json({
            status: "ok",
            source: "Upstox official NSE instrument master",
            count: instruments.length,
            instruments: instruments.map(({symbol,name}) => ({symbol,name})),
        }, { headers: { "Cache-Control": "private, max-age=300" } });
    } catch (error) {
        console.error("Failed to load NSE F&O universe", error);
        return NextResponse.json({ status:"error", error:"Unable to load current NSE F&O universe from Upstox." }, { status:502 });
    }
}
