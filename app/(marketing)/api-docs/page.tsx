import { BarChart2, Clock, Mail, UserX } from 'lucide-react';
import PageHero from '@/components/marketing/PageHero';
import SectionHead from '@/components/marketing/SectionHead';
import IconCard from '@/components/marketing/IconCard';
import { REPO_URL } from '@/lib/constants';

export const metadata = {
    title: 'Architecture | OpenStock',
    description: 'How OpenStock works: market data, background jobs and the AI behind the emails.',
};

const DATA_MODES = [
    { name: 'Cached', cadence: 'Hourly', body: 'Default for the public site. Quotes are fetched once an hour and shared by every user, so cost grows with symbols, not people.' },
    { name: 'Realtime', cadence: 'Every 15 seconds', body: 'For OpenStock Cloud and self-hosting. Set NEXT_PUBLIC_OPENSTOCK_DATA_MODE=realtime and on-screen prices refresh live and email price alerts turn on.' },
];

const COVERAGE = [
    ['US stocks, crypto', 'Live', 'Yes'],
    ['Forex', 'Live', 'No'],
    ['Canada, Australia', 'Delayed', 'No'],
    ['India (BSE), Germany', 'End of day', 'No'],
];

const FLOW = ['A user signs up, or a cron fires', 'Inngest runs the function', 'Gemini writes the text', 'MiniMax takes over if Gemini fails', 'The email goes out'];

const JOBS = [
    { icon: Mail, title: 'Welcome email', trigger: 'On sign-up', body: 'An AI-written intro tailored to the country, goal, risk and industry picked at sign-up.' },
    { icon: BarChart2, title: 'Weekly news', trigger: 'Mon 09:00', body: 'Summarises the week’s market news and sends it as a Kit broadcast.' },
    { icon: Clock, title: 'Price alerts', trigger: 'Every 5 min', body: 'Checks every active alert against Finnhub quotes and emails the owner when one fires. Realtime mode only.' },
    { icon: UserX, title: 'Re-engagement', trigger: 'Daily 10:00', body: 'Finds dormant accounts and sends a gentle nudge.' },
];

const STACK = [
    ['Finnhub', 'Quotes, company profiles, search and news. A pool of keys, rotated per request.', 'https://finnhub.io'],
    ['TradingView', 'Charts, heatmaps, technicals and market widgets, embedded live.', 'https://www.tradingview.com/widget/'],
    ['Inngest', 'Background jobs and schedules, with retries.', 'https://www.inngest.com'],
    ['Better Auth', 'Email, Google and GitHub sign-in with MongoDB sessions.', 'https://www.better-auth.com'],
    ['MongoDB Atlas', 'Users, watchlists and alerts.', 'https://www.mongodb.com/atlas'],
    ['Kit', 'Newsletter broadcasts for the weekly digest.', 'https://kit.com'],
];

export default function ArchitecturePage() {
    return (
        <>
            <PageHero
                kicker="Architecture"
                title="How OpenStock works."
                sub="A transparent look at the event-driven, multi-provider system behind your market data and emails."
            >
                <span className="pill h-8 px-3">v1.0.0</span>
                <span className="pill h-8 px-3">Gemini with MiniMax fallback</span>
                <span className="pill h-8 px-3">Open source · AGPL-3.0</span>
            </PageHero>

            <section className="mx-auto mt-20 max-w-[1200px] px-5">
                <SectionHead kicker="Market data" title="Two data modes, one cache." sub="Charts always stream from TradingView. Everything we price ourselves goes through a shared cache with timeouts, so a slow provider never stalls a page." />
                <div className="grid gap-3 md:grid-cols-2">
                    {DATA_MODES.map(({ name, cadence, body }) => (
                        <div key={name} className="hatch">
                            <div className="card flex h-full flex-col gap-2 p-5">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[16px] font-bold">{name}</h3>
                                    <span className="pill is-brand">{cadence}</span>
                                </div>
                                <p className="text-[14px] leading-relaxed text-muted-foreground">{body}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="hatch mt-3">
                    <div className="card overflow-x-auto">
                        <table className="data-table">
                            <thead><tr><th>Market</th><th>Charts</th><th>Our quotes and alerts</th></tr></thead>
                            <tbody>
                                {COVERAGE.map(([market, charts, quotes]) => (
                                    <tr key={market}>
                                        <td className="font-semibold text-foreground">{market}</td>
                                        <td className="text-muted-foreground">{charts}</td>
                                        <td><span className={quotes === 'Yes' ? 'pill is-up' : 'pill'}>{quotes}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <a href={`${REPO_URL}/blob/main/MARKET_SUPPORT.md`} target="_blank" rel="noreferrer" className="btn btn-ghost mt-4">Full market support notes</a>
            </section>

            <section className="mx-auto mt-24 grid max-w-[1200px] items-start gap-10 px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div>
                    <SectionHead kicker="AI" title="Emails that don’t go down with a provider." sub="Welcome emails and news summaries are written by Gemini 2.5 Flash-Lite. If it fails, the request is retried on MiniMax-M3, or any OpenAI-compatible provider you configure." />
                </div>
                <div className="hatch">
                    <ol className="card flex flex-col gap-1 p-4">
                        {FLOW.map((step, i) => (
                            <li key={step} className="flex items-center gap-3 rounded-[10px] px-2 py-2.5">
                                <span className="mono grid size-7 flex-none place-items-center rounded-full bg-page text-[12px] text-brand-ink shadow-[inset_0_0_0_1px_var(--line)]">{i + 1}</span>
                                <span className="font-semibold">{step}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <section className="mx-auto mt-24 max-w-[1200px] px-5">
                <SectionHead kicker="Background jobs" title="Four jobs keep things moving." />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {JOBS.map(({ icon, title, trigger, body }) => (
                        <IconCard key={title} icon={icon} title={title} footer={<span className="pill mono">{trigger}</span>}>{body}</IconCard>
                    ))}
                </div>
            </section>

            <section className="mx-auto mt-24 max-w-[1200px] px-5">
                <SectionHead kicker="Stack" title="Built on services you can inspect." />
                <div className="hatch">
                    <div className="card row-list">
                        {STACK.map(([name, body, url]) => (
                            <a key={name} href={url} target="_blank" rel="noreferrer" className="group flex flex-col gap-1 px-5 py-4 transition-colors hover:bg-hover/40 sm:flex-row sm:items-center sm:gap-6">
                                <span className="w-40 flex-none font-bold text-foreground group-hover:text-brand-ink">{name}</span>
                                <span className="text-muted-foreground">{body}</span>
                            </a>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}
