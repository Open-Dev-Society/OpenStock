import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    devIndicators: false,
  /* config options here */
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'i.ibb.co',
                port: '',
                pathname: '/**',
            },
        ],
    },
};

export default nextConfig;
