import Link from "next/link";
import PageHero from "@/components/marketing/PageHero";
import SectionHead from "@/components/marketing/SectionHead";
import { GOOD_FIRST_ISSUES_URL, REPO_URL } from "@/lib/constants";
import { MAINTAINER, RELEASES, type Credit } from "@/lib/changelog";
import { cn } from "@/lib/utils";

export const metadata = {
    title: 'Changelog',
    description: 'Everything that changed in OpenStock, release by release, since it started in September 2025.',
};

// "#123" in an item becomes a link to that pull request
const ItemText = ({ text }: { text: string }) => (
    <>
        {text.split(/\s*(#\d+)/).map((part, i) =>
            /^#\d+$/.test(part) ? (
                <a key={i} href={`${REPO_URL}/pull/${part.slice(1)}`} target="_blank" rel="noreferrer" className="mono ml-1.5 text-[12px] text-faint transition-colors hover:text-brand-ink">
                    {part}
                </a>
            ) : (
                <span key={i}>{part}</span>
            ),
        )}
    </>
);

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const creditLabel = ({ prs = [], issues = [] }: Credit) =>
    [prs.length ? plural(prs.length, 'PR') : '', issues.length ? plural(issues.length, 'issue') : ''].filter(Boolean).join(' · ');
const creditTitle = ({ prs = [], issues = [] }: Credit) =>
    [prs.length ? `Pull requests ${prs.map((n) => `#${n}`).join(' ')}` : '', issues.length ? `Issues ${issues.map((n) => `#${n}`).join(' ')}` : ''].filter(Boolean).join(' · ');

const Avatar = ({ login, size }: { login: string; size: number }) => (
    <img src={`https://github.com/${login}.png?size=${size * 2}`} alt="" width={size} height={size} loading="lazy" className="flex-none rounded-full bg-page" />
);

// Everyone across every release, the maintainer first, then by pull requests and issues
const CONTRIBUTORS = Object.values(
    RELEASES.flatMap((r) => r.credits).reduce<Record<string, Required<Credit>>>((all, { login, prs = [], issues = [] }) => {
        const person = (all[login] ??= { login, prs: [], issues: [] });
        person.prs.push(...prs);
        person.issues.push(...issues);
        return all;
    }, {}),
).sort((a, b) =>
    Number(b.login === MAINTAINER) - Number(a.login === MAINTAINER)
    || b.prs.length - a.prs.length
    || b.issues.length - a.issues.length
    || a.login.localeCompare(b.login));

export default function ChangelogPage() {
    return (
        <>
            <PageHero
                kicker="Changelog"
                title="Everything that changed in OpenStock."
                sub="Every release since we started in September 2025, in plain words. Each change links to its pull request on GitHub."
            >
                <Link href="/dashboard" className="btn btn-primary h-11 px-5 text-[15px]">Open dashboard</Link>
                <a href="#contributors" className="btn btn-ghost h-11 px-5 text-[15px]">Meet the {CONTRIBUTORS.length} contributors</a>
            </PageHero>

            <ol className="mx-auto mt-16 max-w-[1200px] px-5">
                {RELEASES.map((release, i) => {
                    const latest = i === 0;
                    const last = i === RELEASES.length - 1;
                    return (
                        <li key={release.id} className="grid gap-3 md:grid-cols-[150px_minmax(0,1fr)] md:gap-8">
                            <div className="md:sticky md:top-24 md:self-start md:pt-0.5 md:text-right">
                                <p className="kicker text-foreground">{release.date}</p>
                                {latest && <span className="pill is-brand mt-2">Latest</span>}
                            </div>

                            {/* The timeline: a line down the left of each release, with a dot at its title */}
                            <section aria-labelledby={`release-${release.id}`} className={cn('relative pl-8', !last && 'pb-16')}>
                                {!last && <span className="absolute left-[5px] top-3 bottom-0 w-px bg-line" aria-hidden />}
                                <span
                                    className={cn('absolute left-0 top-1.5 size-[11px] rounded-full ring-4 ring-page', latest ? 'bg-brand' : 'bg-line-strong')}
                                    aria-hidden
                                />
                                <h2 id={`release-${release.id}`} className="text-[24px] font-bold leading-tight tracking-[-0.03em] md:text-[28px]">{release.title}</h2>
                                <p className="mt-1.5 text-[15px] text-muted-foreground">{release.summary}.</p>

                                <div className={cn('mt-6 grid gap-3', release.sections.length > 1 && 'lg:grid-cols-2')}>
                                    {release.sections.map((section) => (
                                        <div key={section.title} className="hatch">
                                            <div className="card h-full p-5">
                                                <h3 className="kicker">{section.title}</h3>
                                                <ul className="mt-3 flex flex-col gap-2.5 text-[14px] leading-relaxed">
                                                    {section.items.map((item) => (
                                                        <li key={item} className="flex gap-2.5">
                                                            <span className="mt-[9px] size-1 flex-none rounded-full bg-brand" aria-hidden />
                                                            <span className="text-muted-foreground"><ItemText text={item} /></span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <span className="kicker mr-1">Thanks to</span>
                                    {release.credits.map((credit) => (
                                        <a
                                            key={credit.login}
                                            href={`https://github.com/${credit.login}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            title={creditTitle(credit)}
                                            className="flex items-center gap-2 rounded-full bg-card py-1 pl-1 pr-3 shadow-[inset_0_0_0_1px_var(--line)] transition-colors hover:bg-hover"
                                        >
                                            <Avatar login={credit.login} size={22} />
                                            <span className="text-[13px] font-semibold text-foreground">{credit.login}</span>
                                            <span className="text-[12px] text-faint">{creditLabel(credit)}</span>
                                        </a>
                                    ))}
                                </div>
                            </section>
                        </li>
                    );
                })}
            </ol>

            <section id="contributors" className="mx-auto mt-24 max-w-[1200px] scroll-mt-24 px-5">
                <SectionHead
                    kicker="Contributors"
                    title={`Built by ${CONTRIBUTORS.length} people.`}
                    sub="Everyone whose pull request or issue shaped a release above. Thank you: this is your work."
                />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {CONTRIBUTORS.map((person) => (
                        <a key={person.login} href={`https://github.com/${person.login}`} target="_blank" rel="noreferrer" title={creditTitle(person)} className="hatch group">
                            <div className="card flex items-center gap-3 p-4 transition-colors group-hover:bg-hover">
                                <Avatar login={person.login} size={40} />
                                <div className="min-w-0">
                                    <p className="flex items-center gap-2 font-semibold">
                                        <span className="truncate">{person.login}</span>
                                        {person.login === MAINTAINER && <span className="pill is-brand shrink-0">Maintainer</span>}
                                    </p>
                                    <p className="text-[13px] text-faint">{creditLabel(person)}</p>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
                <p className="mt-6 text-[14px] text-faint">
                    Want to be here? Pick a{' '}
                    <a href={GOOD_FIRST_ISSUES_URL} target="_blank" rel="noreferrer" className="font-semibold text-brand-ink hover:underline">good first issue</a>
                    {' '}or report a bug you hit.
                </p>
            </section>
        </>
    );
}
