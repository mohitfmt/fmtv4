// pages/api/revalidate.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { aboutPageCache } from "@/lib/gql-queries/get-about-page";
import { getPostData, playlistCache } from "@/lib/api";
import { purgeCloudflareByTags } from "@/lib/cache/purge";
import { extractCategoriesFromSlug } from "@/lib/navigation-cache";
import { changeManager } from "@/lib/cache/smart-cache-registry";

// Track revalidation in progress to prevent duplicates
const revalidationInProgress = new Map<string, Promise<any>>();

const SECTION_PATH_MAP: Record<string, string> = {
  nation: "news",
  bahasa: "berita",
  business: "business",
  opinion: "opinion",
  world: "world",
  sports: "sports",
  leisure: "lifestyle",
};

// Navigation structure for path generation
const navigationPaths: Record<string, string[]> = {
  news: [
    "/news",
    "/category/category/nation",
    "/category/category/nation/sabahsarawak",
  ],
  berita: [
    "/berita",
    "/category/category/bahasa/tempatan",
    "/category/category/bahasa/pandangan",
    "/category/category/bahasa/dunia",
  ],
  business: [
    "/business",
    "/category/category/business/local-business",
    "/category/category/business/world-business",
  ],
  lifestyle: [
    "/lifestyle",
    "/category/category/leisure/simple-stories",
    "/category/category/leisure/travel",
    "/category/category/leisure/food",
    "/category/category/leisure/entertainment",
    "/category/category/leisure/money",
    "/category/category/leisure/health",
    "/category/category/leisure/pets",
    "/category/category/leisure/tech",
    "/category/category/leisure/automotive",
    "/category/category/leisure/property",
  ],
  opinion: [
    "/opinion",
    "/category/category/opinion/column",
    "/category/category/opinion/editorial",
    "/category/category/opinion/letters",
    "/category/category/fmt-worldviews",
  ],
  world: ["/world", "/category/category/south-east-asia"],
  sports: [
    "/sports",
    "/category/category/sports/football",
    "/category/category/sports/badminton",
    "/category/category/sports/motorsports",
    "/category/category/sports/tennis",
  ],
  property: ["/category/category/leisure/property"],
  education: ["/category/category/education"],
  photos: ["/photos"],
  videos: ["/videos"],
  accelerator: ["/accelerator"],
};

function resolveSectionPath(slug: string): string {
  return SECTION_PATH_MAP[slug] || slug;
}

function extractSectionFromSlug(slug: string): string | null {
  const extracted = extractCategoriesFromSlug(slug);
  if (!extracted.category) return null;

  // Use the category and resolve it through the section map
  return resolveSectionPath(extracted.category);
}

function normalizeSlugPath(path?: string): string | undefined {
  return path
    ?.replace(/^\/+/g, "")
    .replace(/^(category\/)+/g, "")
    .replace(/^\/+|\/+$/g, "");
}

// Helper to get all related paths for a category
function getRelatedPaths(category: string): string[] {
  const paths = new Set<string>();

  // Always include homepage
  paths.add("/");

  // Add direct category paths
  const sectionPath = resolveSectionPath(category);
  if (navigationPaths[sectionPath]) {
    navigationPaths[sectionPath].forEach((path: any) => paths.add(path));
  }

  // Add the category itself
  paths.add(`/${sectionPath}`);
  paths.add(`/category/category/${category}`);

  // Check if this category is a subcategory
  Object.entries(navigationPaths).forEach(([parent, childPaths]) => {
    childPaths.forEach((childPath) => {
      if (childPath.includes(category)) {
        paths.add(`/${parent}`);
        paths.add(childPath);
      }
    });
  });

  return Array.from(paths);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Security check
  const revalidateKey = req.headers["x-revalidate-key"];
  const expectedKey = process.env.REVALIDATE_SECRET_KEY || "default-secret";

  if (revalidateKey !== expectedKey) {
    console.error("[Revalidate] Invalid revalidate key");
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { type, slug: rawSlug, path, postSlug, id, retryCount = 0 } = req.body;
  const slug = rawSlug || postSlug || normalizeSlugPath(path);

  if (!type || (!slug && slug !== "" && !id)) {
    console.error("[Revalidate] Validation Error", { type, slug, id });
    return res.status(400).json({ message: "Missing required parameters" });
  }

  // OPTIMIZED: Check if this exact revalidation is already in progress
  const revalidationKey = `${type}:${slug || id}`;
  const existingRevalidation = revalidationInProgress.get(revalidationKey);

  if (existingRevalidation) {
    console.log(
      `[Revalidate] Already processing ${revalidationKey}, waiting...`
    );
    try {
      await existingRevalidation;
      return res.status(200).json({
        revalidated: true,
        message: "Revalidation completed (deduplicated)",
      });
    } catch (error) {
      console.error(
        `[Revalidate] Existing revalidation failed for ${revalidationKey}`
      );
    }
  }

  // Create a new revalidation promise
  const revalidationPromise = performRevalidation(req, res, {
    type,
    slug,
    path,
    postSlug,
    id,
    retryCount,
  });

  revalidationInProgress.set(revalidationKey, revalidationPromise);

  try {
    const result = await revalidationPromise;
    return result;
  } finally {
    // Clean up after completion
    setTimeout(() => {
      revalidationInProgress.delete(revalidationKey);
    }, 5000); // Keep for 5 seconds to prevent rapid duplicates
  }
}

async function performRevalidation(
  req: NextApiRequest,
  res: NextApiResponse,
  params: {
    type: string;
    slug: string;
    path?: string;
    postSlug?: string;
    id?: string;
    retryCount: number;
  }
) {
  const { type, slug, path, postSlug, id, retryCount } = params;
  const startTime = Date.now();

  const tagsToPurge: string[] = [];
  const pathsToRevalidate = new Set<string>();
  let smartCacheInvalidated = false;

  try {
    switch (type) {
      case "about": {
        aboutPageCache.delete("page:about");
        pathsToRevalidate.add("/about");
        tagsToPurge.push("path:/about", "page:about");
        break;
      }

      case "article":
      case "post": {
        try {
          // Clean the slug - remove any leading/trailing slashes
          const cleanSlug = slug.replace(/^\/+|\/+$/g, "");

          // For the API call, we need just the path after /category/
          // If slug is "/category/business/2025/05/29/article", extract "business/2025/05/29/article"
          const slugForApi = cleanSlug.replace(/^category\//, "");

          console.log(`[Revalidate] Processing article:`, {
            originalSlug: slug,
            cleanSlug: cleanSlug,
            slugForApi: slugForApi,
          });

          const postData = await getPostData(slugForApi);
          if (postData?.post?.databaseId) {
            // Create content change event
            const extractedCategories = extractCategoriesFromSlug(slugForApi);
            const categoriesArray = [
              extractedCategories.category,
              extractedCategories.subcategory,
            ].filter(Boolean);

            const event = {
              type: "update" as const,
              articleId: postData.post.databaseId.toString(),
              slug: slugForApi,
              categories: categoriesArray,
              timestamp: new Date(),
              priority: "normal" as const,
            };

            // Trigger smart invalidation
            changeManager.handleContentChange(event as any);
            smartCacheInvalidated = true;

            // OPTIMIZED: Shorter wait for cache invalidation
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Get all affected paths from the change manager
            const affectedPaths = changeManager.getAffectedPaths();
            affectedPaths.forEach((path) => pathsToRevalidate.add(path));

            // Also add category-specific paths
            const categories =
              postData.post.categories?.edges?.map(
                (edge: any) => edge.node.slug
              ) || [];

            categories.forEach((cat: string) => {
              getRelatedPaths(cat).forEach((path) =>
                pathsToRevalidate.add(path)
              );
            });

            console.log(
              `[Revalidate] Smart invalidation for article ${postData.post.databaseId} - ${pathsToRevalidate.size} paths affected`
            );
          }
        } catch (e) {
          console.log(
            `[Revalidate] Could not fetch article ID for ${slug}, continuing with path revalidation`
          );
        }

        // For the actual revalidation path:
        // If the slug already starts with "category/", just add leading slash
        // Otherwise, add "/category/" prefix
        let articlePath: string;

        if (slug.startsWith("category/") || slug.startsWith("/category/")) {
          // Already has category prefix, just ensure single leading slash
          articlePath = "/" + slug.replace(/^\/+/, "");
        } else {
          // Need to add category prefix
          articlePath = "/category/" + slug.replace(/^\/+/, "");
        }

        // Clean up any double slashes and remove trailing slash
        articlePath = articlePath.replace(/\/+/g, "/").replace(/\/$/, "");

        console.log(
          `[Revalidate] Adding article path for revalidation: ${articlePath}`
        );
        pathsToRevalidate.add(articlePath);

        // For cache tags, use the slug without /category/ prefix and without slashes
        const slugForTags = slug
          .replace(/^\/?(category\/)?/, "")
          .replace(/\/$/, "");

        tagsToPurge.push(
          `post:${slugForTags}`,
          `related:${slugForTags}`,
          `path:${articlePath}`
        );

        // Add section paths
        const section = extractSectionFromSlug(slugForTags);
        if (section) {
          getRelatedPaths(section).forEach((path) =>
            pathsToRevalidate.add(path)
          );
          tagsToPurge.push(`path:/${section}`, `section:${section}`);
        }

        // Always revalidate homepage
        pathsToRevalidate.add("/");
        tagsToPurge.push("path:/", "page:home");

        console.log(`[Revalidate] Article processing complete:`, {
          articlePath,
          totalPaths: pathsToRevalidate.size,
          tags: tagsToPurge.length,
        });

        break;
      }

      case "author": {
        const event = {
          type: "update" as const,
          articleId: `author-${id || slug}`,
          slug: `author/${slug}`,
          categories: ["author"],
          timestamp: new Date(),
          priority: "normal" as const,
        };

        changeManager.handleContentChange(event);
        smartCacheInvalidated = true;

        pathsToRevalidate.add(`/category/author/${slug}`);
        pathsToRevalidate.add("/");
        tagsToPurge.push(
          `author:${slug}`,
          `path:/category/author/${slug}`,
          "path:/"
        );
        break;
      }

      case "tag": {
        const event = {
          type: "update" as const,
          articleId: `tag-${id || slug}`,
          slug: `tag/${slug}`,
          categories: ["tag"],
          timestamp: new Date(),
          priority: "normal" as const,
        };

        changeManager.handleContentChange(event);
        smartCacheInvalidated = true;

        pathsToRevalidate.add(`/category/tag/${slug}`);
        pathsToRevalidate.add("/");
        tagsToPurge.push(`tag:${slug}`, `path:/category/tag/${slug}`, "path:/");
        break;
      }

      case "video": {
        playlistCache.delete(`playlist:${id}`);
        pathsToRevalidate.add(`/videos/${slug}`);
        pathsToRevalidate.add("/videos");
        pathsToRevalidate.add("/");
        tagsToPurge.push(
          `playlist:${id}`,
          `path:/videos/${slug}`,
          "path:/videos",
          "path:/"
        );
        break;
      }

      case "homepage": {
        const event = {
          type: "update" as const,
          articleId: "homepage-manual",
          slug: "homepage",
          categories: ["homepage", "top-news", "highlight", "super-highlight"],
          timestamp: new Date(),
          priority: "normal" as const,
        };

        changeManager.handleContentChange(event);
        smartCacheInvalidated = true;

        pathsToRevalidate.add("/");

        // Also revalidate all main section pages
        Object.keys(navigationPaths).forEach((section) => {
          pathsToRevalidate.add(`/${section}`);
          tagsToPurge.push(`path:/${section}`, `section:${section}`);
        });

        tagsToPurge.push("path:/", "homepage", "page:home");
        break;
      }

      case "section":
      case "category": {
        const event = {
          type: "update" as const,
          articleId: `category-${slug}`,
          slug: slug,
          categories: [slug, resolveSectionPath(slug)],
          timestamp: new Date(),
          priority: "normal" as const,
        };

        changeManager.handleContentChange(event);
        smartCacheInvalidated = true;

        // Get all related paths for this category
        getRelatedPaths(slug).forEach((path) => pathsToRevalidate.add(path));

        const sectionPath = resolveSectionPath(slug);
        tagsToPurge.push(
          `path:/${sectionPath}`,
          `section:${sectionPath}`,
          `category:${slug}`,
          "path:/"
        );
        break;
      }

      default:
        console.error(`[Revalidate] Unsupported Type`, type);
        return res.status(400).json({ message: `Unsupported type: ${type}` });
    }

    // OPTIMIZED: Force process smart cache changes
    await changeManager.forceProcess();

    // Convert Set to Array and sort by priority
    const pathsArray = Array.from(pathsToRevalidate).sort((a, b) => {
      // Priority ordering:
      // 1. Article paths (contain more than one /)
      // 2. Homepage (/)
      // 3. Category pages (/news, /sports, etc)
      // 4. Others

      const getPathPriority = (path: string) => {
        if (path === "/") return 2; // Homepage
        const slashCount = (path.match(/\//g) || []).length;
        if (slashCount > 1) return 1; // Article
        if (navigationPaths[path.substring(1)]) return 3; // Category
        return 4; // Others
      };

      return getPathPriority(a) - getPathPriority(b);
    });

    console.log(`[Revalidate] Revalidating ${pathsArray.length} paths`);

    // OPTIMIZED: Parallel revalidation with batching
    const BATCH_SIZE = 10; // Increased from 5
    const revalidationPromises = [];
    const revalidationResults: Array<{
      path: string;
      success: boolean;
      error?: string;
    }> = [];

    for (let i = 0; i < pathsArray.length; i += BATCH_SIZE) {
      const batch = pathsArray.slice(i, i + BATCH_SIZE);

      const batchPromise = Promise.all(
        batch.map(async (path) => {
          try {
            await res.revalidate(path);
            console.log(`[Revalidate] ✓ ${path}`);
            return { path, success: true };
          } catch (err: any) {
            console.error(`[Revalidate] ✗ ${path}:`, err.message);
            return { path, success: false, error: err.message };
          }
        })
      );

      revalidationPromises.push(batchPromise);

      // OPTIMIZED: Small delay between batches to prevent overwhelming Next.js
      if (i + BATCH_SIZE < pathsArray.length) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    // Wait for all batches to complete
    const allResults = await Promise.all(revalidationPromises);
    allResults.forEach((batch) => revalidationResults.push(...batch));

    const successCount = revalidationResults.filter((r) => r.success).length;
    const failureCount = revalidationResults.filter((r) => !r.success).length;

    console.log(
      `[Revalidate] Completed: ${successCount} success, ${failureCount} failures`
    );

    // OPTIMIZED: Async Cloudflare purge (don't wait)
    if (tagsToPurge.length > 0) {
      purgeCloudflareByTags(tagsToPurge)
        .then(() =>
          console.log(
            `[Revalidate] Cloudflare tags purged: ${tagsToPurge.length}`
          )
        )
        .catch((err) =>
          console.error("[Revalidate] Cloudflare purge failed", err)
        );
    }

    const processingTime = Date.now() - startTime;
    console.log(`[Revalidate] Total processing time: ${processingTime}ms`);

    return res.status(200).json({
      revalidated: true,
      type,
      slugOrId: slug || id,
      pathsRevalidated: successCount,
      pathsFailed: failureCount,
      tagsPurged: tagsToPurge.length,
      smartCacheInvalidated,
      processingTimeMs: processingTime,
    });
  } catch (error: any) {
    console.error("[Revalidate] Error", { type, slug, id, error });

    // OPTIMIZED: Reduced retry logic
    if (retryCount < 1) {
      // Reduced from 2
      console.warn(
        `[Revalidate] Retrying... Attempt ${retryCount + 1}/1 for type=${type}, slug=${slug}`
      );

      const baseUrl = `https://${process.env.NEXT_PUBLIC_DOMAIN || "www.freemalaysiatoday.com"}`;

      // Async retry without waiting
      setTimeout(
        () => {
          fetch(`${baseUrl}/api/revalidate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-revalidate-key":
                process.env.REVALIDATE_SECRET_KEY || "default-secret",
            },
            body: JSON.stringify({
              type,
              slug,
              id,
              retryCount: retryCount + 1,
            }),
          }).catch((e) => console.error("[Revalidate] Retry failed", e));
        },
        (retryCount + 1) * 2000 // Shorter backoff
      );
    }

    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
}
