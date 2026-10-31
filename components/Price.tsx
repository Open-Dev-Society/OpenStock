import RiyalSymbol from '@/components/RiyalSymbol';
import { arDigits, tx, type Lang } from '@/lib/i18n';
import { cn, formatPrice } from '@/lib/utils';

// Amount with its currency. The riyal has an official sign, so Saudi prices print the sign instead
// of the ISO code; every other currency keeps the formatter's own output.
export default function Price({
    value,
    currency = 'USD',
    lang = 'en',
    className,
}: {
    value: number;
    currency?: string;
    lang?: Lang;
    className?: string;
}) {
    if (currency !== 'SAR') {
        return <>{formatPrice(value, currency, lang)}</>;
    }

    const amount = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <span className={cn('inline-flex items-baseline gap-1', className)}>
            {/* The sign is a glyph, so its accessible name has to carry the currency. */}
            <RiyalSymbol label={tx(lang, 'currency.sar')} className="h-[0.8em] w-[0.716em] shrink-0 translate-y-[0.06em]" />
            <bdi>{arDigits(amount, lang)}</bdi>
        </span>
    );
}
