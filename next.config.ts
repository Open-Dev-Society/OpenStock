import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    devIndicators: false,
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'i.ibb.co', pathname: '/**' },
            { protocol: 'https', hostname: 'static2.finnhub.io', pathname: '/**' },
        ],
    },
    eslint: { ignoreDuringBuilds: true },
    typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
