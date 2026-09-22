'use client';

import { NAV_ITEMS } from "@/lib/constants";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NavItems = () => {
    const pathname = usePathname();

    return (
        <ul className="finviz-nav-list">
            {NAV_ITEMS.map(({ href, label }) => {
                const path = href.split('#')[0];
                const isActive = href.includes('#') ? false : path === '/' ? pathname === '/' : pathname.startsWith(path);
                return (
                    <li key={href}>
                        <Link href={href} className={isActive ? 'active' : undefined}>
                            {label}
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
};

export default NavItems;
