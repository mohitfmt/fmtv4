// pages/api/websub-callback.ts
import { addMinutes } from "date-fns";
import type { NextApiRequest, NextApiResponse } from "next";
import { mutate } from "swr";
import { getAllNavigationPaths } from "../../lib/navigation-cache";
import PQueue from "p-queue";

// Define types for WordPress API responses
interface WPPost {
  id: number;
  date: string;
  modified: string;
  link: string;
  slug: string;
  title: { rendered: string };
  categories: number[];
}

// Category mapping for frontend routes
const categoryMappings: Record<string, string> = {
  bahasa: "berita",
  leisure: "lifestyle",
  nation: "news",
  business: "business",
  opinion: "opinion",
  sports: "sports",
  world: "world",
};

// Priority levels for different types of content
const PRIORITY = {
  CRITICAL: 1, // Homepage and breaking news
  HIGH: 2, // Main section pages
  MEDIUM: 3, // Individual articles
  LOW: 4, // Archive pages and less important content
};

// Create queues with different concurrency levels
const criticalQueue = new PQueue({ concurrency: 2 });
const highQueue = new PQueue({ concurrency: 3 });
const mediumQueue = new PQueue({ concurrency: 5 });
const lowQueue = new PQueue({ concurrency: 2 });

// Track when queues are processing
let isProcessing = false;

/**
 * Transforms WordPress URLs to the frontend domain
 */
function transformUrl(url: string, targetDomain: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.hostname = targetDomain;
    return urlObj.toString();
  } catch (error) {
    console.error("[WebSub] Failed to transform URL ${url}:", error);
    return url;
  }
}

/**
 * Extract category from article URL
 * Handles both standard and bahasa subcategory URLs
 */
function extractCategoryFromUrl(url: string): string[] {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);

    // Handle URL pattern with category/category/ prefix (from sitemap)
    if (
      pathParts.length >= 3 &&
      pathParts[0] === "category" &&
      pathParts[1] === "category"
    ) {
      const category = pathParts[2];

      // Special case for bahasa (has subcategories)
      if (category === "bahasa" && pathParts.length >= 4) {
        return ["bahasa", pathParts[3]]; // Return both bahasa and its subcategory
      }

      return [category];
    }
    // Handle normal category structure: /category/categoryName/...
    else if (pathParts.length >= 2 && pathParts[0] === "category") {
      const category = pathParts[1];

      // Special case for bahasa (has subcategories)
      if (category === "bahasa" && pathParts.length >= 3) {
        return ["bahasa", pathParts[2]]; // Return both bahasa and its subcategory
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
  return categoryMappings[category] || "news";
}

/**
 * Map category IDs to slugs using a cache/lookup table
 */
const categoryIdToSlugMap: Record<number, string> = {
  // You should populate this with your actual category mappings
  // These are example mappings - replace with your actual values
  1: "nation",
  2: "business",
  3: "world",
  4: "sports",
  5: "opinion",
  6: "bahasa",
  7: "leisure",
  // Add more category mappings as needed
};

/**
 * Get category slugs from WordPress category IDs
 */
function getCategorySlugsFromIds(categoryIds: number[]): string[] {
  return categoryIds.map((id) => categoryIdToSlugMap[id]).filter(Boolean); // Remove undefined/null values
}

/**
 * Normalize path for revalidation to ensure consistency
 */
function normalizePathForRevalidation(path: string): string {
  // Remove leading slash if present
  const normalizedPath = path.startsWith("/") ? path.substring(1) : path;

  // Handle main section pages
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

  // Handle special pages
  const specialPages = [
    "photos",
    "videos",
    "accelerator",
    "contact-us",
    "about",
    "advertise",
    "privacy-policy",
  ];
  if (specialPages.some((page) => normalizedPath === page)) {
    return normalizedPath;
  }

  // Handle double category paths like category/category/nation
  if (normalizedPath.startsWith("category/category/")) {
    return normalizedPath;
  }

  // Handle single category paths, preserving them
  if (normalizedPath.startsWith("category/")) {
    return normalizedPath;
  }

  // For article paths, ensure they have category/ prefix
  return `category/${normalizedPath}`;
}

/**
 * Get recently modified articles from WordPress
 * Uses a 15-minute window to ensure we don't miss anything
 */
async function getRecentlyModifiedArticles(
  wpDomain: string
): Promise<WPPost[]> {
  try {
    // Get posts modified in the last 15 minutes
    const now = new Date();
    const fifteenMinsAgo = addMinutes(now, -15);
    const modifiedAfter = fifteenMinsAgo.toISOString();

    console.log(
      `[WebSub] Fetching posts modified after ${modifiedAfter} (15-minute window)`
    );

    // Use AbortController for timeout instead of the timeout option
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

    try {
      const response = await fetch(
        `${wpDomain}/wp-json/wp/v2/posts?modified_after=${modifiedAfter}&per_page=50`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "WebSub-Subscriber/1.0",
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `WordPress API returned ${response.status}: ${response.statusText}`
        );
      }

      const posts: WPPost[] = await response.json();
      console.log(
        `[WebSub] Found ${posts.length} recently modified posts in 15-minute window`
      );

      return posts;
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
 * Purge Cloudflare cache by tags - much more efficient than purging by URL
 * Aligned with the cache tag structure in middleware.ts
 */
async function purgeByTags(tags: string[]): Promise<boolean> {
  if (!process.env.CLOUDFLARE_ZONE_ID || !process.env.CLOUDFLARE_API_TOKEN) {
    console.warn("[Cache] Cloudflare credentials not configured");
    return false;
  }

  if (tags.length === 0) {
    console.log("[Cache] No tags to purge");
    return true;
  }

  try {
    console.log(
      `[Cache] Purging content with tags from Cloudflare: ${tags.join(", ")}`
    );

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/purge_cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tags: tags }),
      }
    );

    const result = await response.json();
    if (!result.success) {
      throw new Error(
        `Cloudflare tag purge failed: ${result.errors?.[0]?.message}`
      );
    }

    console.log(
      `[Cache] Successfully purged content with tags: ${tags.join(", ")}`
    );
    return true;
  } catch (error) {
    console.error("[Cache] Tag purge request failed:", error);
    return false;
  }
}

/**
 * Process articles to get cache tags to purge and paths to revalidate
 * Aligned with the cache tag structure in middleware.ts
 */
function processArticles(
  articles: WPPost[],
  frontendDomain: string
): {
  cacheTags: {
    critical: string[];
    high: string[];
    medium: string[];
    low: string[];
  };
  revalidationItems: {
    path: string;
    type: string;
    categories?: string[];
    priority: number;
  }[];
} {
  // Separate new vs updated articles
  const newArticles = articles.filter(
    (post) =>
      new Date(post.date).getTime() === new Date(post.modified).getTime()
  );
  const updatedArticles = articles.filter(
    (post) =>
      new Date(post.date).getTime() !== new Date(post.modified).getTime()
  );

  console.log(
    `[WebSub] Processing ${newArticles.length} new articles and ${updatedArticles.length} updated articles`
  );

  // Initialize cache tag collections by priority
  const cacheTags = {
    critical: new Set<string>(),
    high: new Set<string>(),
    medium: new Set<string>(),
    low: new Set<string>(),
  };

  // Always include homepage in critical tags
  cacheTags.critical.add("path:/");
  cacheTags.critical.add("page:home");

  // Get all navigation paths for potential revalidation
  const allNavigationPaths = getAllNavigationPaths();

  // Add main navigation sections to high priority
  allNavigationPaths.forEach((path: string) => {
    if (!path.includes("/category/") && path !== "/") {
      const section = path.split("/").filter(Boolean)[0];
      if (section) {
        cacheTags.high.add(`section:${section}`);
        cacheTags.high.add(`path:${path}`);
      }
    }
  });

  // Items for revalidation with priority
  const revalidationItems: {
    path: string;
    type: string;
    categories?: string[];
    priority: number;
  }[] = [];

  // Process each article for revalidation and cache tags
  [...newArticles, ...updatedArticles].forEach((post) => {
    try {
      // Get categories from the post - both from URL and API if available
      const urlCategories = extractCategoryFromUrl(post.link);
      const apiCategories = post.categories
        ? getCategorySlugsFromIds(post.categories)
        : [];

      // Combine all categories (remove duplicates)
      const allCategories = [...new Set([...urlCategories, ...apiCategories])];

      // Process each category for this post
      allCategories.forEach((category) => {
        if (!category) return;

        // Add category to medium priority cache tags
        cacheTags.medium.add(`category:${category}`);

        // Get frontend path for this category
        const frontendPath = `/${getCategoryPath(category)}`;

        // Add section path to high priority cache tags
        cacheTags.high.add(`path:${frontendPath}`);
        cacheTags.high.add(`section:${getCategoryPath(category)}`);

        // Add category to revalidation items (only once per unique path)
        if (
          !revalidationItems.some(
            (item) => item.type === "category" && item.path === frontendPath
          )
        ) {
          revalidationItems.push({
            type: "category",
            path: frontendPath,
            priority: PRIORITY.HIGH,
          });
        }
      });

      // Extract path parts for article revalidation
      const urlObj = new URL(post.link);
      const pathParts = urlObj.pathname.split("/").filter(Boolean);

      // Check if this is a new or updated article
      const isNewArticle =
        new Date(post.date).getTime() === new Date(post.modified).getTime();

      // Handle different URL patterns
      if (pathParts.length >= 3) {
        let articlePath = "";
        let categoryList: string[] = [];

        // Extract the relevant part of the path after any category prefixes
        const relevantPathStart =
          pathParts[0] === "category"
            ? pathParts[1] === "category"
              ? 2
              : 1
            : 0;

        // Handle bahasa with subcategory (special case)
        if (
          pathParts[relevantPathStart] === "bahasa" &&
          pathParts.length >= relevantPathStart + 2
        ) {
          // Extract the path without double processing
          const pathWithoutDomain = urlObj.pathname.substring(1); // Remove leading slash

          // Use the normalized path format for consistent revalidation
          articlePath = normalizePathForRevalidation(pathWithoutDomain);

          // Add categories for comprehensive revalidation
          categoryList = ["bahasa", pathParts[relevantPathStart + 1]];

          // Add subcategory tag
          cacheTags.medium.add(
            `subcategory:${pathParts[relevantPathStart + 1]}`
          );
          cacheTags.medium.add(
            `category-path:bahasa/${pathParts[relevantPathStart + 1]}`
          );
        } else {
          // Extract the path without double processing
          const pathWithoutDomain = urlObj.pathname.substring(1); // Remove leading slash

          // Use the normalized path format for consistent revalidation
          articlePath = normalizePathForRevalidation(pathWithoutDomain);

          // Add main category
          categoryList = [pathParts[relevantPathStart]];

          // If there's a subcategory, add it
          if (
            pathParts.length > relevantPathStart + 1 &&
            pathParts[relevantPathStart] !== pathParts[relevantPathStart + 1]
          ) {
            categoryList.push(pathParts[relevantPathStart + 1]);
            cacheTags.medium.add(
              `subcategory:${pathParts[relevantPathStart + 1]}`
            );
            cacheTags.medium.add(
              `category-path:${pathParts[relevantPathStart]}/${pathParts[relevantPathStart + 1]}`
            );
          }
        }

        // Add article-specific cache tags
        cacheTags.medium.add(`path:/${articlePath}`);
        cacheTags.medium.add(`type:article`);

        // Extract date information if available
        const datePattern = /\/(\d{4})\/(\d{2})\/(\d{2})\//;
        const dateMatch = articlePath.match(datePattern);
        if (dateMatch) {
          const [_, year, month, day] = dateMatch;
          cacheTags.low.add(`date:${year}-${month}-${day}`);
          cacheTags.low.add(`year:${year}`);
          cacheTags.low.add(`month:${year}-${month}`);
        }

        // Log for debugging
        console.log(
          `[WebSub] Prepared article path for revalidation: ${articlePath}`
        );

        // For both new and updated articles, we need proper revalidation
        revalidationItems.push({
          type: "post",
          path: articlePath,
          categories: [...new Set([...categoryList, ...allCategories])], // Combine and deduplicate
          priority: isNewArticle ? PRIORITY.MEDIUM : PRIORITY.MEDIUM, // Same priority for now, could differentiate if needed
        });
      }
    } catch (error) {
      console.error(`[WebSub] Error processing article ${post.id}:`, error);
    }
  });

  // Add revalidation items for all main navigation sections
  allNavigationPaths.forEach((path: string) => {
    if (
      !path.includes("/category/") &&
      !revalidationItems.some((item) => item.path === path)
    ) {
      revalidationItems.push({
        type: "category",
        path,
        priority: path === "/" ? PRIORITY.CRITICAL : PRIORITY.HIGH,
      });
    }
  });

  return {
    cacheTags: {
      critical: Array.from(cacheTags.critical),
      high: Array.from(cacheTags.high),
      medium: Array.from(cacheTags.medium),
      low: Array.from(cacheTags.low),
    },
    revalidationItems,
  };
}

/**
 * Process a single revalidation request with improved error handling and retry logic
 */
async function processRevalidationItem(
  baseUrl: string,
  item: { path: string; type: string; categories?: string[]; priority: number },
  revalidateKey: string
): Promise<boolean> {
  // Prepare request body with category information when applicable
  const requestBody: any = {
    type: item.type,
    [item.type === "post" ? "postSlug" : "path"]: item.path,
  };

  // Include categories information for posts to enable comprehensive revalidation
  if (item.type === "post" && item.categories && item.categories.length > 0) {
    requestBody.categories = item.categories;
  }

  // Retry logic with exponential backoff
  const maxRetries = item.priority <= PRIORITY.HIGH ? 3 : 2;
  let attempts = 0;

  while (attempts <= maxRetries) {
    try {
      const controller = new AbortController();
      // Longer timeout for critical items
      const timeout = item.priority <= PRIORITY.HIGH ? 30000 : 20000;
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

      const result = await response.json();

      // Consider any 2xx response as success
      if (response.ok) {
        console.log(
          `[WebSub] Successfully revalidated ${item.type} ${item.path} (priority: ${item.priority})`
        );
        return true;
      } else {
        throw new Error(result.message || "Unknown error");
      }
    } catch (error: any) {
      attempts++;
      const isTimeout = error.name === "AbortError";

      if (attempts <= maxRetries) {
        // Exponential backoff with jitter and priority-based base delay
        const baseDelay = item.priority <= PRIORITY.HIGH ? 1000 : 2000;
        const delay = Math.floor(
          baseDelay * Math.pow(2, attempts) * (0.9 + Math.random() * 0.2)
        );

        console.log(
          `[WebSub] Retry ${attempts}/${maxRetries} for ${item.type} ${item.path} in ${delay}ms (${isTimeout ? "timeout" : "error"})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error(
          `[WebSub] Failed to revalidate ${item.type} ${item.path} after ${maxRetries} attempts:`,
          error
        );
        return false;
      }
    }
  }

  return false;
}

/**
 * Process revalidation requests with priority queuing
 * Using PQueue for better concurrency control
 */
async function processRevalidation(
  baseUrl: string,
  items: {
    path: string;
    type: string;
    categories?: string[];
    priority: number;
  }[],
  revalidateKey: string
): Promise<void> {
  if (items.length === 0) return;

  console.log(
    `[WebSub] Revalidating ${items.length} items with priority queuing`
  );

  // Sort items by priority (lower number = higher priority)
  const sortedItems = [...items].sort((a, b) => a.priority - b.priority);

  // Group items by priority
  const criticalItems = sortedItems.filter(
    (item) => item.priority === PRIORITY.CRITICAL
  );
  const highItems = sortedItems.filter(
    (item) => item.priority === PRIORITY.HIGH
  );
  const mediumItems = sortedItems.filter(
    (item) => item.priority === PRIORITY.MEDIUM
  );
  const lowItems = sortedItems.filter((item) => item.priority === PRIORITY.LOW);

  console.log(
    `[WebSub] Queuing ${criticalItems.length} critical, ${highItems.length} high, ${mediumItems.length} medium, and ${lowItems.length} low priority items`
  );

  // Clear existing queues
  criticalQueue.clear();
  highQueue.clear();
  mediumQueue.clear();
  lowQueue.clear();

  // Add items to their respective queues
  for (const item of criticalItems) {
    criticalQueue.add(() =>
      processRevalidationItem(baseUrl, item, revalidateKey)
    );
  }

  for (const item of highItems) {
    highQueue.add(() => processRevalidationItem(baseUrl, item, revalidateKey));
  }

  for (const item of mediumItems) {
    mediumQueue.add(() =>
      processRevalidationItem(baseUrl, item, revalidateKey)
    );
  }

  for (const item of lowItems) {
    lowQueue.add(() => processRevalidationItem(baseUrl, item, revalidateKey));
  }

  // Process queues in order of priority with staggered starts
  console.log(
    `[WebSub] Processing critical queue (${criticalQueue.size} items)`
  );
  await criticalQueue.onIdle();

  // Small delay before starting high priority queue
  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log(
    `[WebSub] Processing high priority queue (${highQueue.size} items)`
  );
  await highQueue.onIdle();

  // Longer delay before starting medium priority queue
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log(
    `[WebSub] Processing medium priority queue (${mediumQueue.size} items)`
  );
  await mediumQueue.onIdle();

  // Even longer delay before starting low priority queue
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log(
    `[WebSub] Processing low priority queue (${lowQueue.size} items)`
  );
  await lowQueue.onIdle();

  console.log(`[WebSub] All revalidation queues processed`);
}

/**
 * Main handler function for WebSub notifications
 * Optimized for quick acknowledgment to prevent WordPress slowdowns
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle WebSub subscription verification - respond quickly
  if (req.method === "GET") {
    const { "hub.mode": mode, "hub.challenge": challenge } = req.query;

    if (mode === "subscribe" && challenge) {
      console.log("[WebSub] Subscription verified");
      return res.status(200).send(challenge);
    }

    return res.status(400).json({ error: "Invalid verification request" });
  }

  // Handle content notifications - acknowledge quickly then process in background
  if (req.method === "POST") {
    console.log("[WebSub] Received content update notification");

    // CRITICALLY IMPORTANT: Send an immediate 200 OK response to avoid blocking the WordPress process
    // This is crucial for performance - we process the updates asynchronously
    res.status(200).json({
      success: true,
      message: "Update received, processing in background",
      timestamp: new Date().toISOString(),
    });

    // Now process the update asynchronously (won't block WordPress)
    processWebSubNotification(req).catch((error) => {
      console.error("[WebSub] Background processing error:", error);
    });

    return;
  }

  return res.status(405).json({ error: "Method not allowed" });
}

/**
 * Process the WebSub notification in the background
 * This function runs after we've already acknowledged receipt to WordPress
 * Optimized with priority-based processing and better concurrency control
 */
async function processWebSubNotification(req: NextApiRequest): Promise<void> {
  // Prevent multiple concurrent processing runs
  if (isProcessing) {
    console.log(
      "[WebSub] Already processing a notification, skipping this one"
    );
    return;
  }

  try {
    isProcessing = true;
    console.log("[WebSub] Background processing started");
    console.log(
      "[WebSub] Content-Type:",
      req.headers["content-type"],
      req.headers.host
    );

    // Get current domains
    const wpDomain =
      process.env.NEXT_PUBLIC_CMS_URL || "https://cms.freemalaysiatoday.com";
    const frontendDomain = `${process.env.NEXT_PUBLIC_DOMAIN ?? "www.freemalaysiatoday.com"}`;

    // Get revalidate key
    const revalidateKey = process.env.REVALIDATE_SECRET_KEY || "default-secret";

    // Set up base URL for API calls
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host || frontendDomain;
    const baseUrl = `${protocol}://${host}`;

    // Get recently modified articles directly from WordPress API
    const modifiedArticles = await getRecentlyModifiedArticles(wpDomain);

    if (modifiedArticles.length === 0) {
      console.log("[WebSub] No recently modified articles found");
      isProcessing = false;
      return;
    }

    // Process articles to get cache tags and revalidation items
    const { cacheTags, revalidationItems } = processArticles(
      modifiedArticles,
      frontendDomain
    );

    console.log(
      `[WebSub] Generated ${cacheTags.critical.length + cacheTags.high.length + cacheTags.medium.length + cacheTags.low.length} cache tags for purging`
    );
    console.log(
      `[WebSub] Prepared ${revalidationItems.length} items for revalidation`
    );

    // Purge cache tags in order of priority with small delays between batches
    if (cacheTags.critical.length > 0) {
      console.log(
        `[WebSub] Purging ${cacheTags.critical.length} critical cache tags`
      );
      await purgeByTags(cacheTags.critical);
    }

    if (cacheTags.high.length > 0) {
      // Small delay before purging high priority tags
      await new Promise((resolve) => setTimeout(resolve, 300));
      console.log(
        `[WebSub] Purging ${cacheTags.high.length} high priority cache tags`
      );
      await purgeByTags(cacheTags.high);
    }

    if (cacheTags.medium.length > 0) {
      // Longer delay before purging medium priority tags
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log(
        `[WebSub] Purging ${cacheTags.medium.length} medium priority cache tags`
      );
      await purgeByTags(cacheTags.medium);
    }

    if (cacheTags.low.length > 0) {
      // Even longer delay before purging low priority tags
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log(
        `[WebSub] Purging ${cacheTags.low.length} low priority cache tags`
      );
      await purgeByTags(cacheTags.low);
    }

    // Process revalidation with priority queuing
    await processRevalidation(baseUrl, revalidationItems, revalidateKey);

    const indexNowKey = "fmt-news-indexnow-2025-mht-9f7b24a1a6";

    for (const post of modifiedArticles) {
      const url = new URL(post.link);
      url.hostname =
        process.env.NEXT_PUBLIC_DOMAIN ?? "www.freemalaysiatoday.com";

      const pingUrl = `https://api.indexnow.org/indexnow?url=${encodeURIComponent(
        url.toString()
      )}&key=${indexNowKey}`;

      try {
        const response = await fetch(pingUrl);
        if (!response.ok) {
          console.error(`[IndexNow] Ping failed for ${url.toString()}`);
        } else {
          console.log(`[IndexNow] Ping successful for ${url.toString()}`);
        }
      } catch (err) {
        console.error(`[IndexNow] Error pinging for ${url.toString()}:`, err);
      }
    }

    // Revalidate API endpoints for fresh data
    try {
      await fetch(`${baseUrl}/api/top-news`, { method: "POST" });
      await fetch(`${baseUrl}/api/last-update`, { method: "POST" });
      mutate("/api/top-news");
      mutate("/api/last-update");
      console.log(`[WebSub] API endpoints revalidated`);
    } catch (error) {
      console.error(`[WebSub] Error revalidating API endpoints:`, error);
    }

    const hubUrl = "https://pubsubhubbub.appspot.com/";
    const feedUrls = [
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

    for (const feedUrl of feedUrls) {
      try {
        const pingRes = await fetch(hubUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            "hub.mode": "publish",
            "hub.url": feedUrl,
          }).toString(),
        });

        if (!pingRes.ok) {
          throw new Error(
            `Ping failed (${pingRes.status}): ${pingRes.statusText}`
          );
        }

        console.log(`[WebSub] Successfully pinged hub for ${feedUrl}`);
      } catch (error) {
        console.error(`[WebSub] Error pinging hub for ${feedUrl}:`, error);
      }
    }
    console.log("[WebSub] Background processing completed successfully");
  } catch (error) {
    console.error("[WebSub] Background processing error:", error);
  } finally {
    isProcessing = false;
  }
}
