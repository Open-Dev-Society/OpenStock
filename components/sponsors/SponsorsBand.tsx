import Link from "next/link";
import type { ReactNode } from "react";
import { ACTIVE_SPONSORS, PREVIOUS_SPONSORS, SPONSOR_CONTACT_EMAIL, SPONSOR_TIERS, SUPPORTERS, TIER_COLOR, tierBorder, type Sponsor, type SponsorTierId } from "@/lib/sponsors";
import { cn } from "@/lib/utils";

const tile = 'flex h-14 items-center rounded-[12px] transition-opacity hover:opacity-90';
// Outline, not an inset shadow, so the tier colour also draws over full-bleed banners
const ring = (tier: SponsorTierId) => ({ outline: `1px solid ${tierBorder(tier)}`, outlineOffset: -1 });

const SponsorMark = ({ sponsor, tier, muted }: { sponsor: Sponsor; tier: SponsorTierId; muted?: boolean }) => (
    <a href={sponsor.url} target="_blank" rel="noreferrer" title={sponsor.name} style={ring(tier)}
        className={cn(tile, sponsor.banner ? 'overflow-hidden' : 'min-w-[140px] justify-center gap-2 bg-page px-5')}>
        {sponsor.banner ? <img src={sponsor.banner} alt={sponsor.name} className="h-full w-auto" /> : (
            <span className={cn('flex items-center gap-2', muted && 'opacity-55 grayscale')}>
                {sponsor.logo && <img src={sponsor.logo} alt={sponsor.iconOnly ? '' : sponsor.name} className="h-6 w-auto" />}
                {(!sponsor.logo || sponsor.iconOnly) && <span className="font-bold">{sponsor.name}</span>}
                {muted && sponsor.period && <span className="num text-[11px] text-faint">{sponsor.period}</span>}
            </span>
        )}
    </a>
);

const Person = ({ name, login }: { name: string; login: string }) => (
    <a href={`https://github.com/${login}`} target="_blank" rel="noreferrer" style={ring('supporter')} className={cn(tile, 'gap-2.5 bg-page px-4')}>
        <img src={`https://github.com/${login}.png?size=64`} alt="" width={28} height={28} loading="lazy" className="size-7 rounded-full opacity-80 grayscale" />
        <span className="text-[14px] font-semibold text-muted-foreground">{name}</span>
    </a>
);

// Open slots are real: each one is a tier someone can take today.
const OpenSlot = ({ tier, label }: { tier: SponsorTierId; label: string }) => (
    <Link
        href="/sponsor#tiers"
        className="flex h-14 min-w-[140px] items-center justify-center rounded-[12px] px-5 text-[13px] font-semibold text-faint transition-colors hover:text-brand-ink"
        style={{ backgroundImage: 'repeating-linear-gradient(-45deg, oklch(0.4 0.01 95 / 0.22) 0 1px, transparent 1px 5px)', ...ring(tier), outlineStyle: 'dashed' }}
    >
        {label}
    </Link>
);

const tierName = (id: SponsorTierId) => SPONSOR_TIERS.find((t) => t.id === id)!.name;

const Group = ({ tier, limited, children }: { tier: SponsorTierId; limited?: boolean; children: ReactNode }) => (
    <div className="flex flex-col gap-1.5">
        <p className="kicker text-[10px]" style={{ color: TIER_COLOR[tier] }}>{tierName(tier)}{limited && ' (limited)'}</p>
        <div className="flex flex-wrap gap-2">{children}</div>
    </div>
);

export default function SponsorsBand() {
    // Only Company and Partner tiers include a footer logo (see the placements on /sponsor)
    const current = (['partner', 'company'] as const).map((id) => {
        const tier = SPONSOR_TIERS.find((t) => t.id === id)!;
        const sponsors = ACTIVE_SPONSORS.filter((s) => s.tier === id);
        // A limited tier shows every free slot; an unlimited one shows a single invite
        return { id, sponsors, limited: !!tier.slots, open: tier.slots ? Math.max(0, tier.slots - sponsors.length) : 1, openLabel: tier.slots ? 'Slot open' : 'Add yours' };
    });
    // Past sponsors without a recorded tier sit with the partners rather than disappearing
    const previous = (['partner', 'company'] as const)
        .map((id) => ({ id, sponsors: PREVIOUS_SPONSORS.filter((s) => (s.tier ?? 'partner') === id) }))
        .filter((g) => g.sponsors.length > 0);

    return (
        <section className="mx-auto mt-24 max-w-[1200px] px-5" aria-labelledby="sponsors-band">
            <div className="hatch">
                <div className="card grid items-center gap-8 p-6 md:p-8 lg:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="flex min-w-0 flex-col gap-6">
                        <div>
                            <p className="kicker flex items-center gap-2 text-brand-ink"><span className="live-dot" /> Open for sponsors</p>
                            <h2 id="sponsors-band" className="mt-2 text-[24px] font-bold tracking-[-0.03em]">Keep market data free for everyone.</h2>
                        </div>

                        <div className="flex flex-col gap-2.5">
                            <p className="kicker">Current sponsors</p>
                            <div className="flex flex-col gap-4">
                                {current.map((g) => (
                                    <Group key={g.id} tier={g.id} limited={g.limited}>
                                        {g.sponsors.map((s) => <SponsorMark key={s.name} sponsor={s} tier={g.id} />)}
                                        {Array.from({ length: g.open }, (_, i) => <OpenSlot key={i} tier={g.id} label={g.openLabel} />)}
                                    </Group>
                                ))}
                            </div>
                        </div>

                        {(previous.length > 0 || SUPPORTERS.length > 0) && (
                            <div className="flex flex-col gap-2.5">
                                <p className="kicker">Previously backed by</p>
                                <div className="flex flex-wrap gap-x-6 gap-y-4">
                                    {previous.map((g) => (
                                        <Group key={g.id} tier={g.id}>
                                            {g.sponsors.map((s) => <SponsorMark key={s.name} sponsor={s} tier={g.id} muted />)}
                                        </Group>
                                    ))}
                                    {SUPPORTERS.length > 0 && (
                                        <Group tier="supporter">
                                            {SUPPORTERS.map((p) => <Person key={p.login} {...p} />)}
                                        </Group>
                                    )}
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
