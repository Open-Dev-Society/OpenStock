import type { MetadataRoute } from 'next';
import { PUBLIC_EXACT_PATHS } from '@/lib/public-paths';
import { GUIDES } from '@/lib/seo/comparisons';
import { US_TICKERS, tickerPath } from '@/lib/seo/tickers';

export function sitemapEntries(origin: string): MetadataRoute.Sitemap {
    const base = origin.replace(/\/$/, '');
    const paths = [
        ...PUBLIC_EXACT_PATHS,
        ...GUIDES.map((guide) => `/compare/${guide.slug}`),
        ...US_TICKERS.map((ticker) => tickerPath(ticker.symbol)),
    ];

    return [...new Set(paths)].map((path) => ({
        url: `${base}${path}`,
        changeFrequency: path.startsWith('/s/') ? 'weekly' : 'monthly',
        priority: path === '/' ? 1 : path.startsWith('/s/') ? 0.6 : path.startsWith('/compare') ? 0.7 : 0.5,
    }));
}
