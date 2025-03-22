import type { NextConfig } from "next";
import { RemotePattern } from "next/dist/shared/lib/image-config";

const { protocol, hostname, port, pathname } = new URL(
  process.env.WORDPRESS_API_URL || "https://cms.freemalaysiatoday.com/graphql"
);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  env: {
    NEXT_PUBLIC_DOMAIN:
      process.env.NEXT_PUBLIC_DOMAIN || "dev-v4.freemalaysiatoday.com",
  },
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: protocol.slice(0, -1) as "https" | "http",
        hostname,
        port: port || undefined,
        pathname: `${pathname}/**`,
      },
      // Add Gravatar domain
      {
        protocol: "https",
        hostname: "secure.gravatar.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "media.freemalaysiatoday.com",
        pathname: "/wp-content/**",
      },
      {
        protocol: "http",
        hostname: "s3media.freemalaysiatoday.com",
        pathname: "/wp-content/**",
      },
      {
        protocol: "https",
        hostname: "s3media.freemalaysiatoday.com",
        pathname: "/wp-content/**",
      },
      {
        protocol: "https",
        hostname: "yt3.ggpht.com",
        pathname: "/**",
      },
      ...[
        "www.freemalaysiatoday.com",
        "stg-origin-s3media.freemalaysiatoday.com",
      ].flatMap((hostname): RemotePattern[] => [
        {
          protocol: "https",
          hostname,
          pathname: "/wp-content/**",
        },
        {
          protocol: "http",
          hostname,
          pathname: "/wp-content/**",
        },
      ]),
      ...[
        "i.ytimg.com",
        "yt3.ggpht.com",
        "lh3.googleusercontent.com",
        "googleusercontent.com",
      ].map(
        (hostname): RemotePattern => ({
          protocol: "https",
          hostname,
          pathname: "/**",
        })
      ),
    ],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 64, 96, 128, 256],
    minimumCacheTTL: 3600,
    formats: ["image/webp"],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Performance optimizations
  poweredByHeader: false,
  staticPageGenerationTimeout: 120,
  compress: true,

  // Headers configuration
  async headers() {
    return [
      {
        source: "/api/websub-callback",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },
      {
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=60",
          },
          {
            key: "Cloudflare-CDN-Cache-Control",
            value:
              "stale-while-revalidate=60, stale-if-error=60, public",
          },
          // Add security headers
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value:
              "max-age=0, stale-while-revalidate=60, stale-if-error=60, public",
          },
          {
            key: "Cloudflare-CDN-Cache-Control",
            value:
              "max-age=0,stale-while-revalidate=60, stale-if-error=60, public",
          },
        ],
      },
      // Add cache headers for static assets
      {
        source: "/:path*.(jpg|jpeg|png|gif|webp|svg|ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
          {
            key: "Cloudflare-CDN-Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
