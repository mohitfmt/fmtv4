import { NextApiRequest, NextApiResponse } from "next";
import Parser from "rss-parser";
import { formatSitemapDate } from "@/lib/sitemap-cache";

const parser: Parser = new Parser();

const feedsUrls = [
  "https://cms.freemalaysiatoday.com/category/nation/feed/",
  "https://cms.freemalaysiatoday.com/category/top-bm/feed/",
  "https://cms.freemalaysiatoday.com/category/business/feed/",
  "https://cms.freemalaysiatoday.com/category/highlight/feed/",
  "https://cms.freemalaysiatoday.com/category/leisure/feed/",
  "https://cms.freemalaysiatoday.com/category/opinion/feed/",
  "https://cms.freemalaysiatoday.com/category/sports/feed/",
  "https://cms.freemalaysiatoday.com/category/world/feed/",
  "https://cms.freemalaysiatoday.com/feed/",
  "https://www.freemalaysiatoday.com/feeds/rss/nation",
  "https://www.freemalaysiatoday.com/feeds/rss/berita",
  "https://www.freemalaysiatoday.com/feeds/rss/business",
  "https://www.freemalaysiatoday.com/feeds/rss/headlines",
  "https://www.freemalaysiatoday.com/feeds/rss/lifestyle",
  "https://www.freemalaysiatoday.com/feeds/rss/opinion",
  "https://www.freemalaysiatoday.com/feeds/rss/sports",
  "https://www.freemalaysiatoday.com/feeds/rss/world",
  "https://www.freemalaysiatoday.com/feeds/atom/nation",
  "https://www.freemalaysiatoday.com/feeds/atom/berita",
  "https://www.freemalaysiatoday.com/feeds/atom/business",
  "https://www.freemalaysiatoday.com/feeds/atom/headlines",
  "https://www.freemalaysiatoday.com/feeds/atom/lifestyle",
  "https://www.freemalaysiatoday.com/feeds/atom/opinion",
  "https://www.freemalaysiatoday.com/feeds/atom/sports",
  "https://www.freemalaysiatoday.com/feeds/atom/world",
];

async function fetchFeedLastBuildDate(feedUrl: string): Promise<string> {
  try {
    const feed = await parser.parseURL(feedUrl);
    if (feed.lastBuildDate) {
      return formatSitemapDate(new Date(feed.lastBuildDate));
    }
    if (feed.items && feed.items.length > 0 && feed.items[0].pubDate) {
      return formatSitemapDate(new Date(feed.items[0].pubDate));
    }
  } catch (error) {
    console.error(`Error fetching feed ${feedUrl}:`, error);
  }
  return formatSitemapDate(new Date());
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    res.setTimeout(60000);
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");

    const feedPromises = feedsUrls.map((feedUrl) =>
      fetchFeedLastBuildDate(feedUrl)
    );

    const lastBuildDates = await Promise.all(feedPromises);

    const sitemapEntries = feedsUrls
      .map((feedUrl, index) => {
        const feedName = feedUrl.split("/").pop();
        const changefreq = feedName === "headlines" ? "always" : "hourly";
        const priority = feedName === "headlines" ? "0.9" : "0.7";

        return `    <url>
      <loc>${feedUrl}</loc>
      <lastmod>${lastBuildDates[index]}</lastmod>
      <changefreq>${changefreq}</changefreq>
      <priority>${priority}</priority>
    </url>`;
      })
      .join("\n");

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</urlset>`;

    res.write(sitemap.trim());
    res.end();
  } catch (err) {
    console.error("[SITEMAP_ERROR] Feeds sitemap error:", err);
    res.status(500).send(`[SITEMAP_ERROR] Feeds sitemap error: ${err}`);
  }
}
