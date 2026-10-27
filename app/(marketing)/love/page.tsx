import Link from "next/link";
import { ArrowUpRight, Play } from "lucide-react";
import { Tweet } from "react-tweet";
import PageHero from "@/components/marketing/PageHero";
import SectionHead from "@/components/marketing/SectionHead";
import { REPO_URL } from "@/lib/constants";
import { ACTIVE_SPONSORS, PREVIOUS_SPONSORS, SPONSOR_TIERS, SUPPORTERS, type Sponsor } from "@/lib/sponsors";
import { cn } from "@/lib/utils";

export const metadata = {
    title: 'Wall of love',
    description: 'The sponsors and supporters behind OpenStock, and what people write, post and film about it.',
};

// Only real posts, videos and articles about OpenStock. X posts render live from X: add the post id, never its text.
type Praise =
    | { kind: 'post'; id: string }
    | { kind: 'video'; url: string; thumbnail?: string; title: string; channel: string }
    | { kind: 'article'; url: string; title: string; source: string };

const PRAISE: Praise[] = [
    { kind: 'post', id: '2047252137604948054' },
    { kind: 'article', source: 'Medium', title: 'OpenStock — The Free, Open-Source Stock Market App Built for Everyone', url: 'https://medium.com/coding-nexus/openstock-the-free-open-source-stock-market-app-built-for-everyone-af6ae05b87de' },
    { kind: 'post', id: '1976950915253834116' },
    { kind: 'article', source: 'Bright Coding', title: 'Stop Paying for Stock Data! OpenStock Is the Free Platform Devs Are Switching To', url: 'https://www.blog.brightcoding.dev/2026/07/22/stop-paying-for-stock-data-openstock-is-the-free-platform-devs-are-switching-to' },
    { kind: 'video', url: 'https://www.youtube.com/watch?v=-RRCzE1sXOw', thumbnail: 'https://i.ytimg.com/vi/-RRCzE1sXOw/hqdefault.jpg', title: 'Open-Dev-Society/OpenStock, Gource visualisation', channel: 'Gourcer' },
    { kind: 'article', source: 'Zhihu', title: '这个牛逼的股票市场平台，在 GitHub 上开源了。', url: 'https://zhuanlan.zhihu.com/p/1963636115106951213' },
    { kind: 'article', source: 'HelloGitHub', title: 'Free and Cool Stock Market App', url: 'https://hellogithub.com/en/repository/Open-Dev-Society/OpenStock' },
    { kind: 'post', id: '1975379365866430873' },
    { kind: 'article', source: 'PyShine', title: 'OpenStock: An Open-Source Alternative to Expensive Market Platforms', url: 'https://pyshine.com/OpenStock-Open-Source-Alternative-to-Expensive-Market-Platforms/' },
    { kind: 'video', url: 'https://www.bilibili.com/video/BV1GbH469Erp/', title: 'Github 一周热点 #133: 免费的股票看板', channel: 'IT咖啡馆 on bilibili' },
    { kind: 'article', source: 'CSDN', title: '【GitHub项目推荐--OpenStock：开源股票市场平台】', url: 'https://blog.csdn.net/j8267643/article/details/153693153' },
    { kind: 'article', source: 'aibit', title: 'OpenStock: Your Free Open-Source Market Platform Alternative', url: 'https://aibit.im/en/article/openstock-your-free-open-source-market-platform-alternative' },
    { kind: 'post', id: '2073376806154219883' },
    { kind: 'article', source: 'Juejin', title: 'GitHub 热榜项目：日榜（2026-09-22）', url: 'https://juejin.cn/post/7688170153797746726' },
    { kind: 'article', source: 'CSDN', title: '开源股票数据平台OpenStock：用Next.js+React构建的免费金融分析神器', url: 'https://blog.csdn.net/libaiup/article/details/153052265' },
    { kind: 'article', source: 'daily.dev', title: 'OpenStock is an open-source alternative to expensive market platforms', url: 'https://daily.dev/posts/openstock-is-an-open-source-alternative-to-expensive-market-platforms--0cijqlabk' },
];

type WallItem = { name: string; url: string; label: string; logo?: string; iconOnly?: boolean; avatar?: string };

// "Partner", "Company", or "Sponsor" when no tier is recorded
const tierLabel = (s: Sponsor) => SPONSOR_TIERS.find((t) => t.id === s.tier)?.name ?? 'Sponsor';

const WALL: WallItem[] = [
    ...ACTIVE_SPONSORS.map((s) => ({ name: s.name, url: s.url, logo: s.logo, iconOnly: s.iconOnly, label: tierLabel(s) })),
    ...PREVIOUS_SPONSORS.map((s) => {
        const label = `Past ${tierLabel(s).toLowerCase()}`;
        return { name: s.name, url: s.url, logo: s.logo, iconOnly: s.iconOnly, label: s.period ? `${label} · ${s.period}` : label };
    }),
    ...SUPPORTERS.map((s) => ({ name: s.name, url: `https://github.com/${s.login}`, avatar: `https://github.com/${s.login}.png?size=64`, label: 'Supporter' })),
];

// Prefilled post for the share button. Keep it within X's 280 characters (the link counts as 23, an emoji as 2).
const SHARE_TEXT = `OpenStock: a free, open-source alternative to paid stock terminals.

TradingView charts, watchlists, a sector heatmap and ⌘K search across every exchange. No subscription, and you can self-host it.

Built by @ravixalgorithm and Open Dev Society 👇`;
const SHARE_URL = `https://x.com/intent/post?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(REPO_URL)}`;
const EDIT_URL = `${REPO_URL}/edit/main/app/%28marketing%29/love/page.tsx`;

// Copies after the first are decoration for the loop: hidden from screen readers and skipped by Tab, still clickable.
const Chip = ({ item, copy }: { item: WallItem; copy: boolean }) => (
    <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        tabIndex={copy ? -1 : undefined}
        className="mr-3 flex h-16 shrink-0 items-center gap-3 rounded-[14px] bg-card px-5 shadow-[inset_0_0_0_1px_var(--line)] transition-colors hover:bg-hover"
    >
        {item.avatar && <img src={item.avatar} alt="" width={32} height={32} loading="lazy" className="size-8 rounded-full" />}
        {item.logo && <img src={item.logo} alt={item.iconOnly ? '' : item.name} className="h-6 w-auto" />}
        <span className="flex flex-col gap-0.5">
            {(!item.logo || item.iconOnly) && <span className="text-[14px] font-semibold leading-none">{item.name}</span>}
            <span className="kicker leading-none">{item.label}</span>
        </span>
    </a>
);

const MarqueeRow = ({ items, reverse }: { items: WallItem[]; reverse?: boolean }) => (
    <div className={cn('marquee-mask flex overflow-hidden', reverse && 'is-extra')}>
        <div className={cn('marquee', reverse && 'is-reverse')}>
            {[0, 1, 2, 3].map((copy) => (
                <div key={copy} className="flex shrink-0" aria-hidden={copy > 0 || undefined}>
                    {items.map((item) => <Chip key={item.name} item={item} copy={copy > 0} />)}
                    <Link
                        href="/sponsor#tiers"
                        tabIndex={copy > 0 ? -1 : undefined}
                        className="mr-3 flex h-16 shrink-0 items-center rounded-[14px] px-5 text-[13px] font-semibold text-faint transition-colors hover:text-brand-ink"
                        style={{ backgroundImage: 'repeating-linear-gradient(-45deg, oklch(0.4 0.01 95 / 0.22) 0 1px, transparent 1px 5px)', boxShadow: 'inset 0 0 0 1px var(--line)' }}
                    >
                        Your name here
                    </Link>
                </div>
            ))}
        </div>
    </div>
);

const PraiseCard = ({ praise }: { praise: Praise }) => {
    if (praise.kind === 'post') return (
        <div className="hatch mb-3 break-inside-avoid">
            <div className="overflow-hidden rounded-[14px]"><Tweet id={praise.id} fetchOptions={{ next: { revalidate: 86400 } }} /></div>
        </div>
    );
    if (praise.kind === 'video') return (
        <a href={praise.url} target="_blank" rel="noreferrer" className="hatch group mb-3 break-inside-avoid">
            <div className="card overflow-hidden">
                <div className="relative aspect-video bg-page">
                    {praise.thumbnail && <img src={praise.thumbnail} alt="" loading="lazy" className="size-full object-cover" />}
                    <span className="absolute inset-0 grid place-items-center">
                        <span className="grid size-12 place-items-center rounded-full bg-black/65 text-white transition-transform group-hover:scale-110"><Play className="size-5 fill-current" /></span>
                    </span>
                </div>
                <div className="p-5">
                    <p className="kicker">Video · {praise.channel}</p>
                    <p className="mt-2 text-[17px] font-bold leading-snug tracking-[-0.02em]">{praise.title}</p>
                </div>
            </div>
        </a>
    );
    return (
        <a href={praise.url} target="_blank" rel="noreferrer" className="hatch group mb-3 break-inside-avoid">
            <div className="card flex flex-col gap-3 p-5">
                <p className="kicker">Article · {praise.source}</p>
                <p className="text-[17px] font-bold leading-snug tracking-[-0.02em]">{praise.title}</p>
                <span className="flex items-center gap-1 text-[13px] font-semibold text-brand-ink">
                    Read on {praise.source} <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
            </div>
        </a>
    );
};

export default function LovePage() {
    return (
        <>
            <PageHero
                kicker="Wall of love"
                title="Thank you for keeping OpenStock free."
                sub="The sponsors who pay the bills, the supporters who chip in, and everyone who writes, posts or films something about it."
            >
                <Link href="/sponsor" className="btn btn-primary h-11 px-5 text-[15px]">Become a sponsor</Link>
                <a href={SHARE_URL} target="_blank" rel="noreferrer" className="btn btn-ghost h-11 px-5 text-[15px]">Post about OpenStock</a>
            </PageHero>

            <section className="mt-16 flex flex-col gap-3" aria-label="Sponsors and supporters">
                <MarqueeRow items={WALL} />
                <MarqueeRow items={[...WALL].reverse()} reverse />
            </section>

            <section className="love-wall mx-auto mt-24 max-w-[1200px] px-5">
                <SectionHead kicker="In their words" title="What people say about OpenStock." sub="Posts, videos and write-ups from people who found it, used it and told others." />
                <div className="columns-1 gap-3 md:columns-2 lg:columns-3">
                    {PRAISE.map((praise) => <PraiseCard key={praise.kind === 'post' ? praise.id : praise.url} praise={praise} />)}
                </div>
                <p className="mt-6 text-[14px] text-faint">
                    Made something about OpenStock? <a href={EDIT_URL} target="_blank" rel="noreferrer" className="font-semibold text-brand-ink hover:underline">Add it to this page</a>.
                </p>
            </section>
        </>
    );
}
