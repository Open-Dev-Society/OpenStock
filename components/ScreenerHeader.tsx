'use client';

import { useRouter } from 'next/navigation';
import { tx, type Lang } from '@/lib/i18n';

interface ScreenerHeaderProps {
    lang: Lang;
    rising: boolean;
    burst: boolean;
    band: [number, number] | null;
}

export default function ScreenerHeader({ lang, rising, burst, band }: ScreenerHeaderProps) {
    const router = useRouter();
    
    return (
        <div className="flex items-center gap-1.5">
            <button 
                type="button" 
                onClick={() => router.refresh()} 
                className="pill h-8"
            >
                {'\u27F3'} {tx(lang, 'screen.refresh')}
            </button>
            
            {!rising && !burst && (
                <a href="/screener?rising=1" className="pill h-8">{tx(lang, 'screen.rising')}</a>
            )}
            {!burst && (
                <a href="/screener?burst=1" className="pill h-8">{tx(lang, 'screen.burst')}</a>
            )}
            
            <form action="/screener" method="GET" className="flex items-center gap-1.5">
                <label className="text-[11.5px] text-faint">
                    {tx(lang, 'screen.rsiFrom')}{' '}
                    <input
                        type="number" name="rsiMin" min={0} max={100}
                        defaultValue={band ? band[0] : 25}
                        className="num h-8 w-14 rounded-[9px] border border-line bg-page px-2 text-[12.5px] text-foreground outline-none"
                    />
                </label>
                <label className="text-[11.5px] text-faint">
                    {tx(lang, 'screen.rsiTo')}{' '}
                    <input
                        type="number" name="rsiMax" min={0} max={100}
                        defaultValue={band ? band[1] : 70}
                        className="num h-8 w-14 rounded-[9px] border border-line bg-page px-2 text-[12.5px] text-foreground outline-none"
                    />
                </label>
                <button type="submit" className="pill h-8">{tx(lang, 'screen.apply')}</button>
                {(band || rising || burst) && (
                    <a href="/screener" className="pill h-8">{tx(lang, 'screen.clear')}</a>
                )}
            </form>
        </div>
    );
}
