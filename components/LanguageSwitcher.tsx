'use client';

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Languages, Loader2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALES, LOCALE_NAMES, isLocale } from "@/i18n/config";
import { setLocale } from "@/lib/actions/locale.actions";
import { cn } from "@/lib/utils";

// Language names stay in their own language so anyone can find theirs.
export default function LanguageSwitcher({ className }: { className?: string }) {
    const t = useTranslations('Language');
    const locale = useLocale();
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    const change = (next: string) => {
        if (next === locale || !isLocale(next)) return;
        startTransition(async () => {
            await setLocale(next);
            router.refresh();
        });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger disabled={pending} className={cn('side-item h-8 w-full text-left outline-none', className)}>
                {pending ? <Loader2 className="animate-spin" /> : <Languages />}
                <span className="flex-1">{t('label')}</span>
                <span className="text-xs text-faint" lang={locale}>{LOCALE_NAMES[locale]}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width)">
                <DropdownMenuRadioGroup value={locale} onValueChange={change}>
                    {LOCALES.map((code) => (
                        <DropdownMenuRadioItem key={code} value={code} lang={code}>
                            {LOCALE_NAMES[code]}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
