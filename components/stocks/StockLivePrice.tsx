'use client';

import ChangePill from "@/components/ChangePill";
import DataFreshness from "@/components/DataFreshness";
import PriceFlash from "@/components/PriceFlash";
import { useLiveQuotes, type LiveQuote } from "@/hooks/useLiveQuotes";
import type { Lang } from "@/lib/i18n";
import { arDigits } from "@/lib/i18n";
import Price from "@/components/Price";

const StockLivePrice = ({ symbol, initial, currency, lang = 'en' }: { symbol: string; initial: LiveQuote | null; currency: string; lang?: Lang }) => {
    const live = useLiveQuotes([symbol]);
    const quote = live[symbol] ?? initial;

    return (
        <div className="flex items-end gap-3">
            <PriceFlash value={quote?.c} className="bento-value px-1 text-[32px]">
                {quote?.c ? <Price value={quote.c} currency={currency} lang={lang} /> : '—'}
            </PriceFlash>
            <div className="flex flex-col items-start gap-1 pb-0.5">
                <span className="flex items-center gap-2">
                    <ChangePill value={quote?.dp} lang={lang} />
                    <span className="num text-[12px] text-faint">
                        {quote?.d != null ? <bdi>{`${quote.d > 0 ? '+' : ''}${arDigits(quote.d.toFixed(2), lang)}`}</bdi> : null}
                    </span>
                </span>
                <DataFreshness tradeTime={quote?.t} lang={lang} />
            </div>
        </div>
    );
};

export default StockLivePrice;
