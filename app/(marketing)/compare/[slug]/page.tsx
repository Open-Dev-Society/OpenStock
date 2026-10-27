import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import PageHero from '@/components/marketing/PageHero';
import JsonLd from '@/components/seo/JsonLd';
import SignUpCta from '@/components/seo/SignUpCta';
import { findGuide, GUIDES } from '@/lib/seo/comparisons';
import { siteUrl } from '@/lib/seo/site';
import { findTicker, tickerPath } from '@/lib/seo/tickers';

const EXAMPLES = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'JPM', 'XOM'];

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const { slug } = await params;
    const guide = findGuide(slug);
    if (!guide) return { title: 'Guide not found | OpenStock', robots: { index: false, follow: false } };

    const title = `${guide.title} | OpenStock`;
    const url = `${siteUrl()}/compare/${guide.slug}`;
    return {
        title,
        description: guide.description,
        alternates: { canonical: url },
        openGraph: { title, description: guide.description, url, siteName: 'OpenStock', type: 'article' },
        twitter: { card: 'summary', title, description: guide.description },
    };
}

export default async function GuidePage({ params }: { params: Promise<Params> }) {
    const { slug } = await params;
    const guide = findGuide(slug);
    if (!guide) notFound();

    const origin = siteUrl();
    const url = `${origin}/compare/${guide.slug}`;
    const examples = EXAMPLES.map((symbol) => findTicker(symbol)).filter((ticker) => ticker !== undefined);
    const others = GUIDES.filter((other) => other.slug !== guide.slug);

    return (
        <>
            <JsonLd data={{
                '@context': 'https://schema.org',
                '@graph': [
                    {
                        '@type': 'BreadcrumbList',
                        itemListElement: [
                            { '@type': 'ListItem', position: 1, name: 'OpenStock', item: `${origin}/` },
                            { '@type': 'ListItem', position: 2, name: 'Guides', item: `${origin}/compare` },
                            { '@type': 'ListItem', position: 3, name: guide.title, item: url },
                        ],
                    },
                    {
                        '@type': 'FAQPage',
                        mainEntity: guide.faqs.map((faq) => ({
                            '@type': 'Question',
                            name: faq.question,
                            acceptedAnswer: { '@type': 'Answer', text: faq.answer },
                        })),
                    },
                    {
                        '@type': 'Article',
                        headline: guide.title,
                        description: guide.description,
                        url,
                        author: { '@type': 'Organization', name: 'Open Dev Society', url: 'https://github.com/Open-Dev-Society' },
                        publisher: { '@type': 'Organization', name: 'OpenStock', url: origin },
                    },
                ],
            }} />

            <PageHero kicker={guide.kicker} title={guide.title} sub={guide.lede}>
                <Link href="/sign-up" className="btn btn-primary h-11 px-5 text-[15px]">Get started free</Link>
                <Link href="/s" className="btn btn-ghost h-11 px-5 text-[15px]">Browse US stocks</Link>
            </PageHero>

            <div className="mx-auto mt-14 flex max-w-[800px] flex-col gap-12 px-5">
                {guide.sections.map((section) => (
                    <section key={section.heading}>
                        <h2 className="text-[28px] font-bold tracking-[-0.04em]">{section.heading}</h2>
                        <div className="mt-3 flex flex-col gap-4">
                            {section.paragraphs.map((paragraph) => (
                                <p key={paragraph} className="text-[16px] leading-relaxed text-muted-foreground">{paragraph}</p>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            <section className="mx-auto mt-16 max-w-[800px] px-5">
                <h2 className="text-[28px] font-bold tracking-[-0.04em]">Questions</h2>
                <div className="hatch mt-4">
                    <div className="card row-list overflow-hidden">
                        {guide.faqs.map((faq) => (
                            <details key={faq.question} className="group">
                                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden">
                                    {faq.question}
                                    <ChevronDown className="size-4 flex-none text-faint transition-transform group-open:rotate-180" />
                                </summary>
                                <p className="max-w-3xl px-5 pb-5 text-[15px] leading-relaxed text-muted-foreground">{faq.answer}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {examples.length > 0 && (
                <section className="mx-auto mt-16 max-w-[800px] px-5">
                    <h2 className="text-[22px] font-bold tracking-[-0.03em]">Look up a company</h2>
                    <ul className="mt-4 flex flex-wrap gap-2">
                        {examples.map((ticker) => (
                            <li key={ticker.symbol}>
                                <Link href={tickerPath(ticker.symbol)} className="pill h-9 px-3 text-[13px] hover:text-foreground">
                                    <span className="mono">{ticker.symbol}</span> {ticker.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section className="mx-auto mt-12 max-w-[800px] px-5">
                <h2 className="text-[13px] font-semibold text-faint">Other guides</h2>
                <ul className="mt-3 flex flex-col gap-2">
                    {others.map((other) => (
                        <li key={other.slug}>
                            <Link href={`/compare/${other.slug}`} className="font-semibold hover:text-brand-ink">{other.title}</Link>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="mx-auto mt-12 max-w-[800px] px-5">
                <SignUpCta
                    title="Use OpenStock free"
                    body="Charts, a watchlist and the US filing pages are free. OpenStock is not a broker and this is not investment advice."
                    href="/sign-up"
                    label="Create a free account"
                />
            </section>
        </>
    );
}
