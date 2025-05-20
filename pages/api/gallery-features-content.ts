import { getCategoryNews } from "@/lib/gql-queries/get-category-news";
import { NextApiRequest, NextApiResponse } from "next";
import { apiErrorResponse } from "@/lib/utils";

const CONTEXT = "/api/gallery-features-content";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  // Cloudflare + browser caching
  res.setHeader(
    "Cache-Control",
    "public, max-age=300, s-maxage=3600, stale-while-revalidate=60"
  );

  try {
    const [specialFeaturesPosts, galleryPosts] = await Promise.all([
      getCategoryNews("sponsored-content", 6, false),
      getCategoryNews("photos", 5, false),
    ]);

    const sharedData = {
      specialFeaturesPosts: {
        edges: specialFeaturesPosts?.map((post: any) => ({ node: post })),
      },
      galleryPosts: {
        edges: galleryPosts?.map((post: any) => ({ node: post })),
      },
    };

    return res.status(200).json(sharedData);
  } catch (error) {
    return apiErrorResponse({
      res,
      status: 500,
      context: CONTEXT,
      message: "Internal Server Error while fetching gallery/features content.",
      error,
    });
  }
}
