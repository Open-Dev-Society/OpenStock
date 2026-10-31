'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LATEST_RELEASE } from "@/lib/changelog";
import { cn } from "@/lib/utils";
import { tx, type Lang } from "@/lib/i18n";

// Always shows the latest release. The whole strip opens a short summary; the full history is on /changelog.
export default function UpdateBanner({ className, lang = 'en' }: { className?: string; lang?: Lang }) {
    // Radix generates ids for the dialog on the client, so rendering it during hydration made the
    // whole app tree mismatch. The strip is identical on both sides; the dialog joins once mounted.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // Arabic copy is optional; anything missing falls back to the English line rather than to blank.
    const title = (lang === 'ar' && LATEST_RELEASE.titleAr) || LATEST_RELEASE.title;
    const summary = (lang === 'ar' && LATEST_RELEASE.summaryAr) || LATEST_RELEASE.summary;
    const highlights = (lang === 'ar' && LATEST_RELEASE.highlightsAr) || LATEST_RELEASE.highlights || [];

    const banner = (
        <button
            type="button"
            className={cn(
                'group flex w-full items-center gap-2.5 rounded-[12px] bg-brand-soft/50 py-1.5 ps-2 pe-3 text-start text-[13px] shadow-[inset_0_0_0_1px_oklch(0.8_0.13_176/0.25)] transition-colors hover:bg-brand-soft/80',
                className,
            )}
        >
            <span className="pill is-brand shrink-0">{tx(lang, 'banner.new')}</span>
            <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold text-foreground">{title}:</span>{' '}
                <span className="text-muted-foreground">{summary}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1 font-semibold text-brand-ink">
                <span className="max-sm:hidden">{tx(lang, 'banner.see')}</span>
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
        </button>
    );

    if (!mounted) return banner;

    return (
        <Dialog>
            <DialogTrigger asChild>{banner}</DialogTrigger>

            <DialogContent className="sm:max-w-md" closeLabel={tx(lang, 'dialog.close')}>
                <div>
                    <p className="kicker text-brand-ink">{LATEST_RELEASE.date}</p>
                    <DialogTitle className="mt-1.5 text-[22px] font-bold tracking-[-0.03em]">{title}</DialogTitle>
                    <DialogDescription className="mt-1 text-[14px] text-muted-foreground">{summary}.</DialogDescription>
                </div>
                <ul className="flex flex-col gap-2.5 text-[14px] leading-relaxed">
                    {highlights.map((item) => (
                        <li key={item} className="flex gap-2.5">
                            <Check className="mt-1 size-4 flex-none text-brand-ink" />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
                {/* Closes the modal too: the banner stays mounted across navigations */}
                <DialogClose asChild>
                    <Link href="/changelog" className="btn btn-primary h-10 w-full">
                        {tx(lang, 'banner.readAll')} <ArrowRight />
                    </Link>
                </DialogClose>
            </DialogContent>
        </Dialog>
    );
}
