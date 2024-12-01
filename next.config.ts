import type { NextConfig } from "next";
const { protocol, hostname, port, pathname } = new URL(
  process.env.WORDPRESS_API_URl || "https://cms.freemalaysiatoday.com/graphql"
);
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    domains: ["media.freemalaysiatoday.com"],
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
  compress: true,
};

export default nextConfig;
