import Link from "next/link";
import Image from "next/image";
import { Github } from "lucide-react";
import { formatCount, getRepoStats } from "@/lib/github";
import SiteFooter from "@/components/marketing/SiteFooter";
import UpdateBanner from "@/components/UpdateBanner";
import { REPO_URL } from "@/lib/constants";

// No session read here: it made every public page (and every <Link> prefetch of one) a function call.
// The header always shows the signed-out buttons; /sign-in and /sign-up send a signed-in visitor to /dashboard.
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
    const repo = await getRepoStats();

    return (
        <div className="min-h-dvh bg-page">
            {/* Padding on a wrapper, not margins on the banner: it's w-full, so margins pushed it 40px past the screen */}
            <div className="mx-auto max-w-[1200px] px-4 pt-3 sm:px-5">
                <UpdateBanner />
            </div>
            <header className="sticky top-0 z-40 border-b border-transparent bg-page/80 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-4 sm:gap-6 sm:px-5">
                    <Link href="/" aria-label="OpenStock home" className="shrink-0">
                        {/* Smaller on phones so the logo and both buttons fit on one row at 320px */}
                        <Image src="/assets/images/logo.png" alt="OpenStock" width={140} height={35} priority className="h-auto w-[104px] sm:w-[140px]" />
                    </Link>
                    {/* Not at md: the links plus the buttons are ~830px wide, past a 768px tablet */}
                    <nav className="hidden items-center gap-1 lg:flex">
                        {[['/#inside', 'Product'], ['/#data', 'Data'], ['/#self-host', 'Self-host'], ['/about', 'About']].map(([href, label]) => (
                            <Link key={href} href={href} className="side-item h-8 font-semibold">{label}</Link>
                        ))}
                        <Link href="/sponsor" className="side-item h-8 gap-2 font-semibold text-brand-ink hover:text-brand-ink">
                            <span className="live-dot" /> Sponsor
                        </Link>
                    </nav>
                    <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                        <a href={REPO_URL} target="_blank" rel="noreferrer" className="btn btn-ghost hidden h-9 px-3 sm:inline-flex" aria-label="OpenStock on GitHub">
                            <Github />
                            {repo && <span className="num">{formatCount(repo.stars)}</span>}
                        </a>
                        <Link href="/sign-in" className="btn h-9 px-2 text-muted-foreground hover:text-foreground sm:px-3">Sign in</Link>
                        <Link href="/sign-up" className="btn btn-primary h-9 px-3 sm:px-[14px]">Get started</Link>
                    </div>
                </div>
            </header>

            <main>{children}</main>

            <SiteFooter />
        </div>
    );
}
