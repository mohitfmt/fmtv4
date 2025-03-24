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
 */
function transformUrl(url: string, targetDomain: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.hostname = targetDomain;
    return urlObj.toString();
  } catch (error) {
    console.error(`Failed to transform URL ${url}:`, error);
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

    // Handle normal category structure: /category/categoryName/...
    if (pathParts.length >= 2 && pathParts[0] === "category") {
      const category = pathParts[1];

      // Special case for bahasa (has subcategories)
      if (category === "bahasa" && pathParts.length >= 3) {
        return ["bahasa", pathParts[2]]; // Return both bahasa and its subcategory
      }

      return [category];
    }

    return [];
  } catch (error) {
    console.error(`Failed to extract category from ${url}:`, error);
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
 * Get recently modified articles from WordPress
 */
async function getRecentlyModifiedArticles(
  wpDomain: string
): Promise<WPPost[]> {
  try {
    // Get posts modified in the last 10 minutes
    const now = new Date();
    const tenMinsAgo = addMinutes(now, -10);
    const modifiedAfter = tenMinsAgo.toISOString();

    console.log(`[WebSub] Fetching posts modified after ${modifiedAfter}`);

    const response = await fetch(
      `${wpDomain}/wp-json/wp/v2/posts?modified_after=${modifiedAfter}&per_page=50`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "WebSub-Subscriber/1.0",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `WordPress API returned ${response.status}: ${response.statusText}`
      );
    }

    const posts: WPPost[] = await response.json();
    console.log(`[WebSub] Found ${posts.length} recently modified posts`);

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

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/purge_cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ files: urls }),
      }
    );

    const result = await response.json();
    if (!result.success) {
      throw new Error(
        `Cloudflare purge failed: ${result.errors?.[0]?.message}`
      );
    }

    console.log(
      `[Cache] Successfully purged ${urls.length} URLs from Cloudflare`
    );
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

  // Transform URLs to frontend domain
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

    // Handle both standard and bahasa URLs
    if (pathParts.length >= 5 && pathParts[0] === "category") {
      let articlePath = "";
      let categoryList: string[] = [];

      // Handle bahasa with subcategory
      if (pathParts[1] === "bahasa" && pathParts.length >= 6) {
        // Format: /category/bahasa/subcategory/year/month/day/slug
        articlePath = `${pathParts[1]}/${pathParts[2]}/${pathParts[3]}/${pathParts[4]}/${pathParts[5]}/${pathParts.slice(6).join("/")}`;
        categoryList = [pathParts[1], pathParts[2]]; // Add both bahasa and subcategory
      } else {
        // Format: /category/categoryName/year/month/day/slug
        articlePath = `${pathParts[1]}/${pathParts[2]}/${pathParts[3]}/${pathParts[4]}/${pathParts.slice(5).join("/")}`;
        categoryList = [pathParts[1]]; // Add main category

        // If there's a subcategory, add it
        if (pathParts.length > 5 && pathParts[1] !== pathParts[2]) {
          categoryList.push(pathParts[2]);
        }
      }

      // For both new and updated articles, we need proper revalidation
      revalidationItems.push({
        type: "post",
        path: articlePath,
        categories: [...new Set([...categoryList, ...allCategories])], // Combine and deduplicate
      });
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
 */
async function processRevalidation(
  baseUrl: string,
  items: { path: string; type: string; categories?: string[] }[],
  revalidateKey: string
): Promise<void> {
  if (items.length === 0) return;

  console.log(`[WebSub] Revalidating ${items.length} items`);

  // Process all items in parallel, but with reasonable concurrency
  const maxConcurrency = 20; // Maximum number of concurrent requests

  // Sort items to prioritize category pages before individual posts
  const sortedItems = [...items].sort((a, b) => {
    if (a.type === "category" && b.type !== "category") return -1;
    if (a.type !== "category" && b.type === "category") return 1;
    return 0;
  });

  const pendingPromises: Promise<any>[] = [];
  const results = {
    success: 0,
    failed: 0,
    items: [] as Array<{ path: string; success: boolean; error?: string }>,
  };

  for (const item of sortedItems) {
    // Prepare request body with category information when applicable
    const requestBody: any = {
      type: item.type,
      [item.type === "post" ? "postSlug" : "path"]: item.path,
    };

    // Include categories information for posts to enable comprehensive revalidation
    if (item.type === "post" && item.categories && item.categories.length > 0) {
      requestBody.categories = item.categories;
    }

    // Create the revalidation promise
    const revalidationPromise = fetch(`${baseUrl}/api/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-key": revalidateKey,
      },
      body: JSON.stringify(requestBody),
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Unknown error");
        }

        results.success++;
        results.items.push({
          path: item.path,
          success: true,
        });

        return result;
      })
      .catch((error) => {
        console.error(
          `[WebSub] Error revalidating ${item.type} ${item.path}:`,
          error
        );

        results.failed++;
        results.items.push({
          path: item.path,
          success: false,
          error: error.message,
        });

        return null;
      });

    pendingPromises.push(revalidationPromise);

    // If we've reached max concurrency, wait for one to complete
    if (pendingPromises.length >= maxConcurrency) {
      await Promise.race(pendingPromises);
      // Remove completed promises
      const completedIndex = await Promise.all(
        pendingPromises.map(async (p, index) => {
          const settled = await Promise.race([
            p.then(() => true),
            Promise.resolve(false),
          ]);
          return settled ? index : -1;
        })
      ).then((indexes) => indexes.find((i) => i !== -1) || -1);

      if (completedIndex >= 0) {
        pendingPromises.splice(completedIndex, 1);
      }
    }
  }

  // Wait for any remaining promises to complete
  if (pendingPromises.length > 0) {
    await Promise.all(pendingPromises);
  }

  console.log(
    `[WebSub] Revalidation completed: ${results.success} successful, ${results.failed} failed`
  );
}

/**
 * Main handler function for WebSub notifications
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle WebSub subscription verification
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
    try {
      console.log("[WebSub] Received content update notification");
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
      const revalidateKey =
        process.env.REVALIDATE_SECRET_KEY || "default-secret";

      // Set up base URL for API calls
      const protocol = req.headers["x-forwarded-proto"] || "https";
      const host = req.headers.host || frontendDomain;
      const baseUrl = `${protocol}://${host}`;

      // Get recently modified articles directly from WordPress API
      const modifiedArticles = await getRecentlyModifiedArticles(wpDomain);

      if (modifiedArticles.length === 0) {
        console.log("[WebSub] No recently modified articles found");
        return res.status(200).json({
          success: true,
          message: "No content changes detected",
        });
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
      console.log(
        `[WebSub] Found ${categoryPaths.size} category paths to purge`
      );

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

      return res.status(200).json({
        success: true,
        message: "Content updated successfully",
        stats: {
          newArticles: newArticleUrls.length,
          updatedArticles: updatedArticleUrls.length,
          categoryPaths: categoryPaths.size,
          revalidationItems: revalidationItems.length,
        },
      });
    } catch (error) {
      console.error("[WebSub] Error:", error);
      return res.status(500).json({
        error: "Process failed",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
