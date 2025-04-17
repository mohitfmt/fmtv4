import { NextApiRequest, NextApiResponse } from "next";
import Parser from "rss-parser";

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
  "https://www.freemalaysiatoday.com/feeds/rss/nation/",
  "https://www.freemalaysiatoday.com/feeds/rss/berita/",
  "https://www.freemalaysiatoday.com/feeds/rss/business/",
  "https://www.freemalaysiatoday.com/feeds/rss/headlines/",
  "https://www.freemalaysiatoday.com/feeds/rss/lifestyle/",
  "https://www.freemalaysiatoday.com/feeds/rss/opinion/",
  "https://www.freemalaysiatoday.com/feeds/rss/sports/",
  "https://www.freemalaysiatoday.com/feeds/rss/world/",
  "https://www.freemalaysiatoday.com/feeds/atom/nation/",
  "https://www.freemalaysiatoday.com/feeds/atom/berita/",
  "https://www.freemalaysiatoday.com/feeds/atom/business/",
  "https://www.freemalaysiatoday.com/feeds/atom/headlines/",
  "https://www.freemalaysiatoday.com/feeds/atom/lifestyle/",
  "https://www.freemalaysiatoday.com/feeds/atom/opinion/",
  "https://www.freemalaysiatoday.com/feeds/atom/sports/",
  "https://www.freemalaysiatoday.com/feeds/atom/world/",
];

async function fetchFeedLastBuildDate(feedUrl: string) {
  try {
    const feed = await parser.parseURL(feedUrl);

    // For Atom feeds
    if (feed.feed) {
      if (feed.feed.updated) return feed.feed.updated;
      if (feed.items && feed.items.length > 0 && feed.items[0].updated)
        return feed.items[0].updated;
      // Fallback to current date if no date found
      return new Date().toISOString();
    }

    // For RSS feeds
    if (feed.lastBuildDate) return feed.lastBuildDate;
    if (feed.items && feed.items.length > 0 && feed.items[0].pubDate)
      return feed.items[0].pubDate;

    // Fallback to current date if no date found
    return new Date().toISOString();
  } catch (error) {
    console.error(`Error fetching feed ${feedUrl}:`, error);
    // Return current date as fallback instead of null
    return new Date().toISOString();
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Increase timeout for potentially slow feed responses
    res.setTimeout(60000);

    const feedPromises = feedsUrls.map((feedUrl) =>
      fetchFeedLastBuildDate(feedUrl)
    );

    const lastBuildDates = await Promise.all(feedPromises);

    const sitemapIndexEntries = feedsUrls
      .map((feedUrl, index) => {
        const lastBuildDate = lastBuildDates[index];
        return `    <sitemap>
      <loc>${feedUrl}</loc>
      <lastmod>${new Date(lastBuildDate).toISOString()}</lastmod>
    </sitemap>`;
      })
      .join("\n");

    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapIndexEntries}
</sitemapindex>`;

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
    res.write(sitemapIndex.trim());
    res.end();
  } catch (err) {
    console.error("Sitemap fetching error:", err);
    res.status(500).send("Internal Server Error: Sitemap fetching error");
  }
}
