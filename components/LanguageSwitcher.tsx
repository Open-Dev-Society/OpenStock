'use client';

import { useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Globe } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useLocale } from '@/hooks/useLocale';

export default function LanguageSwitcher() {
    const router = useRouter();
    const pathname = usePathname();
    const locale = useLocale();
    const [isPending, startTransition] = useTransition();

    const handleLocaleChange = (newLocale: string) => {
        startTransition(() => {
            const segments = pathname.split('/');
            // Remove existing locale segment if present
            if (segments[1] === 'en' || segments[1] === 'zh-CN') {
                segments[1] = newLocale;
            } else {
                segments.splice(1, 0, newLocale);
            }
            router.push(segments.join('/'));
            document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
        });
    };

    return (
        <Select value={locale} onValueChange={handleLocaleChange} disabled={isPending}>
            <SelectTrigger className="w-[130px] h-9 bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white">
                <Globe className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                <SelectItem value="en" className="hover:bg-gray-700 focus:bg-gray-700">
                    English
                </SelectItem>
                <SelectItem value="zh-CN" className="hover:bg-gray-700 focus:bg-gray-700">
                    简体中文
                </SelectItem>
            </SelectContent>
        </Select>
    );
}
