import Image from "next/image";
import Link from "next/link";
import { Github, Linkedin } from "lucide-react";
import SponsorsBand from "@/components/sponsors/SponsorsBand";
import { DISCORD_URL, REPO_URL } from "@/lib/constants";

const LINKEDIN_URL = 'https://www.linkedin.com/company/opendevsociety-in/';
const ODS_URL = 'https://opendevsociety.org';

const PRODUCT_LINKS = [
    { href: '/s', label: 'Stocks' },
    { href: '/compare', label: 'Guides' },
    { href: '/changelog', label: 'Changelog' },
    { href: '/api-docs', label: 'Architecture' },
] as const;

const COMMUNITY_LINKS = [
    { href: '/love', label: 'Wall of love' },
    { href: '/sponsor', label: 'Sponsor' },
    { href: REPO_URL, label: 'GitHub' },
    { href: DISCORD_URL, label: 'Discord' },
] as const;

const COMPANY_LINKS = [
    { href: '/about', label: 'About' },
    { href: '/help', label: 'Help' },
    { href: '/terms', label: 'Terms' },
] as const;

const SOCIAL = [
    { href: REPO_URL, label: 'OpenStock on GitHub', icon: Github },
    { href: DISCORD_URL, label: 'Open Dev Society on Discord', icon: DiscordIcon },
    { href: LINKEDIN_URL, label: 'Open Dev Society on LinkedIn', icon: Linkedin },
] as const;

const linkClass = 'text-[14px] font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 focus-visible:ring-offset-2 focus-visible:ring-offset-side rounded-[4px]';

const FooterLink = ({ href, label }: { href: string; label: string }) => {
    const external = href.startsWith('http');
    return (
        <Link
            href={href}
            className={linkClass}
            {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
        >
            {label}
        </Link>
    );
};

const LinkColumn = ({ title, links }: { title: string; links: readonly { href: string; label: string }[] }) => (
    <nav aria-label={title} className="flex flex-col gap-3">
        <p className="kicker">{title}</p>
        <ul className="flex flex-col gap-2.5">
            {links.map((link) => (
                <li key={link.label}>
                    <FooterLink {...link} />
                </li>
            ))}
        </ul>
    </nav>
);

function DiscordIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
            <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.11 13.11 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.363 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.211 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418m7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418" />
        </svg>
    );
}

export default function SiteFooter() {
    return (
        <footer className="mt-24 border-t border-line bg-side">
            <div className="mx-auto max-w-[1200px] px-5">
                <div className="border-b border-line py-10 md:py-12">
                    <SponsorsBand />
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-10 py-12 lg:grid-cols-[minmax(0,260px)_repeat(3,minmax(0,1fr))] lg:gap-x-16">
                    <div className="col-span-2 flex max-w-sm flex-col gap-5 lg:col-span-1">
                        <Link href="/" aria-label="OpenStock home" className="w-fit rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 focus-visible:ring-offset-2 focus-visible:ring-offset-side">
                            <Image src="/assets/images/logo.png" alt="OpenStock" width={132} height={33} />
                        </Link>
                        <p className="text-[14px] leading-relaxed text-muted-foreground">
                            A free, open-source alternative to expensive market platforms.
                        </p>
                        <ul className="flex items-center gap-1.5">
                            {SOCIAL.map(({ href, label, icon: Icon }) => (
                                <li key={label}>
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noreferrer"
                                        aria-label={label}
                                        className="icon-btn shadow-[inset_0_0_0_1px_var(--line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 focus-visible:ring-offset-2 focus-visible:ring-offset-side"
                                    >
                                        <Icon />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <LinkColumn title="Product" links={PRODUCT_LINKS} />
                    <LinkColumn title="Community" links={COMMUNITY_LINKS} />
                    <LinkColumn title="Company" links={COMPANY_LINKS} />
                </div>

                <div className="flex flex-col gap-4 border-t border-line py-6 pb-8 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[13px] text-faint">© {new Date().getFullYear()} Open Dev Society · AGPL-3.0</p>
                    <a
                        href={ODS_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-fit shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] px-3 py-1.5 text-[13px] font-semibold text-muted-foreground shadow-[inset_0_0_0_1px_var(--line)] transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 focus-visible:ring-offset-2 focus-visible:ring-offset-side"
                    >
                        <img src="/assets/icons/odsLogo.svg" alt="" width={22} height={22} className="size-[22px]" />
                        An Open Dev Society initiative
                    </a>
                </div>
            </div>
        </footer>
    );
}
