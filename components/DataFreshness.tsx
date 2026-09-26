'use client';

import { useEffect, useState } from "react";
import { isRealtime } from "@/lib/market-data";

// Honest label for how old a number is: "Live" in realtime mode, otherwise the time of the last trade.
// The time is formatted after mount, in the viewer's own time zone, so server and browser never disagree.
const DataFreshness = ({ tradeTime }: { tradeTime?: number }) => {
    const [asOf, setAsOf] = useState<string | null>(null);

    useEffect(() => {
        setAsOf(tradeTime
            ? new Date(tradeTime * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
            : null);
    }, [tradeTime]);

    if (isRealtime) {
        return <span className="inline-flex items-center gap-1.5 text-[12px] text-faint"><span className="live-dot" /> Live · 15s</span>;
    }
    return <span className="text-[12px] text-faint">{asOf ? `As of ${asOf}` : 'Delayed'} · refreshed hourly</span>;
};

export default DataFreshness;
