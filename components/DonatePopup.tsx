'use client';

import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Heart, Github } from 'lucide-react';

const DONATE_POPUP_KEY = 'opendevsociety-donate-popup-dismissed';
const DONATE_POPUP_DELAY = 3000; // Show after 3 seconds
const DONATE_POPUP_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const GITHUB_SPONSOR_URL = 'https://github.com/sponsors/ravixalgorithm';

export default function DonatePopup() {
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

    const handleDonate = () => {
        window.open(GITHUB_SPONSOR_URL, '_blank', 'noopener,noreferrer');
        handleDismiss();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="!bg-gray-800 !border-teal-600/50 text-gray-100 max-w-md mx-4 sm:mx-auto sm:w-full sm:max-w-lg">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-teal-500/20 rounded-lg">
                            <Heart className="h-6 w-6 text-teal-400 fill-teal-400" />
                        </div>
                        <DialogTitle className="text-2xl font-bold text-gray-100">
                            Keep OpenStock Free
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-gray-400 text-base leading-relaxed pt-2">
                        Your overwhelming love for OpenStock and Open Dev Society has helped us grow, 
                        but we're hitting Vercel's free tier limits. 
                        <br /><br />
                        Help us keep OpenStock free and accessible for everyone by supporting us on GitHub Sponsors. 
                        Every contribution, no matter how small, makes a difference! 💙
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <Button
                        onClick={handleDonate}
                        className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold h-11 transition-all duration-200 transform hover:scale-105"
                    >
                        <Github className="h-4 w-4 mr-2" />
                        Sponsor on GitHub
                    </Button>
                    <Button
                        onClick={handleDismiss}
                        variant="outline"
                        className="flex-1 border-teal-600/50 text-teal-400 hover:bg-teal-600/10 hover:text-teal-300 h-11 transition-all duration-200"
                    >
                        Maybe Later
                    </Button>
                </div>

                <p className="text-xs text-gray-500 text-center mt-4">
                    This popup won't appear again for 24 hours after dismissing
                </p>
            </DialogContent>
        </Dialog>
    );
}
