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
      process.env.NEXT_PUBLIC_DOMAIN || "www.freemalaysiatoday.com",
    WORDPRESS_API_URL:
      process.env.WORDPRESS_API_URL ||
      "https://cms.freemalaysiatoday.com/graphql",
    NEXT_PUBLIC_WP_REFRESH_TOKEN:
      process.env.NEXT_PUBLIC_WP_REFRESH_TOKEN ||
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL3d3dy5mcmVlbWFsYXlzaWF0b2RheS5jb20iLCJpYXQiOjE2NzYzNzE0MzksIm5iZiI6MTY3NjM3MTQzOSwiZXhwIjoyMTQ3NDgzNjQ3LCJkYXRhIjp7InVzZXIiOnsiaWQiOiI1OTEiLCJ1c2VyX3NlY3JldCI6ImdyYXBocWxfand0XzYzZWI1NTg3N2MxOTkifX19.5Ui4TcQ2Er7nJhvXYW8XOAi0-a6OEodoGYk03z7c7Ic",
    NEXT_PUBLIC_CMS_URL:
      process.env.NEXT_PUBLIC_CMS_URL || "https://cms.freemalaysiatoday.com",
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

  async headers() {
    return [
      // API specific headers
      {
        source: "/api/websub-callback",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },

      // Revalidation API should never be cached
      {
        source: "/api/revalidate",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
        ],
      },

      // Default static assets (middleware will override for article images)
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

      // JavaScript and CSS assets
      {
        source: "/_next/static/:path*",
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

      // Security headers for all pages
      {
        source: "/(.*)",
        headers: [
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
    ];
  },
};
export default nextConfig;
