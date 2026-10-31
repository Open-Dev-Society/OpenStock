'use client';

import { useEffect, useState } from "react";
import { isRealtime } from "@/lib/market-data";
import { tx, type Lang } from "@/lib/i18n";

// Honest label for how old a number is: "Live" in realtime mode, otherwise the time of the last trade.
// The time is formatted after mount, in the viewer's own time zone, so server and browser never disagree.
const DataFreshness = ({ tradeTime, lang = 'en' }: { tradeTime?: number; lang?: Lang }) => {
    const [asOf, setAsOf] = useState<string | null>(null);

    useEffect(() => {
        setAsOf(tradeTime
            ? new Date(tradeTime * 1000).toLocaleString(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
            : null);
    }, [tradeTime, lang]);

    if (isRealtime) {
        return <span className="inline-flex items-center gap-1.5 text-[12px] text-faint"><span className="live-dot" /> {tx(lang, 'fresh.live')}</span>;
    }
    return (
        <span className="text-[12px] text-faint">
            {asOf ? tx(lang, 'fresh.asOf').replace('{t}', asOf) : tx(lang, 'fresh.delayed')} · {tx(lang, 'fresh.hourly')}
        </span>
    );
};

export default DataFreshness;
