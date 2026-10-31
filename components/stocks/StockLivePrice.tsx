'use client';

import ChangePill from "@/components/ChangePill";
import DataFreshness from "@/components/DataFreshness";
import PriceFlash from "@/components/PriceFlash";
import { useLiveQuotes, type LiveQuote } from "@/hooks/useLiveQuotes";
import { formatPrice } from "@/lib/utils";
import type { Lang } from "@/lib/i18n";

const StockLivePrice = ({ symbol, initial, currency, lang = 'en' }: { symbol: string; initial: LiveQuote | null; currency: string; lang?: Lang }) => {
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
                        {quote?.d != null ? <bdi>{`${quote.d > 0 ? '+' : ''}${quote.d.toFixed(2)}`}</bdi> : null}
                    </span>
                </span>
                <DataFreshness tradeTime={quote?.t} lang={lang} />
            </div>
        </div>
    );
};

export default StockLivePrice;
