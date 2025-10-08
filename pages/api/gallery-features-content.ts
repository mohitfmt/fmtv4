import { getCategoryNews } from "@/lib/gql-queries/get-category-news";
import { NextApiRequest, NextApiResponse } from "next";

async function getSidebarData() {
  try {
    const [specialFeaturesPosts, galleryPosts] = await Promise.all([
      getCategoryNews("sponsored-content", 6, false).catch((err) => {
        console.error("[Gallery API] Error fetching sponsored-content:", err);
        return [];
      }),
      getCategoryNews("photos", 5, false).catch((err) => {
        console.error("[Gallery API] Error fetching photos:", err);
        return [];
      }),
    ]);

    const safeSpecialFeatures = Array.isArray(specialFeaturesPosts)
      ? specialFeaturesPosts
      : [];

    const safeGalleryPosts = Array.isArray(galleryPosts) ? galleryPosts : [];

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
    return {
      specialFeaturesPosts: { edges: [] },
      galleryPosts: { edges: [] },
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  try {
    // Call function directly without cache
    const sharedData = await getSidebarData();

    // Set CDN cache headers for SSR
    res.setHeader(
      "Cache-Control",
      "public, max-age=60, s-maxage=300, stale-while-revalidate=60"
    );

    return res.status(200).json(sharedData);
  } catch (error) {
    console.error("[Gallery API] Handler error:", error);
    return res.status(200).json({
      specialFeaturesPosts: { edges: [] },
      galleryPosts: { edges: [] },
    });
  }
}
