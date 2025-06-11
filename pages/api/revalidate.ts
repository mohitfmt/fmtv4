// pages/api/revalidate.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { aboutPageCache } from "@/lib/gql-queries/get-about-page";
import { getPostData, playlistCache } from "@/lib/api";
import {
  purgeCloudflareByTags,
  purgeCloudflareByUrls,
} from "@/lib/cache/purge";
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
          // The slug parameter contains the path without leading slash
          // e.g., "category/nation/2025/06/11/reforms-ongoing-and-backed-by-solid-evidence-says-azalina"

          console.log(`[Revalidate] Processing article with slug: ${slug}`);

          // Ensure we have a proper path with leading slash
          let articlePath = slug.startsWith("/") ? slug : "/" + slug;

          // Clean up any double slashes
          articlePath = articlePath.replace(/\/+/g, "/");

          // Remove trailing slash if present
          articlePath = articlePath.replace(/\/$/, "");

          console.log(
            `[Revalidate] Article path for revalidation: ${articlePath}`
          );

          // Extract the section from the path for category invalidation
          const pathParts = articlePath.split("/").filter(Boolean);

          // Skip 'category' if it's the first part
          if (pathParts[0] === "category") {
            pathParts.shift();
          }

          // The section is the first part after 'category'
          const section = pathParts[0];
          const subsection =
            section === "bahasa" &&
            pathParts[1] &&
            !pathParts[1].match(/^\d{4}$/)
              ? pathParts[1]
              : null;

          console.log(
            `[Revalidate] Extracted section: ${section}, subsection: ${subsection}`
          );

          // Always revalidate the article itself first (highest priority)
          pathsToRevalidate.add(articlePath);

          // Add cache tags for the article
          tagsToPurge.push(
            `path:${articlePath}`,
            `post:${slug}`,
            `article:${articlePath}`
          );

          // Try to get more information about the article
          try {
            // Extract just the article slug from the full path
            const articleSlugMatch = articlePath.match(/\/([^\/]+)\/?$/);
            const articleSlug = articleSlugMatch ? articleSlugMatch[1] : slug;

            const postData = await getPostData(articleSlug);

            if (postData?.post?.databaseId) {
              // Create content change event for smart cache
              const event = {
                type: "update" as const,
                articleId: postData.post.databaseId.toString(),
                slug: articlePath,
                categories: [section, subsection].filter(Boolean),
                timestamp: new Date(),
                priority: "normal" as const,
              };

              changeManager.handleContentChange(event as any);
              smartCacheInvalidated = true;

              // Add article-specific cache tag
              tagsToPurge.push(`article:${postData.post.databaseId}`);

              // Get categories from the post data
              const categories =
                postData.post.categories?.edges?.map(
                  (edge: any) => edge.node.slug
                ) || [];

              // Process each category
              categories.forEach((cat: string) => {
                // Skip invalid categories like years
                if (cat.match(/^\d{4}$/) || !cat) return;

                // Add the category page for revalidation
                const categoryPagePath = `/category/category/${cat}`;
                pathsToRevalidate.add(categoryPagePath);
                tagsToPurge.push(`category:${cat}`, `path:${categoryPagePath}`);

                // Also add friendly URL if applicable
                const friendlyPath = resolveSectionPath(cat);
                if (friendlyPath !== cat) {
                  pathsToRevalidate.add(`/${friendlyPath}`);
                  tagsToPurge.push(
                    `path:/${friendlyPath}`,
                    `section:${friendlyPath}`
                  );
                }
              });
            }
          } catch (e) {
            console.log(
              `[Revalidate] Could not fetch additional article data: ${e}`
            );
          }

          // Add the main section pages based on the URL structure
          if (section) {
            // Add the category page
            const categoryPagePath = `/category/category/${section}`;
            pathsToRevalidate.add(categoryPagePath);
            tagsToPurge.push(`category:${section}`, `path:${categoryPagePath}`);

            // Add the friendly URL
            const friendlyPath = resolveSectionPath(section);
            if (friendlyPath && friendlyPath !== section) {
              pathsToRevalidate.add(`/${friendlyPath}`);
              tagsToPurge.push(
                `path:/${friendlyPath}`,
                `section:${friendlyPath}`
              );
            }

            // For Bahasa subsections
            if (section === "bahasa" && subsection) {
              const subsectionPath = `/category/category/bahasa/${subsection}`;
              pathsToRevalidate.add(subsectionPath);
              tagsToPurge.push(
                `category:${subsection}`,
                `path:${subsectionPath}`
              );
            }
          }

          // Always revalidate homepage as articles might appear there
          pathsToRevalidate.add("/");
          tagsToPurge.push("path:/", "page:home");

          // Force process smart cache changes immediately
          await changeManager.forceProcess();

          // CRITICAL: Immediate Cloudflare URL purge for the article
          const baseUrl = `https://${process.env.NEXT_PUBLIC_DOMAIN || "www.freemalaysiatoday.com"}`;
          const fullArticleUrls = [
            `${baseUrl}${articlePath}`,
            `${baseUrl}${articlePath}/`, // With trailing slash
          ];

          console.log(
            `[Revalidate] Purging Cloudflare cache for article URLs:`,
            fullArticleUrls
          );

          try {
            await purgeCloudflareByUrls(fullArticleUrls);
            console.log(
              `[Revalidate] Cloudflare URL purge completed for article`
            );
          } catch (error) {
            console.error(`[Revalidate] Cloudflare URL purge failed:`, error);
          }

          // Also purge by tags
          if (tagsToPurge.length > 0) {
            purgeCloudflareByTags(tagsToPurge)
              .then(() =>
                console.log(`[Revalidate] Cloudflare tag purge completed`)
              )
              .catch((err) =>
                console.error(`[Revalidate] Cloudflare tag purge failed:`, err)
              );
          }

          console.log(`[Revalidate] Article processing complete:`, {
            articlePath,
            totalPaths: pathsToRevalidate.size,
            tags: tagsToPurge.length,
          });

          break;
        } catch (error: any) {
          console.error(
            `[Revalidate] Error processing article ${slug}:`,
            error
          );
          return res.status(500).json({
            message: "Error processing article",
            error: error.message,
          });
        }
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
