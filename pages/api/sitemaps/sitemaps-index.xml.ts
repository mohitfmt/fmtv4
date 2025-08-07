// pages/api/sitemaps/sitemaps-index.xml.ts
import { NextApiRequest, NextApiResponse } from "next";
import { sitemapTimestampCache, formatSitemapDate } from "@/lib/sitemap-cache";

// Define sitemap configurations
const SITEMAPS = [
  {
    loc: "https://www.freemalaysiatoday.com/news-sitemap.xml",
    changefreq: "always",
    priority: 1.0,
    description: "Recent news articles (last 48 hours)",
  },
  {
    loc: "https://www.freemalaysiatoday.com/landing-page-sitemap.xml",
    changefreq: "hourly",
    priority: 0.9,
    description: "Category and landing pages",
  },
  {
    loc: "https://www.freemalaysiatoday.com/video-sitemap.xml",
    changefreq: "daily",
    priority: 0.8,
    description: "Video content",
  },
  {
    loc: "https://www.freemalaysiatoday.com/feeds-sitemap.xml",
    changefreq: "hourly",
    priority: 0.7,
    description: "RSS/Atom feeds",
  },
];

// Helper to get sitemap last modified time
async function getSitemapLastModified(sitemapUrl: string): Promise<string> {
  const cacheKey =
    sitemapUrl.split("/").pop()?.replace(".xml", "") || "unknown";

  // Check cache first
  const cached = sitemapTimestampCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // For news sitemap, it's always current
  if (sitemapUrl.includes("news-sitemap")) {
    const now = formatSitemapDate(new Date());
    sitemapTimestampCache.set(cacheKey, now);
    return now;
  }

  // For other sitemaps, use different strategies
  const now = new Date();
  let lastmod: string;

  if (sitemapUrl.includes("landing-page")) {
    // Landing pages update frequently
    lastmod = formatSitemapDate(new Date(now.getTime() - 1 * 60 * 60 * 1000)); // 1 hour ago
  } else if (sitemapUrl.includes("video")) {
    // Videos update less frequently
    lastmod = formatSitemapDate(new Date(now.getTime() - 12 * 60 * 60 * 1000)); // 12 hours ago
  } else if (sitemapUrl.includes("feeds")) {
    // Feeds update hourly
    lastmod = formatSitemapDate(new Date(now.getTime() - 1 * 60 * 60 * 1000)); // 1 hour ago
  } else {
    // Default to current time
    lastmod = formatSitemapDate(now);
  }

  sitemapTimestampCache.set(cacheKey, lastmod);
  return lastmod;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600"); // 1 hour cache

    // Generate sitemap entries
    const sitemapEntries = await Promise.all(
      SITEMAPS.map(async (sitemap) => {
        const lastmod = await getSitemapLastModified(sitemap.loc);
        return `    <sitemap>
      <loc>${sitemap.loc}</loc>
      <lastmod>${lastmod}</lastmod>
    </sitemap>`;
      })
    );

    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.join("\n")}
</sitemapindex>`;

    res.write(sitemapIndex);
    res.end();
  } catch (error) {
    console.error("[SITEMAP_ERROR] Sitemap index error:", error);

    // Fallback sitemap index
    const fallbackIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap>
      <loc>https://www.freemalaysiatoday.com/landing-page-sitemap.xml</loc>
      <lastmod>${formatSitemapDate(new Date())}</lastmod>
    </sitemap>
</sitemapindex>`;

    res.write(fallbackIndex);
    res.end();
  }
}
