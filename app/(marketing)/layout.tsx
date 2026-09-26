import Link from "next/link";
import Image from "next/image";
import { Github } from "lucide-react";
import { getSession } from "@/lib/better-auth/auth";
import { formatCount, getRepoStats } from "@/lib/github";
import OpenDevSocietyBranding from "@/components/OpenDevSocietyBranding";
import SponsorsBand from "@/components/sponsors/SponsorsBand";
import { DISCORD_URL, REPO_URL } from "@/lib/constants";

const FOOTER_LINKS = [
    { href: '/about', label: 'About' },
    { href: '/help', label: 'Help' },
    { href: '/api-docs', label: 'Architecture' },
    { href: '/terms', label: 'Terms' },
    { href: '/sponsor', label: 'Sponsor' },
    { href: REPO_URL, label: 'GitHub' },
    { href: DISCORD_URL, label: 'Discord' },
    { href: 'https://www.linkedin.com/company/opendevsociety-in/', label: 'LinkedIn' },
];

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
    const [session, repo] = await Promise.all([getSession(), getRepoStats()]);
    const signedIn = !!session?.user;

    return (
        <div className="min-h-dvh bg-page">
            <header className="sticky top-0 z-40 border-b border-transparent bg-page/80 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-5">
                    <Link href="/" aria-label="OpenStock home" className="shrink-0">
                        <Image src="/assets/images/logo.png" alt="OpenStock" width={140} height={35} priority />
                    </Link>
                    <nav className="hidden items-center gap-1 md:flex">
                        {[['/#inside', 'Product'], ['/#data', 'Data'], ['/#self-host', 'Self-host'], ['/about', 'About']].map(([href, label]) => (
                            <Link key={href} href={href} className="side-item h-8 font-semibold">{label}</Link>
                        ))}
                        <Link href="/sponsor" className="side-item h-8 gap-2 font-semibold text-brand-ink hover:text-brand-ink">
                            <span className="live-dot" /> Sponsor
                        </Link>
                    </nav>
                    <div className="ml-auto flex items-center gap-2">
                        <a href={REPO_URL} target="_blank" rel="noreferrer" className="btn btn-ghost hidden h-9 px-3 sm:inline-flex" aria-label="OpenStock on GitHub">
                            <Github />
                            {repo && <span className="num">{formatCount(repo.stars)}</span>}
                        </a>
                        {signedIn ? (
                            <Link href="/dashboard" className="btn btn-primary h-9">Open dashboard</Link>
                        ) : (
                            <>
                                <Link href="/sign-in" className="btn h-9 px-3 text-muted-foreground hover:text-foreground">Sign in</Link>
                                <Link href="/sign-up" className="btn btn-primary h-9">Get started</Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main>{children}</main>

            <SponsorsBand />

            <footer className="mx-auto mt-24 flex max-w-[1200px] flex-col gap-6 px-5 pb-10 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-3">
                    <Image src="/assets/images/logo.png" alt="OpenStock" width={120} height={30} />
                    <p className="text-[13px] text-faint">© {new Date().getFullYear()} Open Dev Society · AGPL-3.0</p>
                </div>
                <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-semibold text-muted-foreground">
                    {FOOTER_LINKS.map(({ href, label }) => (
                        <Link key={label} href={href} className="transition-colors hover:text-foreground" {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>
                            {label}
                        </Link>
                    ))}
                </nav>
                <OpenDevSocietyBranding />
            </footer>
        </div>
    );
}
