import Link from "next/link";
import { Activity, Clock3, Radio, ShieldCheck } from "lucide-react";
import Panel from "@/components/Panel";
import { isUpstoxConfigured } from "@/lib/upstox/config";
import ScannerConsole from "@/components/scanner/ScannerConsole";

export const dynamic = "force-dynamic";

const checks = [
    "NSE F&O equity universe (instrument-master filter)",
    "1m / 3m / 5m completed-candle evaluation",
    "First PDH / PDL crossing only; duplicate signals suppressed",
    "Relative volume threshold configurable from 1× to 10×",
    "Signals only from 09:15 through 10:00 IST",
];

export default function IntradayScannerPage() {
    const configured = isUpstoxConfigured();
    return (
        <>
            <header className="page-head">
                <div>
                    <h1 className="page-title">NSE Intraday Scanner</h1>
                    <p className="page-sub">Personal F&O setup scanner · Upstox market data · IST</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs font-semibold">
                    <span className={configured ? "size-2 rounded-full bg-up" : "size-2 rounded-full bg-warn"} />
                    {configured ? "API configured" : "API setup required"}
                </span>
            </header>

            <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-line bg-card p-4">
                    <div className="flex items-center gap-2 text-muted-foreground"><Activity className="size-4"/> Universe</div>
                    <p className="mt-3 text-xl font-semibold">NSE F&O</p>
                    <p className="mt-1 text-sm text-faint">Equity futures stocks only</p>
                </div>
                <div className="rounded-xl border border-line bg-card p-4">
                    <div className="flex items-center gap-2 text-muted-foreground"><Clock3 className="size-4"/> Timeframes</div>
                    <p className="mt-3 text-xl font-semibold">1m · 3m · 5m</p>
                    <p className="mt-1 text-sm text-faint">Default: 3-minute candles</p>
                </div>
                <div className="rounded-xl border border-line bg-card p-4">
                    <div className="flex items-center gap-2 text-muted-foreground"><Radio className="size-4"/> Signal window</div>
                    <p className="mt-3 text-xl font-semibold">09:15–10:00</p>
                    <p className="mt-1 text-sm text-faint">Indian Standard Time</p>
                </div>
            </div>

            <Panel title="Scanner controls" sub="On-demand setup evaluation using Upstox candle APIs">
                <div className="flex flex-col gap-4 p-1">
                    <ScannerConsole />
                    <div className={configured ? "rounded-xl border border-up/30 bg-up-soft p-4" : "rounded-xl border border-line bg-hover p-4"}>
                        <div className="flex items-center gap-2 font-semibold">
                            <ShieldCheck className="size-5"/>
                            {configured ? "Upstox token found" : "Connect Upstox"}
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {configured
                                ? "The access token is available server-side. Add the symbol-to-instrument-key map before requesting a scan."
                                : "Set UPSTOX_ACCESS_TOKEN in the deployment's server environment. Never place the token in a NEXT_PUBLIC variable or commit it to Git."}
                        </p>
                    </div>
                    <div>
                        <h3 className="font-semibold">Strategy rules</h3>
                        <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                            {checks.map(item => <li key={item} className="flex gap-2"><span className="text-brand-ink">✓</span><span>{item}</span></li>)}
                        </ul>
                    </div>
                    <div className="rounded-xl border border-line p-4">
                        <p className="text-sm font-semibold">Scanner API</p>
                        <code className="mt-2 block break-all text-xs text-brand-ink">/api/intraday-scanner?timeframe=3&amp;volumeMultiplier=2&amp;symbols=RELIANCE,HDFCBANK</code>
                        <p className="mt-2 text-xs text-faint">Authenticated snapshot endpoint. Persistent live scanning requires a long-running WebSocket worker; the current endpoint does not pretend to be continuously streaming.</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        <p className="font-semibold text-foreground">Next setup steps</p>
                        <ol className="mt-2 list-decimal space-y-1 pl-5">
                            <li>Add server-side Upstox access token.</li>
                            <li>Load the latest Upstox instrument master and filter eligible NSE equity F&O symbols.</li>
                            <li>Run the scanner in paper mode and validate data, timing and repeat-signal behaviour.</li>
                        </ol>
                    </div>
                    <Link href="/api-docs" className="text-sm font-semibold text-brand-ink hover:underline">Open API docs →</Link>
                </div>
            </Panel>
            <p className="text-xs text-faint">Signals are screening outputs, not trade instructions or a guarantee of performance. Verify every setup before placing orders.</p>
        </>
    );
}
