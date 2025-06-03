// pages/api/gallery-features-content.ts
import { getCategoryNews } from "@/lib/gql-queries/get-category-news";
import { NextApiRequest, NextApiResponse } from "next";
import { withSmartLRUCache } from "@/lib/cache/withSmartLRU";
import { sidebarContentCache } from "@/lib/cache/smart-cache-registry";

// Cached function to fetch sidebar data
const getCachedSidebarData = withSmartLRUCache(
  () => "sidebar:gallery-features", // Fixed cache key since there's no variation
  async () => {
    try {
      // Fetch both categories in parallel
      const [specialFeaturesPosts, galleryPosts] = await Promise.all([
        getCategoryNews("sponsored-content", 6, false).catch((err) => {
          console.error("[Gallery API] Error fetching sponsored-content:", err);
          return []; // Return empty array on error
        }),
        getCategoryNews("photos", 5, false).catch((err) => {
          console.error("[Gallery API] Error fetching photos:", err);
          return []; // Return empty array on error
        }),
      ]);

      // Ensure we always have arrays, even if the API returns null/undefined
      const safeSpecialFeatures = Array.isArray(specialFeaturesPosts)
        ? specialFeaturesPosts
        : [];

      const safeGalleryPosts = Array.isArray(galleryPosts) ? galleryPosts : [];

      // Log if we got unexpected data types
      if (!Array.isArray(specialFeaturesPosts)) {
        console.warn(
          "[Gallery API] specialFeaturesPosts is not an array:",
          typeof specialFeaturesPosts,
          specialFeaturesPosts
        );
      }

      if (!Array.isArray(galleryPosts)) {
        console.warn(
          "[Gallery API] galleryPosts is not an array:",
          typeof galleryPosts,
          galleryPosts
        );
      }

      // Return the data in the expected format
      return {
        specialFeaturesPosts: {
          edges: safeSpecialFeatures.map((post: any) => ({ node: post })),
        },
        galleryPosts: {
          edges: safeGalleryPosts.map((post: any) => ({ node: post })),
        },
      };
    } catch (error) {
      console.error("[Gallery API] Unexpected error in data fetching:", error);
      // Return safe empty structure on any error
      return {
        specialFeaturesPosts: { edges: [] },
        galleryPosts: { edges: [] },
      };
    }
  },
  sidebarContentCache // Use the cache from central registry
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  try {
    // Use the cached function
    const sharedData = await getCachedSidebarData();

    // Since we're using smart cache, we can have shorter browser cache
    // The smart cache will handle invalidation when content changes
    res.setHeader(
      "Cache-Control",
      "public, max-age=60, s-maxage=300, stale-while-revalidate=60"
    );

    return res.status(200).json(sharedData);
  } catch (error) {
    // Even if something goes wrong, return a valid structure
    console.error("[Gallery API] Handler error:", error);

    // Return empty but valid structure on error
    return res.status(200).json({
      specialFeaturesPosts: { edges: [] },
      galleryPosts: { edges: [] },
    });
  }
}

// Optional: Add a function to manually invalidate this cache
export async function invalidateSidebarCache() {
  sidebarContentCache.delete("sidebar:gallery-features");
  console.log("[Gallery API] Sidebar cache invalidated");
}
