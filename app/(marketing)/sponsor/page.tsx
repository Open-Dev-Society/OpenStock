import { Check, Cloud, HandCoins, MessageCircle, Minus, Users } from "lucide-react";
import IconCard from "@/components/marketing/IconCard";
import { getRepoStats, formatCount } from "@/lib/github";
import { DISCORD_URL, sponsorCheckoutUrl } from "@/lib/constants";
import { ACTIVE_SPONSORS, FUNDING_USES, REGISTERED_USERS, SPONSOR_CONTACT_EMAIL, SPONSOR_GOAL, SPONSOR_RECIPIENT, SPONSOR_TIERS, type SponsorTierId } from "@/lib/sponsors";
import { cn } from "@/lib/utils";

export const metadata = {
    title: 'Sponsor OpenStock',
    description: 'Back free, open-source market data. Monthly tiers, one-time gifts, or talk with us about a partnership.',
};

const MAILTO = `mailto:${SPONSOR_CONTACT_EMAIL}?subject=Sponsoring%20OpenStock`;

// Where each tier shows up. Mirrors the perks in lib/sponsors.ts.
const PLACEMENTS: { label: string; from: SponsorTierId }[] = [
    { label: 'Name in the README sponsor list', from: 'backer' },
    { label: 'Name and avatar on the sponsor wall', from: 'supporter' },
    { label: 'Logo in the footer of every public page', from: 'company' },
    { label: 'Logo in the README', from: 'company' },
    { label: 'Logo on the landing page', from: 'partner' },
    { label: 'Sponsor slot in the app sidebar', from: 'partner' },
];
const TIER_ORDER: SponsorTierId[] = ['backer', 'supporter', 'company', 'partner'];

const FAQ = [
    ['How do I pay?', 'Through GitHub Sponsors, by card or PayPal. Pick a monthly amount or give once.'],
    ['Can I stop?', 'Yes, any time from your GitHub Sponsors settings.'],
    ['Can we sponsor as a company?', 'Yes. Sponsor from your organisation’s GitHub account, then send us your logo and link. For invoices or a custom deal, talk with us.'],
];

export default async function SponsorPage() {
    const repo = await getRepoStats();
    const goalPercent = Math.min(100, (SPONSOR_GOAL.current / SPONSOR_GOAL.target) * 100);
    const fundingTotal = FUNDING_USES.reduce((sum, use) => sum + (use.monthly ?? 0), 0);

    return (
        <div className="mx-auto max-w-[1200px] px-5">
            <section className="grid items-end gap-10 pt-14 md:pt-20 lg:grid-cols-[minmax(0,1fr)_380px]">
                <div>
                    <p className="kicker flex items-center gap-2 text-brand-ink"><span className="live-dot" /> Open for sponsors</p>
                    <h1 className="mt-4 text-[44px] font-bold leading-[1.02] tracking-[-0.05em] md:text-[64px]">Back free<br />market data.</h1>
                    <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
                        OpenStock is an open-source market terminal used by {REGISTERED_USERS} registered people{repo ? `, with ${formatCount(repo.stars)} stars on GitHub` : ''}.
                        Sponsors keep it free and independent for everyone who can’t pay for a terminal.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-2">
                        <a href="#tiers" className="btn btn-primary h-11 px-5 text-[15px]">See tiers</a>
                        <a href={MAILTO} className="btn btn-ghost h-11 px-5 text-[15px]">Talk with us</a>
                    </div>
                </div>

                <div className="hatch">
                    <div className="card flex flex-col gap-4 p-5">
                        <div className="flex items-baseline justify-between gap-3">
                            <p className="kicker">Goal</p>
                            <p className="num text-[13px] text-faint">{SPONSOR_GOAL.current} of {SPONSOR_GOAL.target.toLocaleString('en-US')}</p>
                        </div>
                        <p className="text-[20px] font-bold tracking-[-0.02em]">{SPONSOR_GOAL.target.toLocaleString('en-US')} {SPONSOR_GOAL.label}</p>
                        <div className="h-2.5 overflow-hidden rounded-full bg-page shadow-[inset_0_0_0_1px_var(--line)]" role="progressbar" aria-valuenow={SPONSOR_GOAL.current} aria-valuemax={SPONSOR_GOAL.target}>
                            <div className="h-full rounded-full bg-brand" style={{ width: `max(${goalPercent}%, 6px)` }} />
                        </div>
                        {repo && (
                            <dl className="grid grid-cols-3 gap-2">
                                {[['Users', REGISTERED_USERS.replace(',000', 'K')], ['Stars', formatCount(repo.stars)], ['Forks', formatCount(repo.forks)]].map(([label, value]) => (
                                    <div key={label} className="rounded-[12px] bg-page px-3.5 py-3 shadow-[inset_0_0_0_1px_var(--line)]">
                                        <dt className="kicker">{label}</dt>
                                        <dd className="bento-value mt-1 text-[22px]">{value}</dd>
                                    </div>
                                ))}
                            </dl>
                        )}
                    </div>
                </div>
            </section>

            <section id="tiers" className="mt-24 scroll-mt-24">
                <p className="kicker text-brand-ink">Monthly</p>
                <h2 className="mt-2 text-[32px] font-bold tracking-[-0.04em] md:text-[40px]">Pick a tier.</h2>

                <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {SPONSOR_TIERS.map((tier) => {
                        const filled = ACTIVE_SPONSORS.filter((s) => s.tier === tier.id).length;
                        const taken = tier.slots ? filled >= tier.slots : false;
                        return (
                            <div key={tier.id} className={cn('hatch', tier.featured && 'shadow-[0_0_0_1px_oklch(0.8_0.13_176/0.45),0_6px_18px_oklch(0_0_0/0.22)]')}>
                                <div className="card flex h-full flex-col gap-4 p-5">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="text-[17px] font-bold tracking-[-0.02em]">{tier.name}</h3>
                                        {tier.featured && <span className="pill is-brand">Best for teams</span>}
                                        {tier.slots && <span className={cn('pill', !taken && 'is-up')}>{taken ? 'All taken' : `${tier.slots - filled} of ${tier.slots} open`}</span>}
                                    </div>
                                    <p className="bento-value text-[36px]"><small>$</small>{tier.monthly}<small className="text-faint"> /month</small></p>
                                    <p className="text-[14px] leading-relaxed text-muted-foreground">{tier.blurb}</p>
                                    <ul className="flex flex-col gap-2 text-[13.5px]">
                                        {tier.perks.map((perk) => (
                                            <li key={perk} className="flex gap-2">
                                                <Check className="mt-0.5 size-4 flex-none text-brand-ink" />
                                                <span>{perk}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <a
                                        href={taken ? MAILTO : sponsorCheckoutUrl(tier.monthly)}
                                        target={taken ? undefined : '_blank'}
                                        rel="noreferrer"
                                        className={cn('btn mt-auto', tier.featured ? 'btn-primary' : 'btn-ghost')}
                                    >
                                        {taken ? 'Join the waitlist' : `Sponsor $${tier.monthly}/month`}
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="hatch">
                        <div className="card flex h-full flex-col gap-3 p-5 sm:flex-row sm:items-center">
                            <span className="bento-ico size-10 bg-brand-soft text-brand-ink"><HandCoins className="size-5" /></span>
                            <div className="flex-1">
                                <h3 className="text-[16px] font-bold">Give once</h3>
                                <p className="text-[14px] text-muted-foreground">Any amount, one time, through GitHub Sponsors.</p>
                            </div>
                            <a href={sponsorCheckoutUrl(undefined, 'one-time')} target="_blank" rel="noreferrer" className="btn btn-ghost">Give once</a>
                        </div>
                    </div>
                    <div className="hatch">
                        <div className="card flex h-full flex-col gap-3 p-5 sm:flex-row sm:items-center">
                            <span className="bento-ico size-10 bg-brand-soft text-brand-ink"><MessageCircle className="size-5" /></span>
                            <div className="flex-1">
                                <h3 className="text-[16px] font-bold">Something else in mind?</h3>
                                <p className="text-[14px] text-muted-foreground">Data or infrastructure credits, a custom placement or a partnership.</p>
                            </div>
                            <div className="flex gap-2">
                                <a href={MAILTO} className="btn btn-primary">Talk with us</a>
                                <a href={DISCORD_URL} target="_blank" rel="noreferrer" className="btn btn-ghost">Discord</a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mt-24">
                <p className="kicker text-brand-ink">Transparency</p>
                <h2 className="mt-2 text-[28px] font-bold tracking-[-0.04em] md:text-[34px]">Where your money goes.</h2>
                <p className="mt-3 max-w-2xl text-[16px] text-muted-foreground">
                    Sponsorships are paid through GitHub Sponsors to {SPONSOR_RECIPIENT.name}{' '}
                    (<a href={`https://github.com/${SPONSOR_RECIPIENT.handle}`} target="_blank" rel="noreferrer" className="font-semibold text-brand-ink hover:underline">@{SPONSOR_RECIPIENT.handle}</a>),{' '}
                    {SPONSOR_RECIPIENT.role}, and pay for keeping OpenStock free:
                </p>
                <div className="hatch mt-8">
                    <div className="card row-list">
                        {FUNDING_USES.map((use, i) => (
                            <div key={use.label} className="grid gap-1 px-5 py-4 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-center sm:gap-6">
                                <span className="flex items-center gap-3 font-bold">
                                    <span className="mono text-[12px] text-faint">{String(i + 1).padStart(2, '0')}</span>
                                    {use.label}
                                </span>
                                <span className="text-muted-foreground">{use.detail}</span>
                                {fundingTotal > 0 && (
                                    <span className="num text-right font-semibold">
                                        {use.monthly ? `$${use.monthly}/mo · ${Math.round((use.monthly / fundingTotal) * 100)}%` : '—'}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                {fundingTotal > 0 && (
                    <p className="num mt-4 text-muted-foreground">
                        {FUNDING_USES.every((use) => use.monthly)
                            ? <>Running OpenStock costs about <b className="text-foreground">${fundingTotal} a month</b>.</>
                            : <>Known costs so far: <b className="text-foreground">${fundingTotal} a month</b>.</>}
                    </p>
                )}

                <div className="mt-10 grid gap-3 md:grid-cols-2">
                    <IconCard icon={Cloud} title="OpenStock Cloud will pay for hosting">
                        Cloud ($5 a month, coming soon) adds live quotes and price alerts. Its subscribers will cover the servers, database and
                        market data the hosted app needs, so the free site stays online without depending on donations.
                    </IconCard>
                    <IconCard icon={Users} title="Sponsors keep the community moving">
                        Sponsorships pay for the time behind OpenStock: reviewing community pull requests, fixing bugs and shipping features
                        at the pace {REGISTERED_USERS} people expect, with the core free for everyone.
                    </IconCard>
                </div>
            </section>

            <section className="mt-24">
                <p className="kicker text-brand-ink">Placements</p>
                <h2 className="mt-2 text-[28px] font-bold tracking-[-0.04em] md:text-[34px]">Where your name shows up.</h2>
                <div className="hatch mt-8">
                    <div className="card overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Placement</th>
                                    {TIER_ORDER.map((id) => <th key={id} className="text-center">{SPONSOR_TIERS.find((t) => t.id === id)!.name}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {PLACEMENTS.map(({ label, from }) => (
                                    <tr key={label}>
                                        <td className="font-semibold text-foreground">{label}</td>
                                        {TIER_ORDER.map((id) => (
                                            <td key={id} className="text-center">
                                                {TIER_ORDER.indexOf(id) >= TIER_ORDER.indexOf(from)
                                                    ? <Check className="mx-auto size-4 text-brand-ink" aria-label="Included" />
                                                    : <Minus className="mx-auto size-4 text-line-strong" aria-label="Not included" />}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="mt-24 grid gap-3 md:grid-cols-3">
                {FAQ.map(([q, a]) => (
                    <div key={q} className="hatch">
                        <div className="card h-full p-5">
                            <h3 className="font-bold">{q}</h3>
                            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{a}</p>
                        </div>
                    </div>
                ))}
            </section>
        </div>
    );
}
