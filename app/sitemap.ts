import type { MetadataRoute } from 'next';
import { sitemapEntries } from '@/lib/seo/sitemap';
import { siteUrl } from '@/lib/seo/site';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
    return sitemapEntries(siteUrl());
}
