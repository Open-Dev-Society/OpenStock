import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    devIndicators: false,
    // /whats-new was live briefly before the changelog replaced it
    async redirects() {
        return [{ source: '/whats-new', destination: '/changelog', permanent: true }];
    },
    turbopack: {
        root: process.cwd(),
    },
    // No remote images: every next/image src is a local file. Allowing a public upload host here (i.ibb.co was)
    // lets anyone feed files to the image optimizer on self-hosted servers.
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    }
};

export default nextConfig;
