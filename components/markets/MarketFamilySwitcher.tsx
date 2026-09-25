'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MARKET_FAMILIES } from '@/lib/markets/market-families';

const MarketFamilySwitcher = () => {
    const pathname = usePathname();

    return (
        <nav aria-label="Market families" className="overflow-x-auto">
            <ul className="flex min-w-max gap-2 rounded-xl border border-white/10 bg-black/20 p-2">
                {MARKET_FAMILIES.map((family) => {
                    const isActive = pathname === family.href || pathname.startsWith(`${family.href}/`);

                    return (
                        <li key={family.slug}>
                            <Link
                                href={family.href}
                                aria-current={isActive ? 'page' : undefined}
                                className={`block rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                    isActive
                                        ? 'bg-teal-500 text-gray-950'
                                        : 'text-gray-400 hover:bg-white/10 hover:text-gray-100'
                                }`}
                            >
                                {family.label}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};

export default MarketFamilySwitcher;
