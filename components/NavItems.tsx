'use client'


import React, { createContext, useContext } from 'react'
import { NAV_ITEMS } from "@/lib/constants";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SearchCommand from "@/components/SearchCommand";
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * 捐赠弹窗上下文
 */
const DonatePopupContext = createContext<{
    openDonatePopup: () => void;
}>({
    openDonatePopup: () => { }
});

export const useDonatePopup = () => useContext(DonatePopupContext);

/**
 * 导航栏项目组件
 */
const NavItems = ({ initialStocks }: { initialStocks: StockWithWatchlistStatus[] }) => {
    const pathname = usePathname()

    // 判断当前路由是否匹配，用于高亮显示
    const isActive = (path: string) => {
        if (path === '/') return pathname === '/'

        return pathname.startsWith(path);
    }

    // 触发捐赠弹窗
    const openDonatePopup = () => {
        // 通过发送自定义事件触发
        window.dispatchEvent(new CustomEvent('open-donate-popup'));
    }

    return (
        <DonatePopupContext.Provider value={{ openDonatePopup }}>
            <ul className="flex flex-col sm:flex-row p-2 gap-3 sm:gap-10 font-medium">
                {NAV_ITEMS.map(({ href, label }) => {
                    // 特殊处理搜索项，其点击后打开命令面板而非跳转页面
                    if (href === '/search') return (
                        <li key="search-trigger">
                            <SearchCommand
                                renderAs="text"
                                label="搜索"
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
                {/* 捐赠按钮 */}
                <li key="donate">
                    <Button
                        onClick={openDonatePopup}
                        className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center gap-2 animate-pulse"
                        size="sm"
                    >
                        <Heart className="h-4 w-4 fill-current" />
                        捐赠
                    </Button>
                </li>
            </ul>
        </DonatePopupContext.Provider>
    )
}
export default NavItems
