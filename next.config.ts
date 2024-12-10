import type { NextConfig } from "next";
const { protocol, hostname, port, pathname } = new URL(
  process.env.WORDPRESS_API_URl || "https://staging-cms.freemalaysiatoday.com/graphql"
);
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  env: {
    NEXT_PUBLIC_DOMAIN:
      process.env.NEXT_PUBLIC_DOMAIN || "dev-v4.freemalaysiatoday.com",
  },
  images: {
    remotePatterns: [
      {
        protocol: protocol.slice(0, -1) as "https" | "http",
        hostname,
        port,
        pathname: `${pathname}/**`,
      },
      {
        protocol: "https",
        hostname: "media.freemalaysiatoday.com",
      },
      {
        protocol: "https",
        hostname: "www.freemalaysiatoday.com",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "stg-origin-s3media.freemalaysiatoday.com",
      },
      {
        protocol: "https",
        hostname: "yt3.ggpht.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "googleusercontent.com",
      },
    ],
    minimumCacheTTL: 60,
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  poweredByHeader: false,
  staticPageGenerationTimeout: 120,
  compress: true,
  async headers() {
    return [
      {
        source: "/api/sync-content",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
