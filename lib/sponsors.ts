// Everything sponsor-related lives here: edit this file when someone starts or stops sponsoring.
// Perks only name placements the code actually renders (README, sponsor wall, site footer,
// landing page, in-app sidebar), so the page never promises something the site doesn't do.

export type Sponsor = {
    name: string;
    url: string;
    logo?: string;       // white/transparent logo in /public, shown on dark surfaces
    tier?: SponsorTierId;
    period?: string;     // e.g. "2026"
};

export type SponsorTierId = 'backer' | 'supporter' | 'company' | 'partner';

// Registered accounts on the hosted app (13K+ as of September 2026). Update from the user collection count.
export const REGISTERED_USERS = '13,000+';

// Partners share the app sidebar; the Partner tier sells exactly this many slots.
export const SIDEBAR_SPONSOR_SLOTS = 3;

export const SPONSOR_TIERS: {
    id: SponsorTierId;
    name: string;
    monthly: number;
    blurb: string;
    perks: string[];
    slots?: number;
    featured?: boolean;
}[] = [
    {
        id: 'backer', name: 'Backer', monthly: 5,
        blurb: 'For people who use OpenStock and want it to stay free.',
        perks: ['Your name in the README sponsor list', 'Our thanks, every month'],
    },
    {
        id: 'supporter', name: 'Supporter', monthly: 25,
        blurb: 'For regulars who want to be seen backing open source.',
        perks: ['Everything in Backer', 'Name and avatar on the sponsor wall', 'Listed on this page'],
    },
    {
        id: 'company', name: 'Company', monthly: 100, featured: true,
        blurb: 'For teams and products that reach developers and investors.',
        perks: ['Logo in the footer of every public page', 'Logo in the README', 'Logo on this page, linked to your site'],
    },
    {
        id: 'partner', name: 'Partner', monthly: 500, slots: SIDEBAR_SPONSOR_SLOTS,
        blurb: 'The most visible spots in OpenStock, limited to three.',
        perks: ['Everything in Company', `One of three sponsor slots in the app sidebar, seen by ${REGISTERED_USERS} registered users`, 'Logo on the landing page'],
    },
];

export const ACTIVE_SPONSORS: Sponsor[] = [];

export const PREVIOUS_SPONSORS: Sponsor[] = [
    { name: 'Siray.ai', url: 'https://www.siray.ai', logo: '/assets/icons/siray.svg', period: '2026' },
];

// Counted from GitHub Sponsors; individual sponsors stay anonymous unless they sponsor publicly.
export const SPONSOR_GOAL = { label: 'monthly sponsors', target: 1000, current: 1 };

export const SPONSOR_CONTACT_EMAIL = 'opendevsociety@gmail.com';

// Who receives sponsorships today (GitHub Sponsors is on the founder's personal account).
export const SPONSOR_RECIPIENT = { name: 'Ravi Pratap Singh', handle: 'ravixalgorithm', role: 'founder of Open Dev Society' };

// Where sponsorship money goes. Add `monthly` (USD) to a line once the real bill is known;
// the page then shows amounts and each line's share. Lines without it never show a figure.
export const FUNDING_USES: { label: string; detail: string; monthly?: number }[] = [
    { label: 'Hosting', detail: 'Vercel serves the app and site. Our traffic is past the free tier.' },
    { label: 'Market data', detail: 'Finnhub keys, so quotes stay fast for everyone and OpenStock Cloud can go live.' },
    { label: 'Database', detail: 'MongoDB Atlas for accounts, watchlists and alerts.' },
    { label: 'AI and email', detail: 'Gemini for welcome emails and the weekly digest, plus email delivery.' },
    { label: 'Maintenance', detail: 'Time to review community pull requests, fix bugs and ship features.' },
];

export const sidebarSponsors = () => ACTIVE_SPONSORS.filter((s) => s.tier === 'partner').slice(0, SIDEBAR_SPONSOR_SLOTS);
