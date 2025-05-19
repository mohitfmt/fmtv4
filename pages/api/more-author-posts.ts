// pages/api/more-author-posts.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { GET_FILTERED_CATEGORY } from "@/lib/gql-queries/get-filtered-category";

// Handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  // Fail-fast for invalid method
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { authorId, offset = 0 } = req.body;

  // 6. Input validation
  if (!authorId || isNaN(Number(authorId))) {
    return res.status(400).json({ error: "Invalid or missing authorId" });
  }

  res.setHeader(
    "Cache-Control",
    "public, max-age=300, s-maxage=300, stale-while-revalidate=60"
  );

  try {
    const response = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
      variables: {
        first: 20,
        where: {
          offsetPagination: { offset: Number(offset), size: 20 },
          authorIn: [parseInt(authorId, 10)],
          status: "PUBLISH",
        },
      },
    });

    const payload = {
      posts: response.posts,
      total: response.posts?.edges?.length ?? 0,
    };

    return res.status(200).json(payload);
  } catch (error) {
    // Observability
    console.error(`[API_ERROR] Fetch failed for api/more-auhtor-post:`, error);
    return res.status(500).json({ error: "Failed to load more posts" });
  }
}
