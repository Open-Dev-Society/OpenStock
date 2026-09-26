'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Code2, FileText, Heart, Info, LayoutDashboard, LifeBuoy, LogOut, Search, Star } from "lucide-react";
import { openSearch } from "@/components/SearchCommand";
import { signOut } from "@/lib/actions/auth.actions";
import { cn } from "@/lib/utils";
import { SIDEBAR_SPONSOR_SLOTS, sidebarSponsors } from "@/lib/sponsors";

type SidebarProps = {
    user: User;
    watchlist: { symbol: string; company: string }[];
};

const RESOURCES = [
    { href: '/help', label: 'Help', icon: LifeBuoy },
    { href: '/api-docs', label: 'API docs', icon: Code2 },
    { href: '/about', label: 'About', icon: Info },
    { href: '/terms', label: 'Terms', icon: BookOpen },
];

const Sidebar = ({ user, watchlist }: SidebarProps) => {
    const pathname = usePathname();
    const router = useRouter();
    const isResearch = pathname === '/research' || pathname.startsWith('/research/');
    const partners = sidebarSponsors();
    const openSlots = SIDEBAR_SPONSOR_SLOTS - partners.length;

    const handleSignOut = async () => {
        await signOut();
        router.push('/sign-in');
    };

    return (
        <aside className="sidebar">
            <Link href="/dashboard" className="px-2 pt-1 pb-2" aria-label="OpenStock dashboard">
                <Image src="/assets/images/logo.png" alt="OpenStock" width={150} height={38} priority />
            </Link>

            <button type="button" onClick={openSearch} className="side-cta">
                <Search className="size-4" strokeWidth={2.5} />
                <span className="flex-1 text-left">Search stocks</span>
                <kbd className="kbd bg-on-brand/10">⌘K</kbd>
            </button>

            <nav className="flex flex-col gap-0.5">
                <Link href="/dashboard" className={cn('side-item', pathname === '/dashboard' && 'is-active')}>
                    <LayoutDashboard /> Overview
                </Link>
                <Link href="/watchlist" className={cn('side-item', pathname === '/watchlist' && 'is-active')}>
                    <Star /> <span className="flex-1">Watchlist</span>
                    <span className="num text-xs text-faint">{watchlist.length}</span>
                </Link>
                <Link href="/research" aria-current={isResearch ? 'page' : undefined} className={cn('side-item', isResearch && 'is-active')}>
                    <FileText /> Research
                </Link>
            </nav>

            <div className="flex flex-col gap-1 min-h-0">
                <p className="side-label">Watching</p>
                {watchlist.length === 0 ? (
                    <p className="px-2.5 text-[12.5px] text-faint">Star a stock to pin it here.</p>
                ) : (
                    <ul className="flex flex-col gap-0.5">
                        {watchlist.map(({ symbol, company }) => (
                            <li key={symbol}>
                                <Link
                                    href={`/stocks/${symbol}`}
                                    title={company}
                                    className={cn('side-item h-8 font-medium', pathname === `/stocks/${symbol}` && 'is-active')}
                                >
                                    <span className="mono w-14 shrink-0 text-[12.5px] font-semibold text-foreground">{symbol}</span>
                                    {company !== symbol && <span className="truncate text-[12.5px] text-faint">{company}</span>}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="mt-auto flex flex-col gap-0.5">
                {RESOURCES.map(({ href, label, icon: Icon }) => (
                    <Link key={href} href={href} className={cn('side-item h-8', pathname === href && 'is-active')}>
                        <Icon /> {label}
                    </Link>
                ))}
                <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-donate-popup'))}
                    className="side-item h-8 text-left"
                >
                    <Heart /> Support OpenStock
                </button>
            </div>

            <div className="flex flex-col gap-1.5">
                {partners.map((sponsor) => (
                    <a key={sponsor.name} href={sponsor.url} target="_blank" rel="noreferrer" title={sponsor.name} className="flex h-11 items-center gap-2.5 rounded-[11px] px-3 shadow-[inset_0_0_0_1px_var(--line)] transition-colors hover:bg-white/5">
                        {sponsor.logo ? <img src={sponsor.logo} alt={sponsor.name} className="h-5 w-auto max-w-[120px]" /> : <span className="truncate text-[13px] font-semibold text-muted-foreground">{sponsor.name}</span>}
                        <span className="kicker ml-auto">Sponsor</span>
                    </a>
                ))}
                {openSlots > 0 && (
                    <Link href="/sponsor#tiers" className="group flex flex-col gap-0.5 rounded-[11px] px-3 py-2.5 shadow-[inset_0_0_0_1px_var(--line)] transition-colors hover:bg-white/5">
                        <span className="kicker flex items-center gap-1.5 text-brand-ink">
                            <span className="live-dot" /> {openSlots === SIDEBAR_SPONSOR_SLOTS ? 'Sponsor slots open' : `${openSlots} sponsor ${openSlots === 1 ? 'slot' : 'slots'} left`}
                        </span>
                        <span className="text-[12.5px] text-faint transition-colors group-hover:text-muted-foreground">Put your company in front of every OpenStock user.</span>
                    </Link>
                )}
            </div>

            <div className="flex items-center gap-2.5 border-t border-line pt-3 px-1">
                <Link href="/profile" className={cn('-m-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px] p-1 transition-colors hover:bg-white/5', pathname === '/profile' && 'bg-white/5')}>
                    <span className="grid size-8 flex-none place-items-center rounded-full bg-brand-soft text-[13px] font-bold text-brand-ink">
                        {user.name?.[0]?.toUpperCase() ?? '?'}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-foreground">{user.name}</span>
                        <span className="block truncate text-[12px] text-faint">{user.email}</span>
                    </span>
                </Link>
                <button type="button" onClick={handleSignOut} className="icon-btn" title="Sign out" aria-label="Sign out">
                    <LogOut />
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
