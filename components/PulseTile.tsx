'use client';

import Link from "next/link";
import { LineChart } from "lucide-react";
import { useTranslations } from "next-intl";
import ChangePill from "@/components/ChangePill";
import PriceFlash from "@/components/PriceFlash";
import { useLiveQuotes, type LiveQuote } from "@/hooks/useLiveQuotes";

const formatAmount = (value: number) =>
    value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: value < 1 ? 4 : 2 });

type PulseTileProps = { symbol: string; label: string; initial: LiveQuote | null };
type PulseTileLabels = { vsPrevClose: (change: string) => string; unavailable: string };

// English for the marketing preview, which renders outside NextIntlClientProvider
const ENGLISH: PulseTileLabels = { vsPrevClose: (change) => `${change} vs prev close`, unavailable: 'Quote unavailable' };

// A pulse tile priced from our own quote cache. In realtime mode it refreshes on screen,
// so the "Live · 15s" label is true; in cached mode it shows the server-rendered quote.
export default function PulseTile({ symbol, label, initial, labels = ENGLISH }: PulseTileProps & { labels?: PulseTileLabels }) {
    const live = useLiveQuotes([symbol]);
    const quote = live[symbol] ?? initial;
    const isCrypto = symbol.startsWith('BINANCE:');

    return (
        <Link href={`/stocks/${encodeURIComponent(symbol)}`} className="bento-tile transition-colors hover:bg-hover/60">
            <div className="bento-head">
                <span className="bento-ico"><LineChart /></span>
                <span className="truncate">{label}</span>
                <span className="mono ms-auto text-xs text-faint">{symbol.replace('BINANCE:', '')}</span>
            </div>
            <PriceFlash value={quote?.c} className="bento-value self-start">
                {quote?.c ? (
                    isCrypto ? <>{formatAmount(quote.c)}<small> USDT</small></> : <><small>$</small>{formatAmount(quote.c)}</>
                ) : '—'}
            </PriceFlash>
            <div className="bento-foot">
                {quote?.c ? (
                    <>
                        <ChangePill value={quote.dp} />
                        <span className="num truncate">{labels.vsPrevClose(`${(quote.d ?? 0) > 0 ? '+' : ''}${formatAmount(quote.d ?? 0)}`)}</span>
                    </>
                ) : (
                    <span>{labels.unavailable}</span>
                )}
            </div>
        </Link>
    );
}

// The same tile in the viewer's language, for pages inside NextIntlClientProvider
export function LocalizedPulseTile(props: PulseTileProps) {
    const t = useTranslations('PulseTile');
    return <PulseTile {...props} labels={{ vsPrevClose: (change) => t('vsPrevClose', { change }), unavailable: t('unavailable') }} />;
}
