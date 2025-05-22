import type { NextApiRequest, NextApiResponse } from "next";
import { apiErrorResponse } from "@/lib/utils";
import { getFilteredCategoryPosts } from "@/lib/gql-queries/get-filtered-category-posts";

const POSTS_PER_PAGE = 4;
const CONTEXT = "/api/more-horizontal-posts";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  // Method check
  if (req.method !== "GET") {
    return apiErrorResponse({
      res,
      status: 405,
      context: CONTEXT,
      message: "Method not allowed. Use GET.",
    });
  }

  const { page = 1, category } = req.query;
  const numericPage = Number(page);

  // Input validation
  if (!category || typeof category !== "string" || category.trim() === "") {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: `'category' is required and must be a non-empty string.`,
    });
  }

  if (!Number.isInteger(numericPage) || numericPage < 1 || numericPage > 1000) {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: `'page' must be an integer between 1 and 1000 (received: ${page}).`,
    });
  }

  const offset = (numericPage - 1) * POSTS_PER_PAGE + 5;

  try {
    const variables = {
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
    };
    const posts = await getFilteredCategoryPosts(variables);

    return res.status(200).json({
      posts: posts?.posts?.edges,
      hasMore: posts?.posts?.edges?.length === POSTS_PER_PAGE,
    });
  } catch (error) {
    return apiErrorResponse({
      res,
      status: 500,
      context: CONTEXT,
      message: `Internal Server Error while fetching posts for category '${category}' and page '${page}'`,
      error,
    });
  }
}
