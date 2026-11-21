"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createAlert } from "@/lib/actions/alert.actions";
import { SMA_PERIODS, type SmaPeriod } from "@/lib/sma";
import { alertsEnabled } from "@/lib/market-data";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CreateAlertModalProps {
    symbol: string;
    currentPrice?: number | null;
    currency?: string;
    children?: React.ReactNode;
    onAlertCreated?: () => void;
}

const CONDITIONS = [
    { value: 'ABOVE', labelKey: 'risesAbove', smaLabelKey: 'crossesAbove' },
    { value: 'BELOW', labelKey: 'fallsBelow', smaLabelKey: 'crossesBelow' },
] as const;

// A row of mutually exclusive choices (condition, target, period): toggle buttons, so Tab and Enter/Space work
// as announced (a radiogroup would also promise arrow-key navigation)
function Segmented<T extends string | number>({ label, value, options, onChange }: {
    label: string;
    value: T;
    options: readonly { value: T; label: string }[];
    onChange: (value: T) => void;
}) {
    return (
        <div className="grid gap-1 rounded-[12px] bg-page p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }} role="group" aria-label={label}>
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    aria-pressed={value === option.value}
                    onClick={() => onChange(option.value)}
                    // One line at any width: a phone (320px) gets a slightly smaller size instead of a wrap
                    className={cn(
                        'min-h-9 whitespace-nowrap rounded-[9px] px-1 text-[12px] font-semibold transition-colors min-[400px]:text-[14px]',
                        value === option.value ? 'bg-hover text-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.06)]' : 'text-faint hover:text-foreground',
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

export default function CreateAlertModal({ symbol, currentPrice, currency = 'USD', children, onAlertCreated }: CreateAlertModalProps) {
    const t = useTranslations('CreateAlertModal');
    const [open, setOpen] = useState(false);
    const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
    const [targetType, setTargetType] = useState<'PRICE' | 'SMA'>('PRICE');
    const [smaPeriod, setSmaPeriod] = useState<SmaPeriod>(50);
    const isSma = targetType === 'SMA';
    const [targetPrice, setTargetPrice] = useState('');
    const [loading, setLoading] = useState(false);

    const target = parseFloat(targetPrice);
    const hasPrice = !!currentPrice && currentPrice > 0;
    const distance = hasPrice && Number.isFinite(target) ? ((target - currentPrice!) / currentPrice!) * 100 : null;
    const alreadyMet = distance !== null && (condition === 'ABOVE' ? distance <= 0 : distance >= 0);

    const onOpenChange = (next: boolean) => {
        setOpen(next);
        if (next) setTargetPrice(hasPrice ? currentPrice!.toFixed(2) : '');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isSma) {
                // The average comes back from the server: it is computed there from daily closes
                const alert = await createAlert({ symbol, condition, target: 'SMA', smaPeriod });
                if ('error' in alert) {
                    toast.error(alert.error === 'notEnoughHistory' ? t('smaNoHistory', { period: smaPeriod }) : t('smaHistoryUnavailable'));
                    return;
                }
                toast.success(t('createdSma', { symbol, condition, period: smaPeriod, price: formatPrice(alert.targetPrice, currency) }));
            } else {
                await createAlert({ symbol, targetPrice: target, condition });
                toast.success(t('created', { symbol, condition, price: formatPrice(target, currency) }));
            }
            setOpen(false);
            onAlertCreated?.();
        } catch (error) {
            console.error(error);
            toast.error(t('createFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {children && <DialogTrigger asChild>{children}</DialogTrigger>}
            <DialogContent className="sm:max-w-[420px] gap-5">
                {alertsEnabled ? (
                    <>
                        <div>
                            <p className="kicker text-brand-ink">{t('kicker')}</p>
                            <DialogTitle className="mt-1 text-xl font-bold tracking-tight mono">{symbol}</DialogTitle>
                            <DialogDescription className="mt-1 text-[13px] text-faint">
                                {t('description')}
                            </DialogDescription>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <Segmented
                                label={t('alertOn')}
                                value={targetType}
                                options={[{ value: 'PRICE', label: t('typePrice') }, { value: 'SMA', label: t('typeSma') }]}
                                onChange={setTargetType}
                            />
                            <Segmented
                                label={t('conditionLabel')}
                                value={condition}
                                options={CONDITIONS.map(({ value, labelKey, smaLabelKey }) => ({ value, label: t(isSma ? smaLabelKey : labelKey) }))}
                                onChange={setCondition}
                            />

                            {isSma ? (
                                <div className="flex flex-col gap-2">
                                    <span className="form-label">{t('smaPeriodLabel')}</span>
                                    <Segmented
                                        label={t('smaPeriodLabel')}
                                        value={smaPeriod}
                                        options={SMA_PERIODS.map((period) => ({ value: period, label: t('smaOption', { period }) }))}
                                        onChange={setSmaPeriod}
                                    />
                                    <span className="text-[12.5px] text-faint">{t('smaHint')}</span>
                                </div>
                            ) : (
                            <label className="flex flex-col gap-2">
                                <span className="form-label">{t('targetPrice')}</span>
                                <span className="flex h-12 items-center gap-2 rounded-[11px] border border-line bg-page px-3 focus-within:border-brand">
                                    <span className="mono text-faint">{currency}</span>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        step="0.01"
                                        min="0.01"
                                        required
                                        autoFocus
                                        value={targetPrice}
                                        onChange={(e) => setTargetPrice(e.target.value)}
                                        className="num w-full bg-transparent text-lg font-semibold text-foreground outline-none"
                                    />
                                </span>
                                <span className={cn('num text-[12.5px]', alreadyMet ? 'text-warn' : 'text-faint')}>
                                    {!hasPrice
                                        ? t('priceUnavailable')
                                        : alreadyMet
                                            ? t('alreadyMet', { condition })
                                            : distance === null
                                                ? t('now', { price: formatPrice(currentPrice!, currency) })
                                                : t('nowWithDistance', { price: formatPrice(currentPrice!, currency), distance: `${distance > 0 ? '+' : ''}${distance.toFixed(2)}` })}
                                </span>
                            </label>
                            )}

                            <button type="submit" disabled={loading || (!isSma && !(target > 0))} className="btn btn-primary h-11">
                                {loading ? t('setting') : t('setAlert')}
                            </button>
                        </form>
                    </>
                ) : (
                    // Alerts are an OpenStock Cloud feature; the free hourly site points people to it
                    <div>
                        <p className="kicker text-brand-ink">OpenStock Cloud</p>
                        <DialogTitle className="mt-1 text-xl font-bold tracking-tight">{t('cloudTitle')}</DialogTitle>
                        <DialogDescription className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                            {t('cloudBody')}
                        </DialogDescription>
                        <div className="mt-5 flex flex-wrap gap-2">
                            <Link href="/#data" className="btn btn-primary h-11 flex-1">{t('seeCloud')}</Link>
                            <Link href="/#self-host" className="btn btn-ghost h-11">{t('selfHost')}</Link>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
