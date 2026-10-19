'use client';

import ChangePill from "@/components/ChangePill";
import DataFreshness from "@/components/DataFreshness";
import PriceFlash from "@/components/PriceFlash";
import { useLiveQuotes, type LiveQuote } from "@/hooks/useLiveQuotes";
import { formatPrice } from "@/lib/utils";

const StockLivePrice = ({ symbol, initial, currency }: { symbol: string; initial: LiveQuote | null; currency: string }) => {
    const live = useLiveQuotes([symbol]);
    const quote = live[symbol] ?? initial;

    return (
        <div className="flex items-end gap-3">
            <PriceFlash value={quote?.c} className="bento-value px-1 text-[32px]">
                {quote?.c ? formatPrice(quote.c, currency) : '—'}
            </PriceFlash>
            <div className="flex flex-col items-start gap-1 pb-0.5">
                <span className="flex items-center gap-2">
                    <ChangePill value={quote?.dp} />
                    <span className="num text-[12px] text-faint">
                        {quote?.d != null ? `${quote.d > 0 ? '+' : ''}${quote.d.toFixed(2)}` : ''}
                    </span>
                </span>
                <DataFreshness tradeTime={quote?.t} />
            </div>
        </div>
    );
};

export default StockLivePrice;
