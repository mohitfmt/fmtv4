import type { NextApiRequest, NextApiResponse } from "next";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { GET_FILTERED_CATEGORY } from "@/lib/gql-queries/get-filtered-category";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  // Method check
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { categorySlug, offset } = req.body;

  // Input validation
  if (!categorySlug || typeof categorySlug !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'categorySlug'" });
  }

  const parsedOffset = Number(offset);
  if (isNaN(parsedOffset) || parsedOffset < 0) {
    return res.status(400).json({ error: "Invalid offset" });
  }

  try {
    const response = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
      variables: {
        first: 20,
        where: {
          offsetPagination: { offset: parsedOffset, size: 20 },
          taxQuery: {
            relation: "AND",
            taxArray: [
              {
                field: "SLUG",
                operator: "AND",
                taxonomy: "CATEGORY",
                terms: [categorySlug],
              },
            ],
          },
        },
      },
    });

    // Cloudflare-compatible cache headers
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=60");

    res.status(200).json({ posts: response.posts });
  } catch {
    res.status(500).json({ error: "Failed to load more posts" });
  }
}
