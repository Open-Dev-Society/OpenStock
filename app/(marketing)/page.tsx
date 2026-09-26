import Link from "next/link";
import { Bell, CandlestickChart, Command, GitPullRequest, Github, Grid3x3, HeartHandshake, MailOpen, MessagesSquare, Star } from "lucide-react";
import { MarketDial, MarketStatus } from "@/components/landing/MarketClock";
import ProductPreview from "@/components/landing/ProductPreview";
import SectionHead from "@/components/marketing/SectionHead";
import IconCard from "@/components/marketing/IconCard";
import { getSession } from "@/lib/better-auth/auth";
import { formatCount, getRepoStats } from "@/lib/github";
import { cn } from "@/lib/utils";
import { DISCORD_URL, GOOD_FIRST_ISSUES_URL, REPO_URL } from "@/lib/constants";

const FEATURES = [
    { icon: CandlestickChart, title: 'Charts that move', body: 'TradingView candles, technicals and financials for any listed company, full screen when you need room.' },
    { icon: Bell, title: 'Alerts by email', body: 'With OpenStock Cloud, set a target above or below the price. We check every five minutes and write when it crosses.' },
    { icon: MessagesSquare, title: 'Sentiment in one read', body: 'Buzz and bullishness from Reddit, X.com, news and Polymarket, side by side for each stock.' },
    { icon: Grid3x3, title: 'The whole market', body: 'Sector heatmap, movers and top stories on one screen before the bell.' },
    { icon: Command, title: 'Find anything with ⌘K', body: 'Search every exchange Finnhub covers and open a stock as a tab, like a browser.' },
    { icon: MailOpen, title: 'A Monday digest', body: 'A short, AI-written summary of the week’s news for the stocks you watch.' },
];

const TIERS = [
    {
        name: 'Community', price: 'Free', cadence: 'Hourly', perHour: 1,
        body: 'This site. Quotes refresh every hour and are shared by everyone from the edge. Charts stay live.',
        cta: { label: 'Get started', href: '/sign-up' },
    },
    {
        name: 'OpenStock Cloud', price: '$5', per: '/month', tag: 'Coming soon', cadence: 'Every 15 seconds', perHour: 240,
        body: 'The same app with live quotes and email price alerts, hosted on a pool of market data keys. Nothing to set up.',
        cta: { label: 'Get notified on Discord', href: DISCORD_URL },
    },
    {
        name: 'Self-host', price: 'Free', cadence: 'Your call', perHour: 240,
        body: 'Run it on your own server with your own Finnhub keys: realtime quotes and alerts for you and your team.',
        cta: { label: 'Setup guide', href: '#self-host' },
    },
];

const SUPPORT = [
    {
        icon: HeartHandshake, title: 'Sponsor', primary: true,
        body: 'Monthly tiers from $5, a one-time gift, or a custom partnership. Sponsors are shown on this site, in the app and in the README.',
        cta: { label: 'See sponsor tiers', href: '/sponsor' },
    },
    {
        icon: GitPullRequest, title: 'Contribute',
        body: 'Pick a good first issue, improve the docs or design a screen. Every merged pull request keeps OpenStock moving.',
        cta: { label: 'Good first issues', href: GOOD_FIRST_ISSUES_URL },
    },
    {
        icon: Star, title: 'Spread the word',
        body: 'Star the repo and share it with someone paying for a terminal they barely use.',
        cta: { label: 'Star on GitHub', href: REPO_URL },
    },
];

// 60 minutes of updates drawn as ticks: one line per refresh.
const CadenceRail = ({ perHour }: { perHour: number }) => (
    <div
        className="h-7 rounded-md bg-page shadow-[inset_0_0_0_1px_var(--line)]"
        style={{
            backgroundImage: perHour > 1
                ? `repeating-linear-gradient(90deg, var(--brand) 0 1px, transparent 1px calc(100% / ${perHour}))`
                : 'linear-gradient(90deg, var(--brand) 0 2px, transparent 2px)',
        }}
        aria-hidden
    />
);

export default async function LandingPage() {
    const [session, repo] = await Promise.all([getSession(), getRepoStats()]);
    const start = session?.user ? { href: '/dashboard', label: 'Open dashboard' } : { href: '/sign-up', label: 'Get started free' };

    return (
        <>
            <section className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 pt-14 md:pt-20 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div>
                    <MarketStatus />
                    <h1 className="mt-6 text-[44px] font-bold leading-[1.02] tracking-[-0.05em] md:text-[68px]">
                        Markets, minus<br />the paywall.
                    </h1>
                    <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
                        OpenStock is an open-source alternative to expensive market platforms. Track prices, watch the whole market and dig into
                        company insights, built openly, for everyone.
                    </p>
                    <div className="mt-8 flex flex-wrap items-center gap-2">
                        <Link href={start.href} className="btn btn-primary h-11 px-5 text-[15px]">{start.label}</Link>
                        <a href={REPO_URL} target="_blank" rel="noreferrer" className="btn btn-ghost h-11 px-5 text-[15px]">
                            <Github /> Self-host it
                            {repo && <span className="num text-faint">{formatCount(repo.stars)} stars</span>}
                        </a>
                    </div>
                </div>
                <div className="hatch">
                    <div className="card px-6 pb-5 pt-6"><MarketDial /></div>
                </div>
            </section>

            <section className="mx-auto mt-16 max-w-[1200px] px-5">
                <ProductPreview />
            </section>

            <section id="inside" className="mx-auto mt-28 max-w-[1200px] scroll-mt-24 px-5">
                <SectionHead kicker="What's inside" title="A terminal for people who aren't at a bank." sub="Everything you need to follow the market, in one place, without a subscription." />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {FEATURES.map(({ icon, title, body }) => (
                        <IconCard key={title} icon={icon} title={title}>{body}</IconCard>
                    ))}
                </div>
            </section>

            <section id="data" className="mx-auto mt-28 max-w-[1200px] scroll-mt-24 px-5">
                <SectionHead
                    kicker="Data"
                    title="Pick how fresh your numbers are."
                    sub="Charts always stream live from TradingView. Quotes, watchlists and alerts come from Finnhub, and this is how often they update."
                />
                <div className="grid gap-3 lg:grid-cols-3">
                    {TIERS.map((tier) => (
                        <div key={tier.name} className="hatch">
                            <div className="card flex h-full flex-col gap-4 p-5">
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-[18px] font-bold tracking-[-0.02em]">{tier.name}</h3>
                                    {tier.tag && <span className="pill is-brand">{tier.tag}</span>}
                                </div>
                                <p className="bento-value text-[30px]">{tier.price}{tier.per && <small className="text-faint"> {tier.per}</small>}</p>
                                <p className="text-[14px] leading-relaxed text-muted-foreground">{tier.body}</p>
                                <div className="mt-auto flex flex-col gap-2">
                                    <CadenceRail perHour={tier.perHour} />
                                    <p className="num flex justify-between text-[12px] text-faint">
                                        <span>{tier.cadence}</span>
                                        <span>{tier.perHour} {tier.perHour === 1 ? 'update' : 'updates'} an hour</span>
                                    </p>
                                </div>
                                <Link
                                    href={tier.cta.href}
                                    className={cn('btn', tier.name === 'Community' ? 'btn-primary' : 'btn-ghost')}
                                    {...(tier.cta.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
                                >
                                    {tier.cta.label}
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section id="self-host" className="mx-auto mt-28 grid max-w-[1200px] scroll-mt-24 items-start gap-10 px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                <div>
                    <SectionHead
                        kicker="Self-host"
                        title="Your server, your keys, live quotes."
                        sub="Add as many free Finnhub keys as you like: each one adds 60 requests a minute. Switch the data mode to realtime and prices refresh every 15 seconds."
                    />
                    <a href={`${REPO_URL}#docker-setup`} target="_blank" rel="noreferrer" className="btn btn-ghost">Full setup in the README</a>
                </div>
                <div className="hatch">
                    <pre className="card mono overflow-x-auto p-5 text-[13px] leading-7 text-muted-foreground">
                        <span className="text-faint">$ </span><span className="text-foreground">git clone {REPO_URL}.git</span>{'\n'}
                        <span className="text-faint">$ </span><span className="text-foreground">cd OpenStock</span>{'\n\n'}
                        <span className="text-faint"># .env (every variable is in the README)</span>{'\n'}
                        <span className="text-brand-ink">FINNHUB_API_KEYS</span>=key_one,key_two,key_three{'\n'}
                        <span className="text-brand-ink">NEXT_PUBLIC_OPENSTOCK_DATA_MODE</span>=realtime{'\n\n'}
                        <span className="text-faint">$ </span><span className="text-foreground">docker compose up -d --build</span>
                    </pre>
                </div>
            </section>

            <section id="sponsor" className="mx-auto mt-28 max-w-[1200px] scroll-mt-24 px-5">
                <SectionHead
                    kicker="Support"
                    title="OpenStock is open for sponsors."
                    sub="It stays free because people and companies back it. Pay what you can, or give time instead."
                />
                <div className="grid gap-3 lg:grid-cols-3">
                    {SUPPORT.map(({ icon, title, body, cta, primary }) => (
                        <IconCard
                            key={title}
                            icon={icon}
                            title={title}
                            footer={
                                <a href={cta.href} {...(cta.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})} className={cn('btn w-full', primary ? 'btn-primary' : 'btn-ghost')}>
                                    {cta.label}
                                </a>
                            }
                        >
                            {body}
                        </IconCard>
                    ))}
                </div>
            </section>

            <section className="mx-auto mt-28 max-w-[1200px] px-5">
                <div className="hatch">
                    <div className="card grid gap-10 p-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:p-12">
                        <div>
                            <p className="kicker text-brand-ink">Open Dev Society</p>
                            <blockquote className="mt-4 text-[26px] font-semibold leading-snug tracking-[-0.03em] md:text-[30px]">
                                Technology should belong to everyone. Knowledge should be open, free, and accessible.
                            </blockquote>
                            <div className="mt-8 flex flex-wrap gap-2">
                                <Link href={start.href} className="btn btn-primary h-11 px-5 text-[15px]">{start.label}</Link>
                                <Link href="/about" className="btn btn-ghost h-11 px-5 text-[15px]">Read the manifesto</Link>
                            </div>
                        </div>
                        {repo && (
                            <dl className="grid grid-cols-2 content-end gap-3">
                                {[
                                    ['Stars', formatCount(repo.stars)],
                                    ['Forks', formatCount(repo.forks)],
                                    ['License', repo.license ?? 'AGPL-3.0'],
                                    ['Written in', 'TypeScript'],
                                ].map(([label, value]) => (
                                    <div key={label} className="bento-tile col-span-1 bg-page">
                                        <dt className="kicker">{label}</dt>
                                        <dd className="bento-value text-[26px]">{value}</dd>
                                    </div>
                                ))}
                            </dl>
                        )}
                    </div>
                </div>
            </section>
        </>
    );
}
