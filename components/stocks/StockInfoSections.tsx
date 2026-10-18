import Image from 'next/image';
import { getCompanyProfile, getNews } from '@/lib/actions/finnhub.actions';
import { Building2, Newspaper, Globe, MapPin } from 'lucide-react';

type CompanyProfile = {
    name?: string;
    finnhubIndustry?: string;
    currency?: string;
    weburl?: string;
    logo?: string;
    marketCapitalization?: number;
    exchange?: string;
};

type NewsArticle = {
    headline: string;
    url: string;
    datetime: number;
    source: string;
    related: string;
};

// Headline dates are pinned to Riyadh and to a fixed locale. A bare
// toLocaleDateString() renders in UTC on the server but in the visitor's local
// zone on the client, so React saw two different strings for the same news item
// and logged a hydration mismatch. Same approach as riyadhDate in TadawulChart.
const newsDate = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Riyadh',
});

// Server Components. getCompanyProfile / getNews are Server Actions, so these
// can only run on the server.
//
// They are NOT imported by the tab switcher. A Client Component may not import
// an async component that awaits a Server Action: Turbopack pulls the module
// into the client graph and the render dies with "InfoSection is an async Client
// Component", which then breaks hydration for every control on the page.
// Instead the server page renders BOTH panels once and passes them down as
// props (see app/(root)/stocks/[symbol]/page.tsx), and the client only picks
// which slot to show.
export async function InfoSection({ symbol }: { symbol: string }) {
    const profile: CompanyProfile | null = await getCompanyProfile(symbol);

    if (!profile) return null;

    return (
        <div className="flex flex-col gap-2 p-3">
            {profile.logo && (
                <div className="mb-1 flex items-center gap-3">
                    <Image
                        src={profile.logo}
                        alt={profile.name ?? symbol}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded"
                    />
                    <div>
                        <p className="text-[14px] font-semibold">{profile.name ?? symbol}</p>
                        {profile.finnhubIndustry && <p className="text-[12px] text-faint">{profile.finnhubIndustry}</p>}
                    </div>
                </div>
            )}
            <div className="grid grid-cols-2 gap-2 text-[12px]">
                {profile.exchange && (
                    <div className="flex items-center gap-1.5 text-faint">
                        <Building2 className="size-3.5" />
                        <span>{profile.exchange}</span>
                    </div>
                )}
                {profile.currency && (
                    <div className="flex items-center gap-1.5 text-faint">
                        <MapPin className="size-3.5" />
                        <span>{profile.currency}</span>
                    </div>
                )}
                {profile.marketCapitalization && (
                    <div className="flex items-center gap-1.5 text-faint">
                        <Globe className="size-3.5" />
                        <span>MCap: {profile.marketCapitalization.toFixed(1)}B</span>
                    </div>
                )}
                {profile.weburl && (
                    <a href={profile.weburl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-brand-ink hover:underline">
                        <Newspaper className="size-3.5" />
                        <span>Website</span>
                    </a>
                )}
            </div>
        </div>
    );
}

export async function NewsSection({ symbol }: { symbol: string }) {
    const news = await getNews([symbol]);
    const items: NewsArticle[] = news
        .filter(n => n.related?.toUpperCase().includes(symbol.toUpperCase()))
        .slice(0, 3);

    if (items.length === 0) return null;

    return (
        <div className="flex flex-col gap-2 p-3">
            <p className="text-[13px] font-semibold flex items-center gap-1.5">
                <Newspaper className="size-3.5" />
                Latest News
            </p>
            {items.map((n, i) => (
                <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" className="group">
                    <p className="text-[12.5px] leading-snug group-hover:text-brand-ink transition-colors line-clamp-2">
                        {n.headline}
                    </p>
                    <p className="text-[11px] text-faint mt-0.5">
                        {newsDate.format(n.datetime * 1000)} · {n.source}
                    </p>
                </a>
            ))}
        </div>
    );
}
