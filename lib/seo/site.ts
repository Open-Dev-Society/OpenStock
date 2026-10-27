// Canonical origin for sitemap, robots and meta. BETTER_AUTH_URL is the app's public URL
// (runtime, so Docker and Railway pick it up without a rebuild).
export function siteUrl(): string {
    const configured = process.env.BETTER_AUTH_URL?.trim();
    if (configured) return configured.replace(/\/$/, '');
    const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
    if (vercel) return `https://${vercel.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
    return 'http://localhost:3000';
}
