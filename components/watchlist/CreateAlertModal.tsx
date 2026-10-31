"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createAlert } from "@/lib/actions/alert.actions";
import { alertsEnabled } from "@/lib/market-data";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { tx, type Lang } from "@/lib/i18n";

interface CreateAlertModalProps {
    symbol: string;
    currentPrice?: number | null;
    currency?: string;
    children?: React.ReactNode;
    lang?: Lang;
    onAlertCreated?: () => void;
}

// Labels live in the dictionary; the values are what the server stores.
const CONDITIONS = ['ABOVE', 'BELOW'] as const;

export default function CreateAlertModal({ symbol, currentPrice, currency = 'USD', children, lang = 'en', onAlertCreated }: CreateAlertModalProps) {
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
            toast.success(tx(lang, 'alertModal.created')
                .replace('{s}', symbol)
                .replace('{c}', `${condition === 'ABOVE' ? tx(lang, 'alert.above') : tx(lang, 'alert.below')} ${formatPrice(target, currency)}`));
            setOpen(false);
            onAlertCreated?.();
        } catch (error) {
            console.error(error);
            toast.error(tx(lang, 'alertModal.failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {children && <DialogTrigger asChild>{children}</DialogTrigger>}
            <DialogContent className="sm:max-w-[420px] gap-5" closeLabel={tx(lang, 'dialog.close')}>
                {alertsEnabled ? (
                    <>
                        <div>
                            <p className="kicker text-brand-ink">{tx(lang, 'alertModal.kicker')}</p>
                            <DialogTitle className="mt-1 text-xl font-bold tracking-tight mono">{symbol}</DialogTitle>
                            <DialogDescription className="mt-1 text-[13px] text-faint">
                                {tx(lang, 'alertModal.desc')}
                            </DialogDescription>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-1 rounded-[12px] bg-page p-1" role="radiogroup" aria-label={tx(lang, 'alertModal.condition')}>
                                {CONDITIONS.map((value) => (
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
                                        {value === 'ABOVE' ? tx(lang, 'alertModal.risesAbove') : tx(lang, 'alertModal.fallsBelow')}
                                    </button>
                                ))}
                            </div>

                            <label className="flex flex-col gap-2">
                                <span className="form-label">{tx(lang, 'alertModal.target')}</span>
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
                                        ? tx(lang, 'alertModal.noPrice')
                                        : alreadyMet
                                            ? tx(lang, condition === 'ABOVE' ? 'alertModal.alreadyAbove' : 'alertModal.alreadyBelow')
                                            : [
                                                tx(lang, 'alertModal.now').replace('{p}', formatPrice(currentPrice!, currency)),
                                                ...(distance === null ? [] : [tx(lang, 'alertModal.away').replace('{n}', `${distance > 0 ? '+' : ''}${distance.toFixed(2)}`)]),
                                            ].join(' · ')}
                                </span>
                            </label>

                            <button type="submit" disabled={loading || !(target > 0)} className="btn btn-primary h-11">
                                {loading ? tx(lang, 'alertModal.setting') : tx(lang, 'alertModal.set')}
                            </button>
                        </form>
                    </>
                ) : (
                    // Alerts are an OpenStock Cloud feature; the free hourly site points people to it
                    <div>
                        <p className="kicker text-brand-ink">OpenStock Cloud</p>
                        <DialogTitle className="mt-1 text-xl font-bold tracking-tight">{tx(lang, 'alertModal.cloudTitle')}</DialogTitle>
                        <DialogDescription className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                            {tx(lang, 'alertModal.cloudBody')}
                        </DialogDescription>
                        <div className="mt-5 flex gap-2">
                            <Link href="/#data" className="btn btn-primary h-11 flex-1">{tx(lang, 'alertModal.cloudCta')}</Link>
                            <Link href="/#self-host" className="btn btn-ghost h-11">{tx(lang, 'alertModal.selfHost')}</Link>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
