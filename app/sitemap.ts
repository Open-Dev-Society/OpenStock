import type { MetadataRoute } from 'next';
import { sitemapEntries } from '@/lib/seo/sitemap';
import { siteUrl } from '@/lib/seo/site';

// Cached a day instead of rendered per hit. Regenerated at runtime, so a Docker build without
// BETTER_AUTH_URL picks up the real origin within a day.
export const revalidate = 86400;

export default function sitemap(): MetadataRoute.Sitemap {
    return sitemapEntries(siteUrl());
}
