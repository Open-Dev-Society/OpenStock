import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo/site';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
    const origin = siteUrl();
    return {
        rules: {
            userAgent: '*',
            allow: ['/', '/s', '/s/', '/compare', '/compare/'],
            disallow: [
                '/api/',
                '/dashboard',
                '/watchlist',
                '/profile',
                '/stocks',
                '/stocks/',
                '/sign-in',
                '/sign-up',
                '/forgot-password',
                '/reset-password',
            ],
        },
        sitemap: `${origin}/sitemap.xml`,
        host: origin,
    };
}
