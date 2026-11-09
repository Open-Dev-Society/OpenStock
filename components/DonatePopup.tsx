'use client';

import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Heart } from 'lucide-react';

const DONATE_POPUP_KEY = 'opendevsociety-donate-popup-dismissed';
const DONATE_POPUP_DELAY = 3000; // Show after 3 seconds
const DONATE_POPUP_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export default function DonatePopup() {
    const t = useTranslations('DonatePopup');
    const [open, setOpen] = useState(false);

    useEffect(() => {
        // Check if user has dismissed popup
        const dismissed = localStorage.getItem(DONATE_POPUP_KEY);
        
        if (dismissed) {
            const dismissedTime = parseInt(dismissed, 10);
            const now = Date.now();
            // Show again after cooldown period
            if (now - dismissedTime < DONATE_POPUP_COOLDOWN) {
                return;
            }
        }

        // Show popup after delay
        const timer = setTimeout(() => {
            setOpen(true);
        }, DONATE_POPUP_DELAY);

        return () => clearTimeout(timer);
    }, []);

    // Listen for custom event from donate button
    useEffect(() => {
        const handleOpenPopup = () => setOpen(true);
        window.addEventListener('open-donate-popup', handleOpenPopup);
        return () => window.removeEventListener('open-donate-popup', handleOpenPopup);
    }, []);

    const handleDismiss = () => {
        setOpen(false);
        // Store dismissal time
        localStorage.setItem(DONATE_POPUP_KEY, Date.now().toString());
    };


    return (
        <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : handleDismiss())}>
            <DialogContent className="gap-5 sm:max-w-[440px]">
                <DialogHeader className="gap-3 text-start">
                    <span className="bento-ico size-11 bg-brand-soft text-brand-ink">
                        <Heart className="size-5 fill-current" />
                    </span>
                    <div>
                        <p className="kicker flex items-center gap-2 text-brand-ink"><span className="live-dot" /> {t('kicker')}</p>
                        <DialogTitle className="mt-1.5 text-2xl font-bold tracking-[-0.03em]">{t('title')}</DialogTitle>
                    </div>
                    <DialogDescription className="text-[15px] leading-relaxed text-muted-foreground">
                        {t('description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-2 sm:flex-row">
                    <Link href="/sponsor" onClick={handleDismiss} className="btn btn-primary h-11 flex-1">
                        <Heart className="fill-current" /> {t('becomeSponsor')}
                    </Link>
                    <button type="button" onClick={handleDismiss} className="btn btn-ghost h-11 flex-1">
                        {t('maybeLater')}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
