import { NextApiRequest, NextApiResponse } from "next";
import {
  getRelatedPathsForCategory,
  extractCategoriesFromSlug,
} from "../../lib/navigation-cache";

// Types for request body
type RevalidateBody = {
  postId?: number;
  postSlug?: string;
  type?: "post" | "page" | "category";
  path?: string;
  categories?: string[];
};

// Main sections/categories to always revalidate
const CORE_SECTIONS = [
  "/", // Homepage
  "/news", // News section
  "/berita", // Bahasa section
  "/business", // Business section
  "/opinion", // Opinion section
  "/world", // World section
  "/sports", // Sports section
  "/lifestyle", // Lifestyle section
  "/photos", // Gallery
  "/videos", // Videos
  "/accelerator", // Accelerator
];

/**
 * Comprehensive revalidation for a post/article
 * Revalidates the post itself, its categories, and core site sections
 * Uses the navigation structure to ensure all related paths are revalidated
 */
async function revalidatePost(
  res: NextApiResponse,
  slug: string,
  categories: string[] = []
) {
  const revalidatedPaths = new Set<string>();
  const failedPaths = new Set<string>();

  try {
    // Helper function to revalidate a path and track results
    const revalidatePath = async (path: string) => {
      if (revalidatedPaths.has(path)) return; // Skip if already revalidated

      try {
        // Normalize path to ensure consistent formatting
        const normalizedPath = path.endsWith("/") ? path : `${path}/`;
        await res.revalidate(normalizedPath);
        revalidatedPaths.add(normalizedPath);
        console.log(`[Revalidate] Successfully revalidated: ${normalizedPath}`);
      } catch (err) {
        failedPaths.add(path);
        console.error(`[Revalidate] Failed to revalidate ${path}:`, err);
      }
    };

    // 1. Revalidate the article itself
    await revalidatePath(`/category/${slug}`);

    // 2. Extract categories from the slug itself for better accuracy
    const extractedCategories = extractCategoriesFromSlug(slug);
    const allCategories = new Set([
      ...categories,
      extractedCategories.category,
    ]);

    if (extractedCategories.subcategory) {
      allCategories.add(extractedCategories.subcategory);
    }

    // 3. Revalidate all paths related to these categories
    for (const category of allCategories) {
      if (!category) continue;

      // Get all related paths for this category
      const relatedPaths = getRelatedPathsForCategory(
        category,
        extractedCategories.subcategory
      );

      // Revalidate each path
      for (const path of relatedPaths) {
        await revalidatePath(path);
      }
    }

    // 4. Always revalidate core sections
    for (const section of CORE_SECTIONS) {
      await revalidatePath(section);
    }

    console.log(
      `[Revalidate] Article ${slug} revalidation complete. Successfully revalidated ${revalidatedPaths.size} paths.`
    );

    if (failedPaths.size > 0) {
      console.warn(
        `[Revalidate] Failed to revalidate ${failedPaths.size} paths for article ${slug}.`
      );
    }

    return failedPaths.size === 0; // Return true only if all paths were successfully revalidated
  } catch (err) {
    console.error(
      `[Revalidate] Error in comprehensive revalidation for article ${slug}:`,
      err
    );
    return false;
  }
}

/**
 * Enhanced revalidate API handler with extended invalidation scope
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify revalidation key for security
  const authKey = req.headers["x-revalidate-key"] as string;
  const expectedKey = process.env.REVALIDATE_SECRET_KEY || "default-secret";

  if (authKey !== expectedKey) {
    console.warn("[Revalidate] Invalid revalidation key provided");
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const body = req.body as RevalidateBody;
    console.log(`[Revalidate] Processing request for type: ${body.type}`, body);

    const startTime = Date.now();

    switch (body.type) {
      case "post":
        if (!body.postSlug) {
          return res.status(400).json({ message: "Post slug is required" });
        }

        const categories = body.categories || [];
        const success = await revalidatePost(res, body.postSlug, categories);

        if (!success) {
          return res.status(500).json({
            message: "Partial or complete failure in revalidating post content",
            error: "See server logs for details",
          });
        }
        break;

      case "category":
        if (!body.path) {
          return res.status(400).json({ message: "Category path is required" });
        }

        console.log(`[Revalidate-API] Revalidating category ${body.path}`);

        try {
          await res.revalidate(body.path);

          // Also revalidate the homepage when a category is revalidated
          if (body.path !== "/") {
            await res.revalidate("/");
          }
        } catch (error) {
          console.error(
            `[Revalidate] Error revalidating category ${body.path}:`,
            error
          );
          return res.status(500).json({
            message: `Failed to revalidate category ${body.path}`,
            error: process.env.NODE_ENV === "development" ? error : undefined,
          });
        }
        break;

      default:
        // Default case: revalidate homepage
        await res.revalidate("/");
    }

    const duration = Date.now() - startTime;

    return res.json({
      revalidated: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      type: body.type,
      path: body.path || body.postSlug,
    });
  } catch (err) {
    console.error("[Revalidate] Unhandled error:", err);
    return res.status(500).json({
      message: "Error revalidating content",
      error: process.env.NODE_ENV === "development" ? err : undefined,
    });
  }
}
