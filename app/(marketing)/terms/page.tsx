import { Metadata } from 'next';
import { AlertTriangle, Check, X } from 'lucide-react';
import PageHero from '@/components/marketing/PageHero';
import SectionHead from '@/components/marketing/SectionHead';

export const metadata: Metadata = {
    title: 'Terms of Service | OpenStock',
    description: 'Fair, transparent, and open terms for our community.',
};

const PROMISES = [
    'Core features will remain free forever.',
    'We will never sell your personal data.',
    'Terms changes will be discussed openly.',
    'You own your watchlists and analysis.',
];

const RULES = {
    do: ['Share knowledge freely', 'Use the API for personal projects', 'Respect other members'],
    dont: ['Scrape data excessively', 'Share API keys', 'Use OpenStock for high-frequency trading'],
};

export default function TermsPage() {
    return (
        <>
            <PageHero
                kicker="Terms · Last updated October 2025"
                title="Terms of Service"
                sub="Built on trust, transparency and community values. No hidden gotchas, just clear rules."
            />

            <section className="mx-auto mt-14 max-w-[1200px] px-5">
                <div className="hatch">
                    <div className="card flex gap-4 p-6 shadow-[inset_0_0_0_1px_oklch(0.76_0.119_70/0.35)]">
                        <AlertTriangle className="mt-0.5 size-5 flex-none text-warn" />
                        <div>
                            <h2 className="font-bold text-warn">Investment disclaimer</h2>
                            <p className="mt-2 max-w-3xl leading-relaxed text-muted-foreground">
                                <strong className="text-foreground">OpenStock is an educational and analysis tool, not a financial advisor.</strong>{' '}
                                Data is provided as is, for information only. Never invest money you cannot afford to lose. Always do your own
                                research or consult a certified professional before making financial decisions.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto mt-20 max-w-[1200px] px-5">
                <SectionHead kicker="Our promise" title="What you can count on." />
                <div className="grid gap-3 sm:grid-cols-2">
                    {PROMISES.map((promise) => (
                        <div key={promise} className="hatch">
                            <div className="card flex h-full items-center gap-3 p-5">
                                <span className="bento-ico bg-brand-soft text-brand-ink"><Check /></span>
                                <span className="font-semibold">{promise}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mx-auto mt-20 max-w-[1200px] px-5">
                <SectionHead kicker="Community rules" title="Do’s and don’ts." />
                <div className="grid gap-3 md:grid-cols-2">
                    {([['Do', RULES.do, Check, 'text-up'], ['Don’t', RULES.dont, X, 'text-down']] as const).map(([title, items, Icon, tone]) => (
                        <div key={title} className="hatch">
                            <div className="card h-full p-5">
                                <h3 className="kicker">{title}</h3>
                                <ul className="mt-3 flex flex-col gap-2.5">
                                    {items.map((item) => (
                                        <li key={item} className="flex items-center gap-2.5">
                                            <Icon className={`size-4 flex-none ${tone}`} />
                                            <span className="text-muted-foreground">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="mt-8 text-muted-foreground">
                    Questions about these terms? Email <a href="mailto:opendevsociety@gmail.com" className="font-semibold text-brand-ink hover:underline">opendevsociety@gmail.com</a>.
                </p>
            </section>
        </>
    );
}
