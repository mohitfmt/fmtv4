import { getCategoryNews } from "@/lib/gql-queries/get-category-news";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    res.setHeader(
      "Cache-Control",
      `s-maxage=3600, stale-while-revalidate=360`
    );
    const [specialFeaturesPosts, galleryPosts] = await Promise.all([
      getCategoryNews("sponsored-content", 5, false),
      getCategoryNews("photos", 5, false),
    ]);

    const sharedData = {
      specialFeaturesPosts: {
        edges: specialFeaturesPosts.map((post: any) => ({ node: post })),
      },
      galleryPosts: {
        edges: galleryPosts.map((post: any) => ({ node: post })),
      },
    };

    res.status(200).json(sharedData);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch shared data",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

