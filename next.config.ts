import type { NextConfig } from "next";
import { RemotePattern } from "next/dist/shared/lib/image-config";

const { protocol, hostname, port, pathname } = new URL(
  process.env.WORDPRESS_API_URL || "https://cms.freemalaysiatoday.com/graphql"
);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  env: {
    DEBUG_MEMORY: process.env.DEBUG_MEMORY ?? "false",
    NEXT_PUBLIC_DOMAIN:
      process.env.NEXT_PUBLIC_DOMAIN || "www.freemalaysiatoday.com",
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

  async rewrites() {
    return [
      // Sitemap index
      {
        source: "/sitemaps-index.xml",
        destination: "/api/sitemaps/sitemaps-index.xml",
      },
      {
        source: "/feeds-sitemap.xml",
        destination: "/api/sitemaps/feeds-sitemap.xml",
      },
      {
        source: "/landing-page-sitemap.xml",
        destination: "/api/sitemaps/landing-page-sitemap.xml",
      },
      {
        source: "/news-sitemap.xml",
        destination: "/api/sitemaps/news-sitemap.xml",
      },
      {
        source: "/video-sitemap.xml",
        destination: "/api/sitemaps/video-sitemap.xml",
      },

      //feeds
      {
        source: "/feeds/atom/:slug",
        destination: "/api/feeds/atom/:slug",
      },
      {
        source: "/feeds/rss/:slug",
        destination: "/api/feeds/rss/:slug",
      },
      {
        source: "/feeds/json/:slug",
        destination: "/api/feeds/json/:slug",
      },
    ];
  },
  webpack(config, { isServer }) {
    if (isServer) {
      // don’t try to bundle these native modules into the client
      config.externals = [
        ...(config.externals as any[]),
        "heapdump",
        "why-is-node-running",
        "async_hooks",
        "fs",
        "path",
        "url",
      ];
    }
    return config;
  },
};

export default nextConfig;
