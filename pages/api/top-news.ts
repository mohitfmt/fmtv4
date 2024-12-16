import { NextApiRequest, NextApiResponse } from "next";
import { getHeadlineNews } from "@/lib/gql-queries/get-headline-news";

async function fetchWithRetry(category: string, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const posts = await getHeadlineNews(category, 1, false);
      return posts[0] ? { ...posts[0], categoryName: category } : null;
    } catch (error) {
      if (i === retries - 1) throw error;
      console.error(`Retry ${i + 1} failed for ${category}:`, error);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const categories = [
    "super-highlight",
    "top-news",
    "business",
    "opinion",
    "world",
    "leisure",
    "sports",
    "top-bm",
    "video",
  ];

  try {
    // Set headers at the beginning
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=30"
    );

    // Initialize an array to store results
    const results = [];

    // Process categories in smaller batches
    const batchSize = 3;
    for (let i = 0; i < categories.length; i += batchSize) {
      const batch = categories.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((category) =>
          fetchWithRetry(category).catch((error) => {
            console.error(`Error fetching ${category}:`, error);
            return null;
          })
        )
      );
      results.push(...batchResults.filter(Boolean));
    }

    // Send complete results at once
    return res.status(200).json(results);
  } catch (error) {
    console.error("Top news API error:", error);
    return res.status(500).json({
      error: "Failed to fetch top news",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
