// pages/api/revalidate.ts
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

// Section to frontend path mapping based on site navigation
const SECTION_PATH_MAP: Record<string, string> = {
  nation: "/news/",
  bahasa: "/berita/",
  business: "/business/",
  opinion: "/opinion/",
  world: "/world/",
  sports: "/sports/",
  leisure: "/lifestyle/",
};

/**
 * Normalizes a path to ensure it has the correct format for revalidation
 * Handles various URL patterns found in the site structure
 */
function normalizePath(path: string): string {
  // Ensure path starts with a leading slash
  let normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // Ensure path ends with a trailing slash
  if (!normalizedPath.endsWith("/")) {
    normalizedPath = `${normalizedPath}/`;
  }

  // Handle special pages
  const specialPaths = [
    "/photos/",
    "/videos/",
    "/accelerator/",
    "/contact-us/",
    "/about/",
    "/privacy-policy/",
  ];
  if (specialPaths.includes(normalizedPath)) {
    return normalizedPath;
  }

  // Handle main section pages without needing to add category prefix
  const mainSections = [
    "/news/",
    "/berita/",
    "/business/",
    "/lifestyle/",
    "/opinion/",
    "/world/",
    "/sports/",
  ];
  if (mainSections.includes(normalizedPath)) {
    return normalizedPath;
  }

  // Handle case where we already have double category
  if (normalizedPath.includes("/category/category/")) {
    return normalizedPath;
  }

  // Handle case where we have a standard article path
  if (normalizedPath.includes("/category/")) {
    return normalizedPath;
  }

  // If none of the above, assume it's an article path that needs the category prefix
  if (!normalizedPath.startsWith("/category/")) {
    // Strip leading slash first to avoid double slashes
    const pathWithoutLeadingSlash = normalizedPath.startsWith("/")
      ? normalizedPath.substring(1)
      : normalizedPath;

    normalizedPath = `/category/${pathWithoutLeadingSlash}`;
  }

  return normalizedPath;
}

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
    // Log the incoming slug to help with debugging
    console.log(`[Revalidate] Processing article with slug: ${slug}`);

    // Helper function to revalidate a path and track results
    const revalidatePath = async (path: string) => {
      if (revalidatedPaths.has(path)) return; // Skip if already revalidated
      const maxRetries = 2;
      try {
        // Normalize the path to ensure consistent formatting
        const normalizedPath = normalizePath(path);

        // Add exponential backoff retry for robustness
        let retries = 0;

        let success = false;

        while (!success && retries <= maxRetries) {
          try {
            await res.revalidate(normalizedPath);
            success = true;
          } catch (err) {
            if (retries < maxRetries) {
              // Wait with exponential backoff (300ms, 900ms) with jitter
              const baseDelay = 300 * Math.pow(3, retries);
              const jitter = baseDelay * 0.2 * (Math.random() - 0.5); // Add ±10% jitter
              const delay = Math.floor(baseDelay + jitter);

              console.log(
                `[Revalidate] Retry ${retries + 1}/${maxRetries} for ${normalizedPath} in ${delay}ms`
              );
              await new Promise((resolve) => setTimeout(resolve, delay));
              retries++;
            } else {
              throw err;
            }
          }
        }

        revalidatedPaths.add(normalizedPath);
        console.log(`[Revalidate] Successfully revalidated: ${normalizedPath}`);
      } catch (err) {
        failedPaths.add(path);
        console.error(
          `[Revalidate] Failed to revalidate ${path} after ${maxRetries} retries:`,
          err
        );
      }
    };

    // 1. Revalidate the article itself
    // Handle multiple possible path formats intelligently
    let articlePath = slug;

    // Normalize the path format to ensure consistent handling
    if (!slug.includes("category/")) {
      articlePath = `category/${slug}`;
    }

    await revalidatePath(articlePath);

    // 2. Extract categories from the slug itself for better accuracy
    const extractedCategories = extractCategoriesFromSlug(slug);
    const allCategories = new Set([
      ...categories,
      extractedCategories.category,
    ]);

    if (extractedCategories.subcategory) {
      allCategories.add(extractedCategories.subcategory);
    }

    console.log(
      `[Revalidate] Extracted categories: ${Array.from(allCategories).join(", ")}`
    );

    // 3. Revalidate all paths related to these categories
    for (const category of allCategories) {
      if (!category) continue;

      // Get all related paths for this category from navigation structure
      const relatedPaths = getRelatedPathsForCategory(
        category,
        extractedCategories.subcategory
      );

      console.log(
        `[Revalidate] Related paths for category ${category}: ${relatedPaths.length} paths`
      );

      // Revalidate each path
      for (const path of relatedPaths) {
        await revalidatePath(path);
      }

      // Also revalidate the frontend section path for this category
      if (SECTION_PATH_MAP[category]) {
        await revalidatePath(SECTION_PATH_MAP[category]);
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

    // Return true even if some paths failed to avoid cascading failures
    return true;
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

        // Enhanced logging to help with debugging path issues
        console.log(
          `[Revalidate] Revalidating post with slug: ${body.postSlug}`
        );
        console.log(`[Revalidate] Categories:`, categories);

        const success = await revalidatePost(res, body.postSlug, categories);

        // More tolerant response handling - always return success to avoid
        // WebSub retrying constantly which could overload the system
        if (!success) {
          console.warn(
            `[Revalidate] Partial failure in revalidating post: ${body.postSlug}`
          );

          // Return 200 instead of 500 to prevent WebSub from retrying endlessly
          return res.status(200).json({
            revalidated: true,
            message: "Completed with some path failures",
            timestamp: new Date().toISOString(),
            type: body.type,
            path: body.postSlug,
          });
        }
        break;

      case "category":
        if (!body.path) {
          return res.status(400).json({ message: "Category path is required" });
        }

        console.log(`[Revalidate-API] Revalidating category ${body.path}`);

        try {
          // Normalize the path for category revalidation
          const normalizedPath = normalizePath(body.path);

          // Add retry logic for category revalidation too
          let retries = 0;
          const maxRetries = 2;
          let success = false;

          while (!success && retries <= maxRetries) {
            try {
              await res.revalidate(normalizedPath);
              success = true;
            } catch (err) {
              if (retries < maxRetries) {
                const delay = 300 * Math.pow(2, retries);
                console.log(
                  `[Revalidate] Retry ${retries + 1} for category ${normalizedPath} in ${delay}ms`
                );
                await new Promise((resolve) => setTimeout(resolve, delay));
                retries++;
              } else {
                throw err;
              }
            }
          }

          // Also revalidate the homepage when a category is revalidated
          if (normalizedPath !== "/") {
            let retriesHome = 0;
            let successHome = false;

            while (!successHome && retriesHome <= maxRetries) {
              try {
                await res.revalidate("/");
                successHome = true;
              } catch (err) {
                if (retriesHome < maxRetries) {
                  const delay = 300 * Math.pow(2, retriesHome);
                  console.log(
                    `[Revalidate] Retry ${retriesHome + 1} for homepage in ${delay}ms`
                  );
                  await new Promise((resolve) => setTimeout(resolve, delay));
                  retriesHome++;
                } else {
                  throw err;
                }
              }
            }
          }
        } catch (error) {
          console.error(
            `[Revalidate] Error revalidating category ${body.path}:`,
            error
          );

          // Return 200 with error message instead of 500 to prevent retries
          return res.status(200).json({
            revalidated: true,
            message: `Attempted to revalidate category ${body.path}`,
            error: "Some paths may not have been revalidated",
            timestamp: new Date().toISOString(),
          });
        }
        break;

      default:
        // Default case: revalidate homepage
        let retriesHome = 0;
        const maxRetriesHome = 2;
        let successHome = false;

        while (!successHome && retriesHome <= maxRetriesHome) {
          try {
            await res.revalidate("/");
            successHome = true;
          } catch (err) {
            if (retriesHome < maxRetriesHome) {
              const delay = 300 * Math.pow(2, retriesHome);
              console.log(
                `[Revalidate] Retry ${retriesHome + 1} for homepage in ${delay}ms`
              );
              await new Promise((resolve) => setTimeout(resolve, delay));
              retriesHome++;
            } else {
              throw err;
            }
          }
        }
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

    // Always return 200 to prevent WebSub webhook retries
    return res.status(200).json({
      revalidated: false,
      message: "Error in revalidation process, will retry on next update",
      timestamp: new Date().toISOString(),
    });
  }
}
