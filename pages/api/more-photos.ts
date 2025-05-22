import { NextApiRequest, NextApiResponse } from "next";
import { apiErrorResponse } from "@/lib/utils"; // your renamed centralized error helper
import { getFilteredCategoryPosts } from "@/lib/gql-queries/get-filtered-category-posts";

const CONTEXT = "/api/more-photos";
const POSTS_PER_PAGE = 12;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Method validation
  if (req.method !== "POST") {
    return apiErrorResponse({
      res,
      status: 405,
      context: CONTEXT,
      message: "Method not allowed. Use POST.",
    });
  }

  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  const { categorySlug = "photos", offset } = req.body;

  // Input validation
  if (typeof categorySlug !== "string" || categorySlug?.trim() === "") {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: `'categorySlug' must be a non-empty string. (received: ${categorySlug})`,
    });
  }

  const parsedOffset = Number(offset);
  if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: `'offset' must be a non-negative integer. (received: ${offset})`,
    });
  }

  // Cache control for Cloudflare or similar CDN
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=60");

  try {
    const variables = {
      first: POSTS_PER_PAGE,
      where: {
        offsetPagination: { offset: parsedOffset, size: POSTS_PER_PAGE },
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
    };
    const response = await getFilteredCategoryPosts(variables);

    return res.status(200).json({ posts: response?.posts });
  } catch (error) {
    return apiErrorResponse({
      res,
      status: 500,
      context: CONTEXT,
      message: "Internal Server Error while loading more photo posts.",
      error,
    });
  }
}
