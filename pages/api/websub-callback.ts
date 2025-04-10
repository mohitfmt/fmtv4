// pages/api/websub-callback.ts
import { addMinutes } from "date-fns";
import { NextApiRequest, NextApiResponse } from "next";
import { mutate } from "swr";
import { getAllNavigationPaths } from "../../lib/navigation-cache";

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

/**
 * Transforms WordPress URLs to the frontend domain
 * Used for Cloudflare cache purging which needs full URLs
 */
function transformUrl(url: string, targetDomain: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.hostname = targetDomain;
    return urlObj.toString();
  } catch (error) {
    console.error(`[WebSub] Failed to transform URL ${url}:`, error);
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
 * Handles all possible path formats that might come from various sources
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
  // This helps maintain consistency with the revalidate.ts expectations
  return `category/${normalizedPath}`;
}

/**
 * Get recently modified articles from WordPress
 * Uses a 15-minute window to ensure we don't miss anything
 */
async function getRecentlyModifiedArticles(
  wpDomain: string
): Promise<WPPost[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds

  try {
    // Get posts modified in the last 15 minutes
    const now = new Date();
    const fifteenMinsAgo = addMinutes(now, -15);
    const modifiedAfter = fifteenMinsAgo.toISOString();

    console.log(
      `[WebSub] Fetching posts modified after ${modifiedAfter} (15-minute window)`
    );

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
  } catch (error) {
    console.error("[WebSub] Error fetching modified articles:", error);
    return [];
  }
}

/**
 * Purge Cloudflare cache for a set of URLs
 */
async function purgeCloudflareCache(urls: string[]): Promise<boolean> {
  if (!process.env.CLOUDFLARE_ZONE_ID || !process.env.CLOUDFLARE_API_TOKEN) {
    console.warn("[Cache] Cloudflare credentials not configured");
    return false;
  }

  if (urls.length === 0) {
    console.log("[Cache] No URLs to purge");
    return true;
  }

  try {
    console.log(`[Cache] Purging ${urls.length} URLs from Cloudflare`);

    // Cloudflare has limits on how many URLs can be purged in one request
    // Split into batches of 30 to be safe
    const batchSize = 30;
    const batches = [];

    for (let i = 0; i < urls.length; i += batchSize) {
      batches.push(urls.slice(i, i + batchSize));
    }

    console.log(`[Cache] Split cache purge into ${batches.length} batches`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(
        `[Cache] Processing batch ${i + 1}/${batches.length} with ${batch.length} URLs`
      );

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/purge_cache`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ files: batch }),
        }
      );

      const result = await response.json();
      if (!result.success) {
        console.error(
          `[Cache] Purge batch ${i + 1} failed:`,
          result.errors?.[0]?.message
        );
        // Continue with other batches even if one fails
      } else {
        console.log(`[Cache] Successfully purged batch ${i + 1}`);
      }

      // Add a small delay between batches to prevent rate limiting
      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log(`[Cache] Cache purge operation completed`);
    return true;
  } catch (error) {
    console.error("[Cache] Purge request failed:", error);
    return false;
  }
}

/**
 * Process articles to get URLs to purge and paths to revalidate
 */
function processArticles(
  articles: WPPost[],
  frontendDomain: string
): {
  newArticleUrls: string[];
  updatedArticleUrls: string[];
  categoryPaths: Set<string>;
  revalidationItems: { path: string; type: string; categories?: string[] }[];
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

  // Transform URLs to frontend domain for Cloudflare cache purging
  const newArticleUrls = newArticles.map((post) =>
    transformUrl(post.link, frontendDomain)
  );

  const updatedArticleUrls = updatedArticles.map((post) =>
    transformUrl(post.link, frontendDomain)
  );

  // Collect categories for all articles
  const categoryPaths = new Set<string>();
  categoryPaths.add("/"); // Always include homepage

  // Get all navigation paths for potential revalidation
  const allNavigationPaths = getAllNavigationPaths();

  // Add all main navigation sections
  allNavigationPaths.forEach((path: any) => {
    if (!path.includes("/category/")) {
      categoryPaths.add(path);
    }
  });

  // Items for revalidation
  const revalidationItems: {
    path: string;
    type: string;
    categories?: string[];
  }[] = [];

  // Process each article for revalidation
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

        const frontendPath = `/${getCategoryPath(category)}`;
        categoryPaths.add(frontendPath);

        // Add category to revalidation items (only once per unique path)
        if (
          !revalidationItems.some(
            (item) => item.type === "category" && item.path === frontendPath
          )
        ) {
          revalidationItems.push({
            type: "category",
            path: frontendPath,
          });
        }
      });

      // Extract path parts for article revalidation
      const urlObj = new URL(post.link);
      const pathParts = urlObj.pathname.split("/").filter(Boolean);

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
          }
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
        });
      }
    } catch (error) {
      console.error(`[WebSub] Error processing article ${post.id}:`, error);
      // Continue with other articles even if one fails
    }
  });

  // Add revalidation items for all main navigation sections
  allNavigationPaths.forEach((path: any) => {
    if (
      !path.includes("/category/") &&
      !revalidationItems.some((item) => item.path === path)
    ) {
      revalidationItems.push({
        type: "category",
        path,
      });
    }
  });

  return {
    newArticleUrls,
    updatedArticleUrls,
    categoryPaths,
    revalidationItems,
  };
}

/**
 * Process revalidation requests with improved error handling
 * Using article-first prioritization for best user experience
 */
async function processRevalidation(
  baseUrl: string,
  items: { path: string; type: string; categories?: string[] }[],
  revalidateKey: string
): Promise<void> {
  if (items.length === 0) return;

  console.log(`[WebSub] Revalidating ${items.length} items`);

  // IMPORTANT: Sort items to prioritize individual posts BEFORE category pages
  // This ensures article content is updated before category pages that reference it
  const sortedItems = [...items].sort((a, b) => {
    if (a.type !== "category" && b.type === "category") return -1;
    if (a.type === "category" && b.type !== "category") return 1;
    return 0;
  });

  const articleCount = sortedItems.filter(
    (item) => item.type !== "category"
  ).length;
  const categoryCount = sortedItems.filter(
    (item) => item.type === "category"
  ).length;
  console.log(
    `[WebSub] Prioritizing ${articleCount} article pages before ${categoryCount} category pages`
  );

  // Batch processing to avoid overwhelming server
  const batchSize = 5;
  const batches = [];

  for (let i = 0; i < sortedItems.length; i += batchSize) {
    batches.push(sortedItems.slice(i, i + batchSize));
  }

  console.log(
    `[WebSub] Split revalidation into ${batches.length} batches of up to ${batchSize} items each`
  );

  const results = {
    success: 0,
    failed: 0,
    items: [] as Array<{
      path: string;
      type: string;
      success: boolean;
      error?: string;
    }>,
  };

  // Process batches with a slight delay between them
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const pendingPromises: Promise<any>[] = [];

    // Log batch type information for debugging
    const articlesInBatch = batch.filter(
      (item) => item.type !== "category"
    ).length;
    const categoriesInBatch = batch.filter(
      (item) => item.type === "category"
    ).length;

    console.log(
      `[WebSub] Processing batch ${batchIndex + 1}/${batches.length} with ${articlesInBatch} articles and ${categoriesInBatch} categories`
    );

    // Process all items in the current batch concurrently
    for (const item of batch) {
      // Prepare request body with category information when applicable
      const requestBody: any = {
        type: item.type,
        [item.type === "post" ? "postSlug" : "path"]: item.path,
      };

      // Include categories information for posts to enable comprehensive revalidation
      if (
        item.type === "post" &&
        item.categories &&
        item.categories.length > 0
      ) {
        requestBody.categories = item.categories;
      }

      // Create the revalidation promise with timeout and retry logic
      const revalidationPromise = (async () => {
        const maxRetries = 2;
        let attempts = 0;

        while (attempts <= maxRetries) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000); // 20-second timeout

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
              results.success++;
              results.items.push({
                path: item.path,
                type: item.type,
                success: true,
              });
              console.log(
                `[WebSub] Successfully revalidated ${item.type} ${item.path}`
              );
              return result;
            } else {
              throw new Error(result.message || "Unknown error");
            }
          } catch (error: any) {
            attempts++;
            const isTimeout = error.name === "AbortError";

            if (attempts <= maxRetries) {
              // Exponential backoff with jitter
              const delay = Math.floor(
                1000 * Math.pow(2, attempts) * (0.9 + Math.random() * 0.2)
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

              results.failed++;
              results.items.push({
                path: item.path,
                type: item.type,
                success: false,
                error: error.message || "Unknown error",
              });
              return null;
            }
          }
        }
      })();

      pendingPromises.push(revalidationPromise);

      // Stagger requests slightly to reduce server load spikes
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Wait for all promises in this batch to complete
    await Promise.all(pendingPromises);

    // Add a short delay between batches to avoid overwhelming the server
    if (batchIndex < batches.length - 1) {
      console.log(`[WebSub] Pausing briefly between batches...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log(
    `[WebSub] Revalidation completed: ${results.success} successful, ${results.failed} failed`
  );

  // Log details of failed items for troubleshooting
  if (results.failed > 0) {
    const failedItems = results.items.filter((item) => !item.success);
    console.log(
      `[WebSub] Failed revalidation items:`,
      failedItems.map((item) => `${item.type} ${item.path} (${item.error})`)
    );
  }
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
 */
async function processWebSubNotification(req: NextApiRequest): Promise<void> {
  try {
    console.log("[WebSub] Background processing started");

    // Log request details for debugging
    console.log(
      "[WebSub] Content-Type:",
      req.headers["content-type"],
      "Host:",
      req.headers.host
    );

    // Get current domains from environment variables
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
      return;
    }

    // Process articles to get URLs to purge and paths to revalidate
    const {
      newArticleUrls,
      updatedArticleUrls,
      categoryPaths,
      revalidationItems,
    } = processArticles(modifiedArticles, frontendDomain);

    console.log(
      `[WebSub] Found ${newArticleUrls.length} new articles, ${updatedArticleUrls.length} updated articles`
    );
    console.log(`[WebSub] Found ${categoryPaths.size} category paths to purge`);

    // Purge Cloudflare cache for updated article URLs
    if (updatedArticleUrls.length > 0) {
      await purgeCloudflareCache(updatedArticleUrls);
    }

    // Purge category pages and homepage for both new and updated articles
    const categoryUrls = Array.from(categoryPaths).map(
      (path) => `https://${frontendDomain}${path}`
    );

    if (categoryUrls.length > 0) {
      await purgeCloudflareCache(categoryUrls);
    }

    // Process revalidation with improved approach
    await processRevalidation(baseUrl, revalidationItems, revalidateKey);

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

    console.log("[WebSub] Background processing completed successfully");
  } catch (error) {
    console.error("[WebSub] Background processing error:", error);
  }
}
