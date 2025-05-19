import type { NextApiRequest, NextApiResponse } from "next";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { GET_FILTERED_CATEGORY } from "@/lib/gql-queries/get-filtered-category";

const POSTS_PER_PAGE = 4;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  // Fail-fast method check
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { page = 1, category } = req.query;

  // Input validation
  const numericPage = Number(page);
  if (!category || typeof category !== "string") {
    return res.status(400).json({ error: "Missing or invalid category" });
  }

  if (isNaN(numericPage) || numericPage < 1 || numericPage > 1000) {
    return res.status(400).json({ error: "Invalid page number" });
  }

  // Pagination offset (skip initial 5 posts)
  const offset = (numericPage - 1) * POSTS_PER_PAGE + 5;

  try {
    const posts = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
      variables: {
        first: POSTS_PER_PAGE,
        where: {
          offsetPagination: {
            offset,
            size: POSTS_PER_PAGE,
          },
          taxQuery: {
            relation: "AND",
            taxArray: [
              {
                field: "SLUG",
                operator: "AND",
                taxonomy: "CATEGORY",
                terms: [category],
              },
            ],
          },
        },
      },
    });

    // Cloudflare-compatible caching
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=60");

    return res.status(200).json({
      posts: posts.posts.edges,
      hasMore: posts.posts.edges.length === POSTS_PER_PAGE,
    });
  } catch (error) {
    console.error(`[API_ERROR] /${category}/posts page=${numericPage}:`, error);
    return res.status(500).json({ error: "Failed to fetch posts" });
  }
}
