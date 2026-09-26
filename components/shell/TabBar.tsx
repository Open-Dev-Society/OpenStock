'use client';

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FileText, LayoutDashboard, Menu, Plus, Star, X } from "lucide-react";
import { openSearch } from "@/components/SearchCommand";
import { cn } from "@/lib/utils";

const PINNED = ['/dashboard', '/watchlist'];
const STORAGE_KEY = 'openstock-tabs';
const MAX_TABS = 12;

const PAGE_LABELS: Record<string, string> = {
    '/dashboard': 'Overview',
    '/watchlist': 'Watchlist',
    '/profile': 'Profile',
    '/research': 'Research',
};

// Pages become browser-style tabs; stock pages are labelled by their symbol.
const tabLabel = (path: string) => {
    const stock = path.match(/^\/stocks\/([^/]+)$/);
    if (stock) return decodeURIComponent(stock[1]).toUpperCase();
    return PAGE_LABELS[path] ?? null;
};

const withTab = (tabs: string[], path: string) => {
    if (!tabLabel(path) || tabs.includes(path)) return tabs;
    const next = [...tabs, path];
    const extra = next.length - MAX_TABS;
    return extra > 0 ? next.filter((t, i) => PINNED.includes(t) || i >= extra + PINNED.length) : next;
};

const TabBar = ({ onMenu }: { onMenu: () => void }) => {
    const pathname = usePathname();
    // Research runs share one tab; private run IDs do not enter persisted tab history.
    const activePath = pathname.startsWith('/research/') ? '/research' : pathname;
    const router = useRouter();
    const [tabs, setTabs] = useState(() => withTab(PINNED, activePath));
    const tabRefs = useRef(new Map<string, HTMLDivElement>());
    const [glider, setGlider] = useState<{ x: number; w: number } | null>(null);

    // Restore tabs from the last visit (per-browser convenience only)
    useEffect(() => {
        try {
            const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
            if (Array.isArray(saved)) {
                setTabs((current) => saved.filter((p): p is string => typeof p === 'string').reduce(withTab, current));
            }
        } catch { /* storage unavailable */ }
    }, []);

    useEffect(() => setTabs((current) => withTab(current, activePath)), [activePath]);

    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs)); } catch { /* storage unavailable */ }
    }, [tabs]);

    useLayoutEffect(() => {
        const el = tabRefs.current.get(activePath);
        if (!el) return setGlider(null);
        setGlider({ x: el.offsetLeft - 11, w: el.offsetWidth + 22 });
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }, [activePath, tabs]);

    const closeTab = (path: string) => {
        const index = tabs.indexOf(path);
        const next = tabs.filter((t) => t !== path);
        setTabs(next);
        if (path === activePath) router.push(next[Math.max(0, index - 1)] ?? '/dashboard');
    };

    return (
        <div className="tabbar">
            <button type="button" onClick={onMenu} className="chrome-btn lg:hidden" aria-label="Open menu">
                <Menu />
            </button>

            <div className="tabs pl-3 pr-3">
                <div
                    className={cn('tab-glider', glider && 'is-ready')}
                    style={glider ? { transform: `translateX(${glider.x}px)`, width: glider.w } : undefined}
                    aria-hidden
                >
                    <svg className="tab-glider-curve is-left" viewBox="0 0 12 12"><path d="M12 0v12H0c6.627 0 12-5.373 12-12z" /></svg>
                    <div className="tab-glider-body" />
                    <svg className="tab-glider-curve is-right" viewBox="0 0 12 12"><path d="M12 0v12H0c6.627 0 12-5.373 12-12z" /></svg>
                </div>

                {tabs.map((path) => {
                    const pinned = PINNED.includes(path);
                    const isStock = path.startsWith('/stocks/');
                    const active = path === activePath;
                    return (
                        <div
                            key={path}
                            ref={(el) => { if (el) tabRefs.current.set(path, el); else tabRefs.current.delete(path); }}
                            className={cn('tab', active && 'is-active', pinned && 'pr-4')}
                        >
                            {/* Stretched link: the whole tab navigates, while the close button stays a real, focusable button */}
                            <Link href={path} aria-current={active ? 'page' : undefined} className="flex min-w-0 flex-1 items-center gap-2 before:absolute before:inset-0 before:content-['']">
                                {path === '/dashboard' && <LayoutDashboard />}
                                {path === '/watchlist' && <Star />}
                                {path === '/research' && <FileText />}
                                <span className={cn('tab-label', isStock && 'mono text-[13px]')}>{tabLabel(path)}</span>
                            </Link>
                            {!pinned && (
                                <button
                                    type="button"
                                    aria-label={`Close ${tabLabel(path)}`}
                                    className="tab-close relative z-10"
                                    onClick={() => closeTab(path)}
                                >
                                    <X />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <button type="button" onClick={openSearch} className="chrome-btn -ml-2" aria-label="Open a stock" title="Open a stock (⌘K)">
                <Plus />
            </button>
        </div>
    );
};

export default TabBar;
