import type { Metadata } from 'next';
import Link from 'next/link';
import PageHero from '@/components/marketing/PageHero';
import JsonLd from '@/components/seo/JsonLd';
import { siteUrl } from '@/lib/seo/site';
import { sectorAnchor, tickerPath, tickersBySector, US_TICKERS } from '@/lib/seo/tickers';

const title = 'US stock charts and SEC filings | OpenStock';
const description = `Public pages for ${US_TICKERS.length} S&P 500 and Nasdaq-100 companies: a TradingView chart and links to recent SEC EDGAR filings. No account required.`;

export function generateMetadata(): Metadata {
    const url = `${siteUrl()}/s`;
    return {
        title,
        description,
        alternates: { canonical: url },
        openGraph: { title, description, url, siteName: 'OpenStock', type: 'website' },
        twitter: { card: 'summary', title, description },
    };
}

export default function StockDirectoryPage() {
    const groups = tickersBySector();
    const origin = siteUrl();

    return (
        <>
            <PageHero
                kicker="US stocks"
                title="Charts and filings, no account."
                sub={`${US_TICKERS.length} companies from the S&P 500 and the Nasdaq-100. Each page is a TradingView chart plus the latest annual and quarterly report on SEC EDGAR. The signed-in app is where watchlists and alerts live.`}
            >
                <Link href="/sign-up" className="btn btn-primary h-11 px-5 text-[15px]">Track them free</Link>
                <Link href="/compare" className="btn btn-ghost h-11 px-5 text-[15px]">Read the guides</Link>
            </PageHero>

            <nav aria-label="Sectors" className="mx-auto mt-10 flex max-w-[1200px] flex-wrap gap-2 px-5">
                {groups.map(({ sector, tickers }) => (
                    <a key={sector} href={`#${sectorAnchor(sector)}`} className="pill h-8 px-3 text-[13px]">
                        {sector} <span className="num text-faint">{tickers.length}</span>
                    </a>
                ))}
            </nav>

            <div className="mx-auto mt-12 flex max-w-[1200px] flex-col gap-12 px-5">
                {groups.map(({ sector, tickers }) => (
                    <section key={sector} id={sectorAnchor(sector)} className="scroll-mt-24">
                        <h2 className="text-[22px] font-bold tracking-[-0.03em]">{sector}</h2>
                        <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                            {tickers.map((ticker) => (
                                <li key={ticker.symbol}>
                                    <Link href={tickerPath(ticker.symbol)} className="group flex items-baseline justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-hover/50">
                                        <span className="truncate text-[14px]">{ticker.name}</span>
                                        <span className="mono shrink-0 text-[12px] text-faint group-hover:text-foreground">{ticker.symbol}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>

            <JsonLd data={{
                '@context': 'https://schema.org',
                '@type': 'CollectionPage',
                name: title,
                description,
                url: `${origin}/s`,
                isPartOf: { '@type': 'WebSite', name: 'OpenStock', url: origin },
            }} />
        </>
    );
}
