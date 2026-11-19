"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Sponsor } from "@/lib/sponsors";

type Props = {
    sponsor: Sponsor;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function SponsorPerkModal({ sponsor, open, onOpenChange }: Props) {
    const perk = sponsor.perk;
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!open) setCopied(false);
    }, [open]);

    if (!perk) return null;

    const copyCode = async () => {
        try {
            await navigator.clipboard.writeText(perk.code);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    };

    const continueToSponsor = () => {
        void copyCode();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="gap-6 sm:max-w-[420px]" aria-describedby="sponsor-perk-description">
                <div className="flex items-center gap-3 pr-8">
                    {sponsor.logo && (
                        <img
                            src={sponsor.logo}
                            alt=""
                            className="h-8 w-auto max-w-[140px] object-contain"
                        />
                    )}
                    <p className="text-[17px] font-bold tracking-[-0.02em]">{sponsor.name}</p>
                </div>

                <div>
                    <DialogTitle className="kicker text-brand-ink">An OpenStock perk</DialogTitle>
                    <p className="mt-2 text-[28px] font-bold tracking-[-0.04em] text-foreground">{perk.discount}</p>
                    {perk.note && <p className="mt-1.5 text-[14px] text-muted-foreground">{perk.note}</p>}
                </div>

                <div className="flex items-stretch gap-2">
                    <p
                        className="flex min-w-0 flex-1 items-center justify-center rounded-[12px] bg-page px-4 py-3 font-mono text-[22px] font-bold tracking-[0.06em] text-foreground shadow-[inset_0_0_0_1px_var(--line)]"
                        aria-label={`Promo code ${perk.code}`}
                    >
                        {perk.code}
                    </p>
                    <button
                        type="button"
                        className="btn btn-ghost h-auto min-w-[96px] px-4"
                        onClick={() => void copyCode()}
                        aria-label={copied ? "Copied" : `Copy code ${perk.code}`}
                    >
                        {copied ? <Check /> : <Copy />}
                        {copied ? "Copied" : "Copy"}
                    </button>
                </div>

                <DialogDescription id="sponsor-perk-description" className="text-[14px] leading-relaxed text-muted-foreground">
                    Use this code at checkout. A thank-you for being part of OpenStock.
                </DialogDescription>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" className="btn btn-ghost h-11 px-5" onClick={() => onOpenChange(false)}>
                        Cancel
                    </button>
                    <a
                        href={sponsor.url}
                        target="_blank"
                        rel="noopener sponsored"
                        className="btn btn-primary h-11 px-5 text-[15px]"
                        onClick={continueToSponsor}
                    >
                        Continue to {sponsor.name} <ArrowUpRight />
                    </a>
                </div>
            </DialogContent>
        </Dialog>
    );
}
