'use client'


import React, { createContext, useContext } from 'react'
import {NAV_ITEMS} from "@/lib/constants";
import Link from "next/link";
import {usePathname} from "next/navigation";
import SearchCommand from "@/components/SearchCommand";
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Create context for popup state
const DonatePopupContext = createContext<{
    openDonatePopup: () => void;
}>({
    openDonatePopup: () => {}
});

export const useDonatePopup = () => useContext(DonatePopupContext);

const NavItems = ({initialStocks}: { initialStocks: StockWithWatchlistStatus[]}) => {
    const pathname = usePathname()

    const isActive = (path: string) => {
        if (path ==='/') return pathname === '/'

        return  pathname.startsWith(path);
    }

    const openDonatePopup = () => {
        // Trigger the popup by dispatching a custom event
        window.dispatchEvent(new CustomEvent('open-donate-popup'));
    }

    return (
        <DonatePopupContext.Provider value={{ openDonatePopup }}>
            <ul className="flex flex-col sm:flex-row p-2 gap-3 sm:gap-10 font-medium">
            {NAV_ITEMS.map(({href, label}) => {
                if (href === '/search') return (
                    <li key="search-trigger">
                        <SearchCommand
                            renderAs="text"
                            label="Search"
                            initialStocks={initialStocks}
                        />
                    </li>
                )
                return <li key={href}>
                    <Link href={href} className={`hover:text-teal-500 transition-colors ${isActive(href) ? 'text-gray-100' : ''}`}>
                        {label}
                    </Link>
                </li>
            })}
            <li key="donate">
                <Button
                    onClick={openDonatePopup}
                    className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center gap-2 animate-pulse"
                    size="sm"
                >
                    <Heart className="h-4 w-4 fill-current" />
                    Donate
                </Button>
            </li>
        </ul>
        </DonatePopupContext.Provider>
    )
}
export default NavItems
