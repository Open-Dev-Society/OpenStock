import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import JsonLd from '@/components/seo/JsonLd';
import SignUpCta from '@/components/seo/SignUpCta';
import TradingViewEmbed from '@/components/seo/TradingViewEmbed';
import { getSession } from '@/lib/better-auth/auth';
import { CANDLE_CHART_WIDGET_CONFIG, symbolInfoConfig } from '@/lib/constants';
import { companyBrowseUrl, formatFilingDate, getEdgarCompany, type EdgarFiling } from '@/lib/seo/edgar';
import { GUIDES } from '@/lib/seo/comparisons';
import { siteUrl } from '@/lib/seo/site';
import { adjacentTickers, findTicker, relatedTickers, sectorAnchor, tickerIntro, tickerPath, type UsTicker } from '@/lib/seo/tickers';
import { formatSymbolForTradingView, tradingViewSymbolUrl } from '@/lib/utils';

const WIDGET = 'https://s3.tradingview.com/external-embedding/embed-widget-';

// Public company page. Charts are TradingView widgets. Facts are SEC EDGAR submissions.
// The signed-in stock page (/stocks/[symbol]) is a different route and is unchanged.
export const dynamic = 'force-dynamic';

type Params = { ticker: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const { ticker: raw } = await params;
    const ticker = findTicker(raw);
    if (!ticker) return { title: 'Stock not found | OpenStock', robots: { index: false, follow: false } };

    const title = `${ticker.name} (${ticker.symbol}) stock chart and SEC filings | OpenStock`;
    const description = tickerIntro(ticker);
    const url = `${siteUrl()}${tickerPath(ticker.symbol)}`;
    return {
        title,
        description,
        alternates: { canonical: url },
        openGraph: { title, description, url, siteName: 'OpenStock', type: 'website' },
        twitter: { card: 'summary', title, description },
        robots: { index: true, follow: true },
    };
}

function FilingRow({ label, filing }: { label: string; filing: EdgarFiling | null }) {
    return (
        <div className="flex flex-col gap-1">
            <dt className="kicker">{label}</dt>
            <dd className="text-[15px]">
                {filing ? (
                    <a href={filing.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline decoration-[var(--line)] underline-offset-4 hover:decoration-foreground">
                        {filing.form} filed {formatFilingDate(filing.filed)}
                    </a>
                ) : (
                    <span className="text-muted-foreground">Not in the recent EDGAR index</span>
                )}
            </dd>
        </div>
    );
}

export default async function PublicTickerPage({ params }: { params: Promise<Params> }) {
    const { ticker: raw } = await params;
    const ticker = findTicker(raw);
    if (!ticker) notFound();

    const [edgar, session] = await Promise.all([
        getEdgarCompany(ticker.cik),
        getSession(),
    ]);

    const origin = siteUrl();
    const path = tickerPath(ticker.symbol);
    const url = `${origin}${path}`;
    const tvSymbol = formatSymbolForTradingView(ticker.symbol);
    const tvHref = tradingViewSymbolUrl(tvSymbol);
    const signedIn = !!session?.user;
    const peers = relatedTickers(ticker);
    const { prev, next } = adjacentTickers(ticker);
    const title = `${ticker.name} (${ticker.symbol}) stock chart and SEC filings`;
    const filingsUrl = edgar?.filingsUrl ?? (ticker.cik ? companyBrowseUrl(ticker.cik) : 'https://www.sec.gov/edgar/search/');

    return (
        <article className="mx-auto max-w-[1200px] px-5 pt-10 pb-4">
            <JsonLd data={structuredData({ ticker, origin, url, title, description: tickerIntro(ticker) })} />

            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-x-2 text-[13px] font-semibold text-muted-foreground">
                <Link href="/" className="hover:text-foreground">OpenStock</Link>
                <span aria-hidden>/</span>
                <Link href="/s" className="hover:text-foreground">US stocks</Link>
                <span aria-hidden>/</span>
                <Link href={`/s#${sectorAnchor(ticker.sector)}`} className="hover:text-foreground">{ticker.sector}</Link>
                <span aria-hidden>/</span>
                <span className="text-foreground">{ticker.symbol}</span>
            </nav>

            <header className="mt-6 max-w-3xl">
                <p className="kicker text-brand-ink">{ticker.exchange || 'US'} · {ticker.symbol}</p>
                <h1 className="mt-2 text-[36px] font-bold leading-[1.05] tracking-[-0.045em] md:text-[48px]">{ticker.name}</h1>
                <p className="mt-4 text-[16px] leading-relaxed text-muted-foreground">{tickerIntro(ticker)}</p>
            </header>

            <div className="mt-8 flex flex-wrap gap-2">
                <Link href={signedIn ? `/stocks/${encodeURIComponent(ticker.symbol)}` : '/sign-up'} className="btn btn-primary h-11 px-5 text-[15px]">
                    {signedIn ? `Open ${ticker.symbol} in the app` : `Track ${ticker.symbol} free`}
                </Link>
                <a href={tvHref} target="_blank" rel="noopener nofollow" className="btn btn-ghost h-11 px-5 text-[15px]">View on TradingView</a>
            </div>

            <div className="mt-8 flex flex-col gap-3">
                <section className="hatch">
                    <div className="card p-1">
                        <TradingViewEmbed
                            scriptUrl={`${WIDGET}symbol-info.js`}
                            config={symbolInfoConfig(tvSymbol)}
                            height={180}
                            creditHref={tvHref}
                            creditLabel={`${ticker.symbol} quote by TradingView`}
                        />
                    </div>
                </section>
                <section className="hatch">
                    <div className="card p-1">
                        <TradingViewEmbed
                            scriptUrl={`${WIDGET}advanced-chart.js`}
                            config={CANDLE_CHART_WIDGET_CONFIG(tvSymbol)}
                            height={560}
                            creditHref={tvHref}
                            creditLabel={`${ticker.symbol} chart by TradingView`}
                        />
                    </div>
                </section>
            </div>

            <section className="mt-10">
                <h2 className="text-[28px] font-bold tracking-[-0.04em]">SEC filings</h2>
                <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
                    Industry code, fiscal year and filing dates come from the SEC’s EDGAR submissions feed for CIK {ticker.cik}.
                    The annual report is a Form 10-K, or a 20-F or 40-F for a foreign issuer. The quarterly report is a Form 10-Q when the company files one.
                </p>
                <div className="hatch mt-5">
                    <div className="card p-6">
                        {edgar ? (
                            <dl className="grid gap-6 sm:grid-cols-2">
                                <div>
                                    <dt className="kicker">SIC</dt>
                                    <dd className="mt-1 text-[15px]">{[edgar.sic, edgar.sicDescription].filter(Boolean).join(' · ') || 'Not listed'}</dd>
                                </div>
                                <div>
                                    <dt className="kicker">Fiscal year ends</dt>
                                    <dd className="mt-1 text-[15px]">{edgar.fiscalYearEnd || 'Not listed'}</dd>
                                </div>
                                <div>
                                    <dt className="kicker">Incorporated</dt>
                                    <dd className="mt-1 text-[15px]">{edgar.stateOfIncorporation || 'Not listed'}</dd>
                                </div>
                                <FilingRow label="Latest annual report" filing={edgar.annual} />
                                <FilingRow label="Latest quarterly report" filing={edgar.quarterly} />
                                <div>
                                    <dt className="kicker">All filings</dt>
                                    <dd className="mt-1 text-[15px]">
                                        <a href={edgar.filingsUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-[var(--line)] underline-offset-4 hover:decoration-foreground">
                                            {ticker.name} on EDGAR
                                        </a>
                                    </dd>
                                </div>
                            </dl>
                        ) : (
                            <p className="text-[15px] leading-relaxed text-muted-foreground">
                                EDGAR did not respond for this company just now. The chart above is unaffected.{' '}
                                <a href={filingsUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline decoration-[var(--line)] underline-offset-4">
                                    Open {ticker.symbol} on EDGAR
                                </a>
                                .
                            </p>
                        )}
                    </div>
                </div>
            </section>

            <section className="mt-12">
                <h2 className="text-[22px] font-bold tracking-[-0.03em]">More in {ticker.sector}</h2>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {peers.map((peer) => (
                        <li key={peer.symbol}>
                            <Link href={tickerPath(peer.symbol)} className="card flex items-baseline justify-between gap-3 px-3 py-2 hover:bg-hover/40">
                                <span className="truncate text-[14px]">{peer.name}</span>
                                <span className="mono shrink-0 text-[12px] text-faint">{peer.symbol}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
                <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[13px] font-semibold text-muted-foreground">
                    {prev && <Link href={tickerPath(prev.symbol)} className="hover:text-foreground">Previous: {prev.symbol}</Link>}
                    {next && <Link href={tickerPath(next.symbol)} className="hover:text-foreground">Next: {next.symbol}</Link>}
                    <Link href="/s" className="hover:text-foreground">All US stocks</Link>
                </p>
            </section>

            <section className="mt-12">
                <h2 className="text-[22px] font-bold tracking-[-0.03em]">Questions about tracking {ticker.symbol}</h2>
                <div className="hatch mt-4">
                    <div className="card row-list overflow-hidden">
                        <details className="group">
                            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden">
                                Does this page show a live price?
                                <ChevronDown className="size-4 flex-none text-faint transition-transform group-open:rotate-180" />
                            </summary>
                            <p className="max-w-3xl px-5 pb-5 text-[15px] leading-relaxed text-muted-foreground">
                                The number you see in the chart is rendered by TradingView’s widget in your browser. OpenStock does not print a quote of its own on this page. A free account adds {ticker.symbol} to a watchlist; email alerts, when that deployment has them, run inside the app.
                            </p>
                        </details>
                        <details className="group">
                            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden">
                                Where do the filing dates come from?
                                <ChevronDown className="size-4 flex-none text-faint transition-transform group-open:rotate-180" />
                            </summary>
                            <p className="max-w-3xl px-5 pb-5 text-[15px] leading-relaxed text-muted-foreground">
                                From the SEC’s EDGAR submissions feed for CIK {ticker.cik || 'this company'}. The link opens the filing on sec.gov. OpenStock is not affiliated with the SEC.
                            </p>
                        </details>
                    </div>
                </div>
            </section>

            <nav aria-label="Related guides" className="mt-10 flex flex-wrap gap-x-4 gap-y-2 text-[13px] font-semibold text-muted-foreground">
                {GUIDES.slice(0, 4).map((guide) => (
                    <Link key={guide.slug} href={`/compare/${guide.slug}`} className="hover:text-foreground">{guide.title}</Link>
                ))}
            </nav>

            <div className="mt-10">
                <SignUpCta
                    title={`Track ${ticker.symbol} free on OpenStock`}
                    body="Save it to a watchlist, keep the chart open in a tab, and read the filings from one place. OpenStock is not a broker, and nothing here is investment advice."
                    href={signedIn ? `/stocks/${encodeURIComponent(ticker.symbol)}` : '/sign-up'}
                    label={signedIn ? `Open ${ticker.symbol}` : `Track ${ticker.symbol} free`}
                />
            </div>
        </article>
    );
}

function structuredData({ ticker, origin, url, title, description }: { ticker: UsTicker; origin: string; url: string; title: string; description: string }) {
    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'OpenStock', item: `${origin}/` },
                    { '@type': 'ListItem', position: 2, name: 'US stocks', item: `${origin}/s` },
                    { '@type': 'ListItem', position: 3, name: ticker.sector, item: `${origin}/s#${sectorAnchor(ticker.sector)}` },
                    { '@type': 'ListItem', position: 4, name: `${ticker.name} (${ticker.symbol})`, item: url },
                ],
            },
            {
                '@type': 'Corporation',
                name: ticker.name,
                tickerSymbol: ticker.symbol,
                url: ticker.cik ? companyBrowseUrl(ticker.cik) : url,
                ...(ticker.sector ? { industry: ticker.sector } : {}),
            },
            {
                '@type': 'WebPage',
                name: title,
                description,
                url,
                isPartOf: { '@type': 'WebSite', name: 'OpenStock', url: origin },
            },
        ],
    };
}
