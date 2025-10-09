// pages/api/websub-callback.ts
/**
 * WebSub Handler with Cloudflare CDN Cache Purging
 * SSR VERSION - No ISR revalidation, only CDN purging
 */

import { addMinutes } from "date-fns";
import type { NextApiRequest, NextApiResponse } from "next";
import {
  purgeCloudflareByTags,
  purgeCloudflareByUrls,
} from "@/lib/cache/purge";
import { pingSingleItemFeeds } from "@/lib/websub-single-feed";

// Define types for WordPress API responses
interface WPPost {
  id: number;
  date: string;
  modified: string;
  link: string;
  slug: string;
  title: { rendered: string };
  categories?: number[];
}

// Category mapping based on your navigation structure
const categoryMappings: Record<string, string> = {
  // Main categories
  bahasa: "berita", // CMS "bahasa" → Frontend "/berita"
  leisure: "lifestyle", // CMS "leisure" → Frontend "/lifestyle"
  nation: "news", // CMS "nation" → Frontend "/news"
  business: "business",
  opinion: "opinion",
  sports: "sports",
  world: "world",

  // Subcategory mappings
  tempatan: "berita",
  pandangan: "berita",
  dunia: "berita",
  "local-business": "business",
  "world-business": "business",
  column: "opinion",
  editorial: "opinion",
  letters: "opinion",
  football: "sports",
  badminton: "sports",
  motorsports: "sports",
  tennis: "sports",
  "south-east-asia": "world",

  // Lifestyle subcategories
  "simple-stories": "lifestyle",
  travel: "lifestyle",
  food: "lifestyle",
  entertainment: "lifestyle",
  money: "lifestyle",
  health: "lifestyle",
  pets: "lifestyle",
  tech: "lifestyle",
  automotive: "lifestyle",
  property: "lifestyle",

  // Special mappings
  sabahsarawak: "news", // Borneo+ is under news
  "fmt-worldviews": "opinion",
};

// Complete category ID mapping
const categoryIdToSlugMap: Record<number, string> = {
  // Homepage/Highlights
  127940: "super-highlight",
  45: "highlight",

  // News
  123704: "top-news",
  1: "nation",
  1099: "sabahsarawak",

  // Berita
  187155: "super-bm",
  183: "bahasa",
  118582: "tempatan",
  118583: "dunia",
  118584: "pandangan",
  123705: "top-bm",

  // Opinion
  13: "opinion",
  118585: "column",
  205: "letters",
  313: "editorial",
  311905: "analysis",
  124473: "top-opinion",

  // World
  195: "world",
  127852: "top-world",

  // Lifestyle
  15: "leisure",
  118596: "property",
  130532: "travel",
  118599: "automotive",
  118598: "food",
  118600: "health",
  118601: "entertainment",
  29628: "money",
  160346: "pets",
  188599: "simple-stories",
  222994: "tech",
  127849: "top-lifestyle",

  // Business
  187: "business",
  118602: "world-business",
  118603: "local-business",
  127850: "top-business",

  // Sports
  196: "sports",
  118604: "football",
  150965: "badminton",
  150966: "motorsports",
  118605: "tennis",
  127851: "top-sports",
};

// Priority categories that should trigger homepage updates
const HOMEPAGE_TRIGGER_CATEGORIES = [
  "super-highlight",
  "highlight",
  "top-news",
  "nation",
  "super-bm",
  "top-bm",
  "bahasa",
  "top-opinion",
  "opinion",
  "top-world",
  "world",
  "top-lifestyle",
  "leisure",
  "top-business",
  "business",
  "top-sports",
  "sports",
];

// Lock to prevent concurrent processing
let isProcessing = false;

/**
 * Extract category from article URL - FIXED VERSION
 * This properly handles URL patterns without extracting dates as categories
 */
function extractCategoryFromUrl(url: string): string[] {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);

    // Remove 'category' prefix if present
    if (pathParts[0] === "category") {
      pathParts.shift();
    }

    // Article URLs follow pattern: {section}[/{subsection}]/{year}/{month}/{day}/{slug}
    // We need to extract only the section and subsection, not dates

    const categories: string[] = [];

    // First part is always the main section
    if (pathParts.length > 0) {
      const section = pathParts[0];
      categories.push(section);

      // Check if there's a subsection (only for bahasa currently)
      if (section === "bahasa" && pathParts.length > 1) {
        const potentialSubsection = pathParts[1];

        // Valid bahasa subsections
        const validBahasaSubsections = ["tempatan", "pandangan", "dunia"];
        if (validBahasaSubsections.includes(potentialSubsection)) {
          categories.push(potentialSubsection);
        }
      }
    }

    return categories;
  } catch (error) {
    console.error(`[WebSub] Failed to extract category from ${url}:`, error);
    return [];
  }
}

/**
 * Get frontend category path from WordPress category
 */
function getCategoryPath(category: string): string {
  return categoryMappings[category] || category;
}

/**
 * Get category slugs from WordPress category IDs
 */
function getCategorySlugsFromIds(categoryIds: number[]): string[] {
  return categoryIds.map((id) => categoryIdToSlugMap[id]).filter(Boolean);
}

/**
 * Check if any category should trigger homepage update
 */
function shouldTriggerHomepageUpdate(categorySlugs: string[]): boolean {
  return categorySlugs.some((slug) =>
    HOMEPAGE_TRIGGER_CATEGORIES.includes(slug)
  );
}

/**
 * Get recently modified articles from WordPress - NO DEDUPLICATION
 */
async function getRecentlyModifiedArticles(
  wpDomain: string
): Promise<WPPost[]> {
  try {
    const now = new Date();
    const tenMinutesAgo = addMinutes(now, -10);
    const modifiedAfter = tenMinutesAgo?.toISOString();

    console.log(
      `[WebSub] Fetching posts modified after ${modifiedAfter} (10-minute window)`
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller?.abort(), 20000); // 20 seconds timeout

    try {
      const response = await fetch(
        `${wpDomain}/wp-json/wp/v2/posts?modified_after=${modifiedAfter}&per_page=50&_fields=id,date,modified,link,slug,title,categories`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "WebSub-Subscriber/1.0",
          },
          signal: controller?.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `WordPress API returned ${response?.status}: ${response?.statusText}`
        );
      }

      const posts: WPPost[] = await response.json();

      // NO DEDUPLICATION - Process ALL updates
      console.log(`[WebSub] Found ${posts.length} posts to process`);

      return posts;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        console.error("[WebSub] Request to WordPress API timed out after 20s");
      } else {
        throw error;
      }
      return [];
    }
  } catch (error) {
    console.error("[WebSub] Error fetching modified articles:", error);
    return [];
  }
}

/**
 * Process articles to build cache tags and URLs for purging
 */
async function processArticlesForPurging(
  articles: WPPost[],
  frontendDomain: string
): Promise<{
  cacheTags: string[];
  articleUrls: string[];
  categoryUrls: string[];
  shouldUpdateHomepage: boolean;
}> {
  const cacheTags = new Set<string>();
  const articleUrls: string[] = [];
  const categoryUrls = new Set<string>();
  let shouldUpdateHomepage = false;

  const fullBaseUrl = `https://${frontendDomain}`;

  for (const post of articles) {
    try {
      // Extract categories properly (without dates)
      const urlCategories = extractCategoryFromUrl(post.link);
      const apiCategories = post.categories
        ? getCategorySlugsFromIds(post.categories)
        : [];

      // Combine and deduplicate categories
      const allCategories = [...new Set([...urlCategories, ...apiCategories])];

      // Filter out any invalid "categories" like years
      const validCategories = allCategories.filter(
        (cat) => cat && !cat.match(/^\d{4}$/) && cat.length > 0
      );

      // Extract the article path from the URL
      const urlObj = new URL(post.link);
      const articlePath = urlObj.pathname;

      // Add article URLs for immediate purging
      articleUrls.push(`${fullBaseUrl}${articlePath}`);
      if (!articlePath.endsWith("/")) {
        articleUrls.push(`${fullBaseUrl}${articlePath}/`); // With trailing slash
      }

      // Add cache tags for the article
      cacheTags.add(`article:${post.id}`);
      cacheTags.add(`article:${post.slug}`);
      cacheTags.add(`path:${articlePath}`);

      // Check if homepage should be updated
      if (!shouldUpdateHomepage && shouldTriggerHomepageUpdate(apiCategories)) {
        shouldUpdateHomepage = true;
      }

      // Add category pages and tags
      validCategories.forEach((category) => {
        // Skip if it's a year or other invalid category
        if (category.match(/^\d{4}$/) || !category) return;

        // Category landing page
        const categoryPagePath = `/category/category/${category}`;
        categoryUrls.add(`${fullBaseUrl}${categoryPagePath}`);
        cacheTags.add(`category:${category}`);

        // Also add the friendly URL if it exists
        const friendlyPath = getCategoryPath(category);
        if (friendlyPath !== category) {
          categoryUrls.add(`${fullBaseUrl}/${friendlyPath}`);
          cacheTags.add(`section:${friendlyPath}`);
        }
      });

      // For Bahasa articles, also add the parent category
      if (urlCategories[0] === "bahasa") {
        categoryUrls.add(`${fullBaseUrl}/category/category/bahasa`);
        categoryUrls.add(`${fullBaseUrl}/berita`);
        cacheTags.add("category:bahasa");
        cacheTags.add("section:berita");
      }
    } catch (error) {
      console.error(`[WebSub] Error processing article ${post.id}:`, error);
    }
  }

  // Add homepage if needed
  if (shouldUpdateHomepage) {
    categoryUrls.add(`${fullBaseUrl}/`);
    cacheTags.add("page:home");
    cacheTags.add("homepage");
  }

  return {
    cacheTags: Array.from(cacheTags),
    articleUrls,
    categoryUrls: Array.from(categoryUrls),
    shouldUpdateHomepage,
  };
}

/**
 * Ping feed hubs for updated categories
 */
async function pingFeedHubs(
  categories: Set<string>,
  frontendDomain: string
): Promise<void> {
  const hubUrl = "https://pubsubhubbub.appspot.com/";
  const feedPingPromises: Promise<any>[] = [];

  // Frontend RSS and Atom feeds
  const feedCategories = [
    "news",
    "berita",
    "business",
    "opinion",
    "world",
    "sports",
    "lifestyle",
  ];

  for (const category of feedCategories) {
    if (categories.has(category) || categories.has("homepage")) {
      // RSS feed
      feedPingPromises.push(
        fetch(hubUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            "hub.mode": "publish",
            "hub.url": `https://${frontendDomain}/feeds/rss/${category}`,
          }).toString(),
        }).catch((error) =>
          console.error(
            `[WebSub] Error pinging RSS hub for ${category}:`,
            error
          )
        )
      );

      // Atom feed
      feedPingPromises.push(
        fetch(hubUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            "hub.mode": "publish",
            "hub.url": `https://${frontendDomain}/feeds/atom/${category}`,
          }).toString(),
        }).catch((error) =>
          console.error(
            `[WebSub] Error pinging Atom hub for ${category}:`,
            error
          )
        )
      );
    }
  }

  // CMS feed URLs (always ping main feed on any update)
  const cmsFeeds = [
    "https://cms.freemalaysiatoday.com/category/nation/feed/",
    "https://cms.freemalaysiatoday.com/category/top-bm/feed/",
    "https://cms.freemalaysiatoday.com/category/business/feed/",
    "https://cms.freemalaysiatoday.com/category/highlight/feed/",
    "https://cms.freemalaysiatoday.com/category/leisure/feed/",
    "https://cms.freemalaysiatoday.com/category/opinion/feed/",
    "https://cms.freemalaysiatoday.com/category/sports/feed/",
    "https://cms.freemalaysiatoday.com/category/world/feed/",
    "https://cms.freemalaysiatoday.com/feed/",
  ];

  for (const feedUrl of cmsFeeds) {
    feedPingPromises.push(
      fetch(hubUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          "hub.mode": "publish",
          "hub.url": feedUrl,
        }).toString(),
      }).catch((error) =>
        console.error(`[WebSub] Error pinging hub for ${feedUrl}:`, error)
      )
    );
  }

  // Wait for all feed pings to complete
  await Promise.all(feedPingPromises);
  console.log("[WebSub] All feed pings completed");
}

/**
 * Main handler function
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle subscription verification
  if (req.method === "GET") {
    const { "hub.mode": mode, "hub.challenge": challenge } = req.query;

    if (mode === "subscribe" && challenge) {
      console.log("[WebSub] Subscription verified");
      return res.status(200).send(challenge);
    }

    return res.status(400).json({ error: "Invalid verification request" });
  }

  // Handle content notifications
  if (req.method === "POST") {
    console.log("[WebSub] Received content update notification");

    // Send immediate response
    res.status(200).json({
      success: true,
      message: "Update received, processing in background",
      timestamp: new Date().toISOString(),
    });

    // Process asynchronously
    processWebSubNotification(req).catch((error) => {
      console.error(
        "[WebSub] Background Process WebSub Notification error:",
        error
      );
    });

    return;
  }

  return res.status(405).json({ error: "Method not allowed" });
}

/**
 * Process the WebSub notification in the background
 */
async function processWebSubNotification(req: NextApiRequest): Promise<void> {
  if (isProcessing) {
    console.log("[WebSub] Already processing, queuing for next cycle");
    setTimeout(() => processWebSubNotification(req), 5000);
    return;
  }

  try {
    isProcessing = true;
    const startTime = Date.now();
    console.log("[WebSub] Background processing started");

    // Get domains
    const wpDomain =
      process.env.NEXT_PUBLIC_CMS_URL || "https://cms.freemalaysiatoday.com";
    const frontendDomain =
      process.env.NEXT_PUBLIC_DOMAIN || "www.freemalaysiatoday.com";

    // Get recently modified articles
    const modifiedArticles = await getRecentlyModifiedArticles(wpDomain);

    // Ping single item feeds (if this function exists)
    if (typeof pingSingleItemFeeds === "function") {
      await pingSingleItemFeeds(modifiedArticles, frontendDomain);
    }

    if (modifiedArticles.length === 0) {
      console.log("[WebSub] No articles to process");
      isProcessing = false;
      return;
    }

    console.log(
      `[WebSub] Processing ${modifiedArticles.length} modified articles`
    );

    // Process articles and build cache purge data
    const { cacheTags, articleUrls, categoryUrls, shouldUpdateHomepage } =
      await processArticlesForPurging(modifiedArticles, frontendDomain);

    // Track affected categories for feed pings
    const affectedCategories = new Set<string>();
    categoryUrls.forEach((url) => {
      const match = url.match(
        /\/(news|berita|business|opinion|world|sports|lifestyle)/
      );
      if (match) affectedCategories.add(match[1]);
    });
    if (shouldUpdateHomepage) affectedCategories.add("homepage");

    // IMMEDIATE Cloudflare URL purge for articles (highest priority)
    if (articleUrls.length > 0) {
      console.log(
        `[WebSub] Immediate Cloudflare purge for ${articleUrls.length} article URLs`
      );
      purgeCloudflareByUrls(articleUrls)
        .then(() => console.log("[WebSub] Article URL purge completed"))
        .catch((err) =>
          console.error("[WebSub] Article URL purge failed:", err)
        );
    }

    // Parallel Cloudflare tag purging
    if (cacheTags.length > 0) {
      console.log(`[WebSub] Purging ${cacheTags.length} Cloudflare cache tags`);

      const TAG_BATCH_SIZE = 30;
      const purgePromises = [];

      for (let i = 0; i < cacheTags.length; i += TAG_BATCH_SIZE) {
        const batch = cacheTags.slice(i, i + TAG_BATCH_SIZE);
        purgePromises.push(
          purgeCloudflareByTags(batch).catch((err) =>
            console.error(`[WebSub] Cloudflare tag purge batch failed:`, err)
          )
        );
      }

      // Don't wait for all purges to complete - fire and forget
      Promise.all(purgePromises)
        .then(() => console.log("[WebSub] All tag purges completed"))
        .catch((err) => console.error("[WebSub] Tag purge error:", err));
    }

    // Purge category URLs (lower priority than articles)
    if (categoryUrls.length > 0) {
      console.log(`[WebSub] Purging ${categoryUrls.length} category page URLs`);

      // Batch category URL purges
      const CATEGORY_BATCH_SIZE = 20;
      for (let i = 0; i < categoryUrls.length; i += CATEGORY_BATCH_SIZE) {
        const batch = categoryUrls.slice(i, i + CATEGORY_BATCH_SIZE);
        purgeCloudflareByUrls(batch)
          .then(() =>
            console.log(
              `[WebSub] Category batch ${i / CATEGORY_BATCH_SIZE + 1} purged`
            )
          )
          .catch((err) =>
            console.error(`[WebSub] Category URL purge failed:`, err)
          );
      }
    }

    // Ping feed hubs (non-blocking)
    pingFeedHubs(affectedCategories, frontendDomain).catch((error) => {
      console.error("[WebSub] Feed hub ping error:", error);
    });

    const processingTime = Date.now() - startTime;
    console.log(
      `[WebSub] Background processing completed in ${processingTime}ms`
    );
  } catch (error) {
    console.error("[WebSub] Background processing error:", error);
  } finally {
    isProcessing = false;
  }
}
