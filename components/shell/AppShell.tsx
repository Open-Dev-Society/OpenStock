'use client';

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/shell/Sidebar";
import TabBar from "@/components/shell/TabBar";
import SearchCommand from "@/components/SearchCommand";
import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/i18n";

type AppShellProps = {
    user: User;
    watchlist: { symbol: string; company: string }[];
    initialStocks: StockWithWatchlistStatus[];
    lang: Lang;
    children: React.ReactNode;
};

const AppShell = ({ user, watchlist, initialStocks, lang, children }: AppShellProps) => {
    const pathname = usePathname();
    const [navOpen, setNavOpen] = useState(false);
    const workspaceRef = useRef<HTMLElement>(null);

    // The workspace is the scroll container, so reset it on navigation
    useEffect(() => {
        setNavOpen(false);
        workspaceRef.current?.scrollTo({ top: 0 });
    }, [pathname]);

    return (
        <div className="shell">
            <div
                className={cn(
                    'min-h-0 max-lg:fixed max-lg:inset-y-0 max-lg:z-50 max-lg:w-[272px] max-lg:transition-transform max-lg:duration-200',
                    lang === 'ar'
                        ? 'max-lg:right-0'
                        : 'max-lg:left-0',
                    navOpen ? 'max-lg:translate-x-0' : lang === 'ar' ? 'max-lg:translate-x-full' : 'max-lg:-translate-x-full',
                )}
            >
                <Sidebar user={user} watchlist={watchlist} lang={lang} />
            </div>
            {navOpen && (
                <div className="fixed inset-0 z-40 bg-page/60 backdrop-blur-[2px] lg:hidden" onClick={() => setNavOpen(false)} />
            )}

            <div className="shell-container">
                <div className="app">
                    <TabBar onMenu={() => setNavOpen(true)} lang={lang} />
                    <main ref={workspaceRef} className={cn('workspace', pathname === '/dashboard' && 'is-first-tab')}>
                        <div className="workspace-inner">{children}</div>
                    </main>
                </div>
            </div>

            <SearchCommand initialStocks={initialStocks} lang={lang} />
        </div>
    );
};

export default AppShell;
