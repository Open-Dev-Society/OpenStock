import Link from "next/link";
import { ACTIVE_SPONSORS, PREVIOUS_SPONSORS, SPONSOR_CONTACT_EMAIL, SPONSOR_TIERS, type Sponsor } from "@/lib/sponsors";
import { cn } from "@/lib/utils";

const SponsorMark = ({ sponsor, muted }: { sponsor: Sponsor; muted?: boolean }) => (
    <a
        href={sponsor.url}
        target="_blank"
        rel="noreferrer"
        title={sponsor.name}
        className={cn(
            'flex h-14 min-w-[140px] items-center justify-center gap-2 rounded-[12px] bg-page px-5 shadow-[inset_0_0_0_1px_var(--line)] transition-opacity',
            muted ? 'opacity-55 grayscale hover:opacity-90' : 'hover:opacity-90',
        )}
    >
        {sponsor.logo ? <img src={sponsor.logo} alt={sponsor.name} className="h-6 w-auto" /> : <span className="font-bold">{sponsor.name}</span>}
        {muted && sponsor.period && <span className="num text-[11px] text-faint">{sponsor.period}</span>}
    </a>
);

// Open slots are real: each one is a tier someone can take today.
const OpenSlot = ({ tier }: { tier: string }) => (
    <Link
        href="/sponsor#tiers"
        className="flex h-14 min-w-[140px] items-center justify-center rounded-[12px] px-5 text-[13px] font-semibold text-faint transition-colors hover:text-brand-ink"
        style={{ backgroundImage: 'repeating-linear-gradient(-45deg, oklch(0.4 0.01 95 / 0.22) 0 1px, transparent 1px 5px)', boxShadow: 'inset 0 0 0 1px var(--line)' }}
    >
        {tier} slot open
    </Link>
);

export default function SponsorsBand() {
    // Only Company and Partner tiers include a footer logo (see the placements on /sponsor)
    const logoSponsors = ACTIVE_SPONSORS.filter((s) => s.tier === 'company' || s.tier === 'partner');
    const openTiers = SPONSOR_TIERS.filter((t) => t.id === 'company' || t.id === 'partner')
        .filter((t) => !t.slots || ACTIVE_SPONSORS.filter((s) => s.tier === t.id).length < t.slots);

    return (
        <section className="mx-auto mt-24 max-w-[1200px] px-5" aria-labelledby="sponsors-band">
            <div className="hatch">
                <div className="card grid items-center gap-8 p-6 md:p-8 lg:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="flex min-w-0 flex-col gap-5">
                        <div>
                            <p className="kicker flex items-center gap-2 text-brand-ink"><span className="live-dot" /> Open for sponsors</p>
                            <h2 id="sponsors-band" className="mt-2 text-[24px] font-bold tracking-[-0.03em]">Keep market data free for everyone.</h2>
                        </div>

                        <div className="flex flex-col gap-2">
                            <p className="kicker">Current sponsors</p>
                            <div className="flex flex-wrap gap-2">
                                {logoSponsors.map((s) => <SponsorMark key={s.name} sponsor={s} />)}
                                {openTiers.map((t) => <OpenSlot key={t.id} tier={t.name} />)}
                            </div>
                        </div>

                        {PREVIOUS_SPONSORS.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <p className="kicker">Previously backed by</p>
                                <div className="flex flex-wrap gap-2">
                                    {PREVIOUS_SPONSORS.map((s) => <SponsorMark key={s.name} sponsor={s} muted />)}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2 lg:flex-col">
                        <Link href="/sponsor" className="btn btn-primary h-11 px-5 text-[15px]">Become a sponsor</Link>
                        <a href={`mailto:${SPONSOR_CONTACT_EMAIL}?subject=Sponsoring%20OpenStock`} className="btn btn-ghost h-11 px-5 text-[15px]">Talk with us</a>
                    </div>
                </div>
            </div>
        </section>
    );
}
