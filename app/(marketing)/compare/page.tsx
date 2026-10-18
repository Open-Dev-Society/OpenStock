import type { Metadata } from 'next';
import Link from 'next/link';
import PageHero from '@/components/marketing/PageHero';
import { GUIDES } from '@/lib/seo/comparisons';
import { siteUrl } from '@/lib/seo/site';

const title = 'Guides | OpenStock';
const description = 'What OpenStock is and is not: an open-source stock tracker with TradingView charts, a watchlist, email alerts, and self-hosting. Honest comparisons, no account required.';

export function generateMetadata(): Metadata {
    const url = `${siteUrl()}/compare`;
    return {
        title,
        description,
        alternates: { canonical: url },
        openGraph: { title, description, url, siteName: 'OpenStock', type: 'website' },
        twitter: { card: 'summary', title, description },
    };
}

export default function GuideIndexPage() {
    return (
        <>
            <PageHero
                kicker="Guides"
                title="What OpenStock is for."
                sub="Short, factual pages for the questions people actually ask. Charts on this site are TradingView widgets. The signed-in app is free to try."
            />
            <section className="mx-auto mt-12 grid max-w-[1200px] gap-3 px-5 md:grid-cols-2">
                {GUIDES.map((guide) => (
                    <Link key={guide.slug} href={`/compare/${guide.slug}`} className="hatch group">
                        <article className="card flex h-full flex-col gap-3 p-6">
                            <p className="kicker text-brand-ink">{guide.kicker}</p>
                            <h2 className="text-[22px] font-bold tracking-[-0.03em] group-hover:text-brand-ink">{guide.title}</h2>
                            <p className="text-[15px] leading-relaxed text-muted-foreground">{guide.description}</p>
                        </article>
                    </Link>
                ))}
            </section>
        </>
    );
}
