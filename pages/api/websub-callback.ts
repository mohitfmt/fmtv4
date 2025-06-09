// pages/api/websub-callback.ts
/**
 * Complete WebSub Handler with Smart Cache Integration
 * OPTIMIZED VERSION with correct priority handling
 */

import { addMinutes } from "date-fns";
import type { NextApiRequest, NextApiResponse } from "next";
import { mutate } from "swr";
import { getAllNavigationPaths } from "../../lib/navigation-cache";
import PQueue from "p-queue";
import { changeManager } from "@/lib/cache/smart-cache-registry";
import { purgeCloudflareByTags } from "@/lib/cache/purge";

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

// UPDATED: Category mapping based on your navigation structure
const categoryMappings: Record<string, string> = {
  // Main categories
  bahasa: "berita", // CMS "bahasa" → Frontend "/berita"
  leisure: "lifestyle", // CMS "leisure" → Frontend "/lifestyle"
  nation: "news", // CMS "nation" → Frontend "/news"
  business: "business",
  opinion: "opinion",
  sports: "sports",
  world: "world",

  // Subcategory mappings (if needed)
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

// Priority levels for different types of content
const PRIORITY = {
  CRITICAL: 1, // Article pages
  HIGH: 2, // Homepage
  MEDIUM: 3, // Category pages
  LOW: 4, // Tags, authors
};

// OPTIMIZED: Increased concurrency for better throughput
const criticalQueue = new PQueue({ concurrency: 10 }); // Articles (was 2)
const highQueue = new PQueue({ concurrency: 5 }); // Homepage (was 3)
const mediumQueue = new PQueue({ concurrency: 20 }); // Categories (was 5)
const lowQueue = new PQueue({ concurrency: 10 }); // Tags/authors (was 2)

// Track processing to prevent duplicates
const processingArticles = new Set<string>();
const recentlyProcessed = new Map<string, number>();
const DEDUP_WINDOW = 5 * 60 * 1000; // 5 minutes

// Lock to prevent concurrent processing
let isProcessing = false;

// UPDATED: Complete category ID mapping
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

/**
 * Extract category from article URL
 * This handles your complex URL patterns
 */
function extractCategoryFromUrl(url: string): string[] {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);

    // Handle URL pattern with category/category/ prefix
    if (
      pathParts.length >= 3 &&
      pathParts[0] === "category" &&
      pathParts[1] === "category"
    ) {
      const category = pathParts[2];

      // Check for subcategory
      if (pathParts.length >= 4) {
        return [category, pathParts[3]];
      }

      return [category];
    }
    // Handle normal category structure
    else if (pathParts.length >= 2 && pathParts[0] === "category") {
      const category = pathParts[1];

      if (pathParts.length >= 3) {
        return [category, pathParts[2]];
      }

      return [category];
    }

    return [];
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
 * Normalize path for revalidation
 */
function normalizePathForRevalidation(path: string): string {
  const normalizedPath = path.startsWith("/") ? path.substring(1) : path;

  const mainSections = [
    "news",
    "berita",
    "business",
    "opinion",
    "world",
    "sports",
    "lifestyle",
  ];

  if (mainSections.includes(normalizedPath)) {
    return normalizedPath;
  }

  const specialPages = [
    "photos",
    "videos",
    "accelerator",
    "contact-us",
    "about",
    "advertise",
    "privacy-policy",
    "property",
    "education",
    "carzilla",
  ];

  if (specialPages.some((page) => normalizedPath === page)) {
    return normalizedPath;
  }

  if (normalizedPath.startsWith("category/category/")) {
    return normalizedPath;
  }

  if (normalizedPath.startsWith("category/")) {
    return normalizedPath;
  }

  return `category/${normalizedPath}`;
}

/**
 * OPTIMIZED: Get recently modified articles from WordPress with deduplication
 */
async function getRecentlyModifiedArticles(
  wpDomain: string
): Promise<WPPost[]> {
  try {
    const now = new Date();
    // OPTIMIZED: Reduced window to 5 minutes to minimize duplicates
    const fiveMinutesAgo = addMinutes(now, -5);
    const modifiedAfter = fiveMinutesAgo?.toISOString();

    console.log(
      `[WebSub] Fetching posts modified after ${modifiedAfter} (5-minute window)`
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller?.abort(), 10000);

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

      // OPTIMIZED: Filter out recently processed articles
      const uniquePosts = posts.filter((post) => {
        const lastProcessed = recentlyProcessed.get(post.id.toString());
        if (lastProcessed && Date.now() - lastProcessed < DEDUP_WINDOW) {
          console.log(
            `[WebSub] Skipping recently processed article ${post.id}`
          );
          return false;
        }
        return true;
      });

      console.log(
        `[WebSub] Found ${posts.length} posts, ${uniquePosts.length} after deduplication`
      );

      return uniquePosts;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        console.error("[WebSub] Request to WordPress API timed out after 10s");
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
 * OPTIMIZED: Process articles to get cache tags and revalidation items
 */
async function processArticlesForRevalidation(
  articles: WPPost[],
  frontendDomain: string
): Promise<{
  cacheTags: string[];
  revalidationItems: {
    path: string;
    type: string;
    categories?: string[];
    priority: number;
  }[];
  shouldUpdateHomepage: boolean;
  affectedPaths: Set<string>;
}> {
  const cacheTags = new Set<string>();
  const revalidationItems: any[] = [];
  const affectedPaths = new Set<string>();
  let shouldUpdateHomepage = false;

  // Get all navigation paths
  const allNavigationPaths = getAllNavigationPaths();

  // Process each article and trigger immediate cache invalidation
  for (const post of articles) {
    try {
      // Get categories from URL and API
      const urlCategories = extractCategoryFromUrl(post.link);
      const apiCategories = post.categories
        ? getCategorySlugsFromIds(post.categories)
        : [];

      const allCategories = [...new Set([...urlCategories, ...apiCategories])];

      // Create content change event for smart cache
      const isNew =
        new Date(post.date).getTime() === new Date(post.modified).getTime();
      const event = {
        type: isNew ? ("new" as const) : ("update" as const),
        articleId: post.id.toString(),
        slug: post.slug,
        categories: allCategories,
        timestamp: new Date(post.modified),
        priority: "normal" as const,
      };

      // Trigger smart cache invalidation immediately
      changeManager.handleContentChange(event);

      // Wait a bit for cache processing
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Collect affected paths from change manager
      const smartCachePaths = changeManager.getAffectedPaths();
      smartCachePaths.forEach((path) => affectedPaths.add(path));

      // Check if homepage should be updated
      if (!shouldUpdateHomepage && shouldTriggerHomepageUpdate(allCategories)) {
        shouldUpdateHomepage = true;
        cacheTags.add("path:/");
        cacheTags.add("page:home");
        affectedPaths.add("/");
      }

      // Add category-related cache tags and paths
      allCategories.forEach((category) => {
        if (!category) return;

        cacheTags.add(`category:${category}`);

        const frontendPath = `/${getCategoryPath(category)}`;
        cacheTags.add(`path:${frontendPath}`);
        cacheTags.add(`section:${getCategoryPath(category)}`);

        affectedPaths.add(frontendPath);
        affectedPaths.add(`/category/category/${category}`);

        // Add parent category paths
        const parentSection = getCategoryPath(category);
        if (parentSection !== category) {
          affectedPaths.add(`/${parentSection}`);
        }

        // Add subcategory paths
        const navigationPath = allNavigationPaths.find(
          (path: string) =>
            path.includes(category) || path.includes(parentSection)
        );
        if (navigationPath) {
          affectedPaths.add(navigationPath);
        }
      });

      // Process article path
      const urlObj = new URL(post.link);
      const pathWithoutDomain = urlObj.pathname.substring(1);
      const articlePath = normalizePathForRevalidation(pathWithoutDomain);

      cacheTags.add(`path:/${articlePath}`);
      cacheTags.add(`post:${post.slug}`);
      affectedPaths.add(`/${articlePath}`);

      // PRIORITY 1: Add article to revalidation (CRITICAL)
      revalidationItems.push({
        type: "post",
        path: articlePath,
        categories: allCategories,
        priority: PRIORITY.CRITICAL,
      });
    } catch (error) {
      console.error(`[WebSub] Error processing article ${post.id}:`, error);
    }
  }

  // PRIORITY 2: Add homepage if needed (HIGH)
  if (shouldUpdateHomepage) {
    revalidationItems.push({
      type: "homepage",
      path: "/",
      priority: PRIORITY.HIGH,
    });
    affectedPaths.add("/");
  }

  // PRIORITY 3: Add all affected main sections
  affectedPaths.forEach((path) => {
    if (!revalidationItems.some((item) => item.path === path)) {
      let priority = PRIORITY.MEDIUM;

      if (path === "/") {
        priority = PRIORITY.HIGH; // Already handled above
      } else if (
        path.match(/^\/(news|berita|business|opinion|world|sports|lifestyle)$/)
      ) {
        priority = PRIORITY.MEDIUM; // Category pages
      } else if (path.includes("/tag/") || path.includes("/author/")) {
        priority = PRIORITY.LOW; // Tags/authors
      } else if (!path.includes("/category/")) {
        // It's likely an article path not already added
        priority = PRIORITY.CRITICAL;
      }

      if (!revalidationItems.some((item) => item.path === path)) {
        revalidationItems.push({
          type:
            path === "/"
              ? "homepage"
              : priority === PRIORITY.CRITICAL
                ? "post"
                : "category",
          path,
          priority,
        });
      }
    }
  });

  return {
    cacheTags: Array.from(cacheTags),
    revalidationItems,
    shouldUpdateHomepage,
    affectedPaths,
  };
}

/**
 * OPTIMIZED: Process a single revalidation request
 */
async function processRevalidationItem(
  baseUrl: string,
  item: { path: string; type: string; categories?: string[]; priority: number },
  revalidateKey: string
): Promise<boolean> {
  const requestBody: any = {
    type: item.type,
    [item.type === "post" ? "postSlug" : "path"]: item.path,
  };

  if (item.type === "post" && item.categories && item.categories.length > 0) {
    requestBody.categories = item.categories;
  }

  // OPTIMIZED: Reduced retry attempts for faster processing
  const maxRetries = item.priority <= PRIORITY.HIGH ? 2 : 1;
  let attempts = 0;

  while (attempts <= maxRetries) {
    try {
      const controller = new AbortController();
      // OPTIMIZED: Reduced timeout for faster failure detection
      const timeout = item.priority <= PRIORITY.HIGH ? 15000 : 10000;
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${baseUrl}/api/revalidate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-revalidate-key": revalidateKey,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(
          `[WebSub] Successfully revalidated ${item.type} ${item.path}`
        );
        return true;
      } else {
        const result = await response.json();
        throw new Error(result?.message || "Unknown error");
      }
    } catch (error: any) {
      attempts++;

      if (attempts <= maxRetries) {
        // OPTIMIZED: Shorter retry delays
        const baseDelay = item.priority <= PRIORITY.HIGH ? 500 : 1000;
        const delay = Math.floor(baseDelay * Math.pow(1.5, attempts));

        console.log(
          `[WebSub] Retry ${attempts}/${maxRetries} for ${item.type} ${item.path} in ${delay}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error(
          `[WebSub] Failed to revalidate ${item.type} ${item.path}:`,
          error
        );
        return false;
      }
    }
  }

  return false;
}

/**
 * OPTIMIZED: Process revalidation with priority queuing
 */
async function processRevalidationOptimized(
  baseUrl: string,
  items: any[],
  revalidateKey: string,
  affectedPaths: Set<string>
): Promise<void> {
  if (items.length === 0 && affectedPaths.size === 0) return;

  console.log(
    `[WebSub] Revalidating ${items.length} items + ${affectedPaths.size} affected paths`
  );

  // Combine all paths
  const allPaths = new Set<string>();
  items.forEach((item) => allPaths.add(item.path));
  affectedPaths.forEach((path) => allPaths.add(path));

  // Convert to priority items
  const allItems = Array.from(allPaths).map((path) => {
    const existingItem = items.find((item) => item.path === path);
    if (existingItem) return existingItem;

    // Determine priority based on path
    let priority = PRIORITY.MEDIUM;
    if (path === "/") {
      priority = PRIORITY.HIGH; // Homepage
    } else if (
      path.match(/^\/(news|berita|business|opinion|world|sports|lifestyle)$/)
    ) {
      priority = PRIORITY.MEDIUM; // Category pages
    } else if (path.includes("/tag/") || path.includes("/author/")) {
      priority = PRIORITY.LOW; // Tags/Authors
    } else {
      priority = PRIORITY.CRITICAL; // Assume it's an article
    }

    return {
      type:
        path === "/"
          ? "homepage"
          : path.includes("/") &&
              !path.match(
                /^\/(news|berita|business|opinion|world|sports|lifestyle)$/
              )
            ? "post"
            : "category",
      path,
      priority,
    };
  });

  // Group by priority
  const priorityGroups = {
    [PRIORITY.CRITICAL]: allItems.filter(
      (item) => item.priority === PRIORITY.CRITICAL
    ),
    [PRIORITY.HIGH]: allItems.filter((item) => item.priority === PRIORITY.HIGH),
    [PRIORITY.MEDIUM]: allItems.filter(
      (item) => item.priority === PRIORITY.MEDIUM
    ),
    [PRIORITY.LOW]: allItems.filter((item) => item.priority === PRIORITY.LOW),
  };

  // Clear queues
  criticalQueue.clear();
  highQueue.clear();
  mediumQueue.clear();
  lowQueue.clear();

  // OPTIMIZED: Queue all items by priority
  const queueMap = {
    [PRIORITY.CRITICAL]: criticalQueue,
    [PRIORITY.HIGH]: highQueue,
    [PRIORITY.MEDIUM]: mediumQueue,
    [PRIORITY.LOW]: lowQueue,
  };

  // Queue all items
  Object.entries(priorityGroups).forEach(([priority, items]) => {
    const numPriority = Number(priority);
    if (items.length > 0) {
      const queue = queueMap[numPriority];
      console.log(
        `[WebSub] Queuing ${items.length} items with priority ${numPriority}`
      );

      items.forEach((item) => {
        queue.add(() => processRevalidationItem(baseUrl, item, revalidateKey));
      });
    }
  });

  // Process queues in priority order
  await criticalQueue.onIdle();
  console.log(`[WebSub] Critical queue (articles) processed`);

  await highQueue.onIdle();
  console.log(`[WebSub] High priority queue (homepage) processed`);

  // Process medium and low priority queues in parallel
  await Promise.all([mediumQueue.onIdle(), lowQueue.onIdle()]);

  console.log(`[WebSub] All revalidation queues processed`);
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
      console.error("[WebSub] Background processing error:", error);
    });

    return;
  }

  return res.status(405).json({ error: "Method not allowed" });
}

/**
 * ENHANCED: Process the WebSub notification in the background
 */
async function processWebSubNotification(req: NextApiRequest): Promise<void> {
  if (isProcessing) {
    console.log("[WebSub] Already processing, queuing for next cycle");
    // OPTIMIZED: Queue the request instead of skipping
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
    const revalidateKey = process.env.REVALIDATE_SECRET_KEY || "default-secret";

    // Set up base URL
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host || frontendDomain;
    const baseUrl = `${protocol}://${host}`;

    // Get recently modified articles with deduplication
    const modifiedArticles = await getRecentlyModifiedArticles(wpDomain);

    if (modifiedArticles.length === 0) {
      console.log("[WebSub] No new articles to process");
      isProcessing = false;
      return;
    }

    // Track processed articles
    modifiedArticles.forEach((article) => {
      recentlyProcessed.set(article.id.toString(), Date.now());
    });

    // Clean up old entries
    const cutoffTime = Date.now() - DEDUP_WINDOW;
    for (const [id, timestamp] of recentlyProcessed.entries()) {
      if (timestamp < cutoffTime) {
        recentlyProcessed.delete(id);
      }
    }

    console.log(
      `[WebSub] Processing ${modifiedArticles.length} modified articles`
    );

    // OPTIMIZED: Process smart cache invalidation in parallel batches
    const SMART_CACHE_BATCH_SIZE = 10;
    for (let i = 0; i < modifiedArticles.length; i += SMART_CACHE_BATCH_SIZE) {
      const batch = modifiedArticles.slice(i, i + SMART_CACHE_BATCH_SIZE);

      await Promise.all(
        batch.map(async (post) => {
          try {
            const urlCategories = extractCategoryFromUrl(post.link);
            const apiCategories = post.categories
              ? getCategorySlugsFromIds(post.categories)
              : [];

            const allCategories = [
              ...new Set([...urlCategories, ...apiCategories]),
            ];

            const isNew =
              new Date(post.date).getTime() ===
              new Date(post.modified).getTime();

            const event = {
              type: isNew ? ("new" as const) : ("update" as const),
              articleId: post.id.toString(),
              slug: post.slug,
              categories: allCategories,
              timestamp: new Date(post.modified),
              priority: "normal" as const,
            };

            changeManager.handleContentChange(event);
          } catch (error) {
            console.error(
              `[WebSub] Error processing article ${post.id}:`,
              error
            );
          }
        })
      );

      // Small delay between batches
      if (i + SMART_CACHE_BATCH_SIZE < modifiedArticles.length) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    // Process articles and get all affected paths
    const {
      cacheTags,
      revalidationItems,
      shouldUpdateHomepage,
      affectedPaths,
    } = await processArticlesForRevalidation(modifiedArticles, frontendDomain);

    // OPTIMIZED: Parallel Cloudflare purging (don't wait)
    if (cacheTags.length > 0) {
      console.log(`[WebSub] Purging ${cacheTags.length} Cloudflare cache tags`);

      const TAG_BATCH_SIZE = 30;
      const purgePromises = [];

      for (let i = 0; i < cacheTags.length; i += TAG_BATCH_SIZE) {
        const batch = cacheTags.slice(i, i + TAG_BATCH_SIZE);
        purgePromises.push(
          purgeCloudflareByTags(batch).catch((err) =>
            console.error(`[WebSub] Cloudflare purge batch failed:`, err)
          )
        );
      }

      // Don't wait for all purges to complete
      Promise.all(purgePromises).then(() =>
        console.log("[WebSub] All Cloudflare purges completed")
      );
    }

    // Process Next.js revalidation with affected paths
    await processRevalidationOptimized(
      baseUrl,
      revalidationItems,
      revalidateKey,
      affectedPaths
    );

    const processingTime = Date.now() - startTime;
    console.log(`[WebSub] Processing completed in ${processingTime}ms`);

    // Ping IndexNow for SEO (async)
    const indexNowKey = "fmt-news-indexnow-2025-mht-9f7b24a1a6";
    const indexNowUrls = modifiedArticles.map((post) => {
      const url = new URL(post.link);
      url.hostname = frontendDomain;
      return url.toString();
    });

    if (indexNowUrls.length > 0) {
      fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          host: frontendDomain,
          key: indexNowKey,
          urlList: indexNowUrls,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            console.error(`[IndexNow] Batch ping failed: ${response.status}`);
          } else {
            console.log(
              `[IndexNow] Successfully pinged ${indexNowUrls.length} URLs`
            );
          }
        })
        .catch((err) => {
          console.error("[IndexNow] Error with batch ping:", err);
        });
    }

    // Revalidate API endpoints only if necessary
    if (shouldUpdateHomepage) {
      try {
        await fetch(`${baseUrl}/api/top-news`, { method: "POST" });
        mutate("/api/top-news");
        console.log(`[WebSub] API endpoints revalidated`);
      } catch (error) {
        console.error(`[WebSub] Error revalidating API endpoints:`, error);
      }
    }

    // CRITICAL: Ping all your feed URLs (async)
    const hubUrl = "https://pubsubhubbub.appspot.com/";

    // Frontend feed URLs
    const frontendFeeds = [
      "nation",
      "berita",
      "business",
      "headlines",
      "lifestyle",
      "opinion",
      "sports",
      "world",
    ];

    // Batch feed pings
    const feedPingPromises = [];

    for (const category of frontendFeeds) {
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

    // CMS feed URLs
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

    console.log("[WebSub] Background processing completed successfully");
  } catch (error) {
    console.error("[WebSub] Background processing error:", error);
  } finally {
    isProcessing = false;
  }
}

// Helper function to ping IndexNow
async function pingIndexNow(articles: WPPost[], domain: string): Promise<void> {
  try {
    const urls = articles.map((article) => {
      const url = new URL(article.link);
      url.hostname = domain;
      return url.toString();
    });

    const indexNowKey = "fmt-news-indexnow-2025-mht-9f7b24a1a6";

    if (!indexNowKey || urls.length === 0) return;

    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: domain,
        key: indexNowKey,
        keyLocation: `https://${domain}/${indexNowKey}.txt`,
        urlList: urls,
      }),
    });

    if (response.ok) {
      console.log(`[WebSub] IndexNow pinged for ${urls.length} URLs`);
    }
  } catch (error) {
    console.error("[WebSub] IndexNow ping failed:", error);
  }
}

// Helper function to ping feeds
async function pingFeeds(domain: string): Promise<void> {
  try {
    const feedUrls = [
      `https://${domain}/feed`,
      `https://${domain}/rss`,
      `https://${domain}/sitemap.xml`,
    ];

    await Promise.all(
      feedUrls.map((url) => fetch(url, { method: "HEAD" }).catch(() => {}))
    );

    console.log("[WebSub] Feed endpoints pinged");
  } catch (error) {
    console.error("[WebSub] Feed ping failed:", error);
  }
}
