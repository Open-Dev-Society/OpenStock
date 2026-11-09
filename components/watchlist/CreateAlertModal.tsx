"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createAlert } from "@/lib/actions/alert.actions";
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
    { value: 'ABOVE', labelKey: 'risesAbove' },
    { value: 'BELOW', labelKey: 'fallsBelow' },
] as const;

export default function CreateAlertModal({ symbol, currentPrice, currency = 'USD', children, onAlertCreated }: CreateAlertModalProps) {
    const t = useTranslations('CreateAlertModal');
    const [open, setOpen] = useState(false);
    const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
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
            await createAlert({ symbol, targetPrice: target, condition });
            toast.success(t('created', { symbol, condition, price: formatPrice(target, currency) }));
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
                            <div className="grid grid-cols-2 gap-1 rounded-[12px] bg-page p-1" role="radiogroup" aria-label={t('conditionLabel')}>
                                {CONDITIONS.map(({ value, labelKey }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        role="radio"
                                        aria-checked={condition === value}
                                        onClick={() => setCondition(value)}
                                        className={cn(
                                            'h-9 rounded-[9px] font-semibold transition-colors',
                                            condition === value ? 'bg-hover text-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.06)]' : 'text-faint hover:text-foreground',
                                        )}
                                    >
                                        {t(labelKey)}
                                    </button>
                                ))}
                            </div>

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

                            <button type="submit" disabled={loading || !(target > 0)} className="btn btn-primary h-11">
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
                        <div className="mt-5 flex gap-2">
                            <Link href="/#data" className="btn btn-primary h-11 flex-1">{t('seeCloud')}</Link>
                            <Link href="/#self-host" className="btn btn-ghost h-11">{t('selfHost')}</Link>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
