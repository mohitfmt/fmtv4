import type { NextApiRequest, NextApiResponse } from "next";
import Parser from "rss-parser";
import { transformItemToJSON } from "@/lib/feeds-generator/json-feed-generator";

const parser: Parser = new Parser();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const slug = req.query.slug as string;
  let rssFeedUrl = "";

  switch (slug) {
    case "nation":
      rssFeedUrl = "https://cms.freemalaysiatoday.com/category/nation/feed/";
      break;
    case "berita":
      rssFeedUrl = "https://cms.freemalaysiatoday.com/category/top-bm/feed/";
      break;
    case "business":
      rssFeedUrl = "https://cms.freemalaysiatoday.com/category/business/feed/";
      break;
    case "headlines":
      rssFeedUrl = "https://cms.freemalaysiatoday.com/category/highlight/feed/";
      break;
    case "lifestyle":
      rssFeedUrl = "https://cms.freemalaysiatoday.com/category/leisure/feed/";
      break;
    case "opinion":
      rssFeedUrl = "https://cms.freemalaysiatoday.com/category/opinion/feed/";
      break;
    case "sports":
      rssFeedUrl = "https://cms.freemalaysiatoday.com/category/sports/feed/";
      break;
    case "world":
      rssFeedUrl = "https://cms.freemalaysiatoday.com/category/world/feed/";
      break;
    default:
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
      res.setHeader("Content-Type", "application/json");
      return res.status(404).json({
        error: "Feed not found",
        message:
          "Valid feeds: nation, business, headlines, lifestyle, opinion, sports, world, berita",
      });
  }

  try {
    const feed = await parser.parseURL(rssFeedUrl);
    const jsonFeed = {
      version: "https://jsonfeed.org/version/1.1",
      title: feed?.title,
      home_page_url: feed?.link,
      feed_url: rssFeedUrl,
      description:
        "Explore 24/7 news on politics, economy, and more with Free Malaysia Today. Your source for unbiased Malaysian news in English & Malay since 2009.",
      icon: "https://www.freemalaysiatoday.com/icon-512x512.png",
      favicon: "https://www.freemalaysiatoday.com/favicon.ico",
      language: rssFeedUrl.includes("top-bm") ? "ms" : "en",
      items: feed?.items?.map(transformItemToJSON),
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Cache-Control",
      "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400"
    );
    res.setHeader("CDN-Cache-Control", "public, max-age=3600");
    res.status(200).json(jsonFeed);
  } catch (error) {
    console.error(
      "[FEEDS_API_ERROR] Failed to fetch or parse JSON feed:",
      error
    );
    res.status(500).json({
      error: `[FEEDS_API_ERROR] Failed to fetch or parse JSON feed : ${error}`,
    });
  }
}
