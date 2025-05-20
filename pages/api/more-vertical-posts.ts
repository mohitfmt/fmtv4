import type { NextApiRequest, NextApiResponse } from "next";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { GET_FILTERED_CATEGORY } from "@/lib/gql-queries/get-filtered-category";
import { apiErrorResponse } from "@/lib/utils"; // centralized error logger

const CONTEXT = "/api/more-vertical-posts";
const POSTS_PER_PAGE = 20;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  // Method check
  if (req.method !== "POST") {
    return apiErrorResponse({
      res,
      status: 405,
      context: CONTEXT,
      message: "Method not allowed. Use POST.",
    });
  }

  const { categorySlug, offset } = req.body;

  // Input validation
  if (
    !categorySlug ||
    typeof categorySlug !== "string" ||
    categorySlug.trim() === ""
  ) {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message:
        "Missing or invalid 'categorySlug'. It must be a non-empty string.",
    });
  }

  const parsedOffset = Number(offset);
  if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: `'offset' must be a positive integer. (received: ${offset})`,
    });
  }

  try {
    const response = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
      variables: {
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
      },
    });

    res.setHeader(
      "Cache-Control",
      "public, max-age=300, s-maxage=300, stale-while-revalidate=60"
    );

    return res.status(200).json({ posts: response.posts });
  } catch (error) {
    return apiErrorResponse({
      res,
      status: 500,
      context: CONTEXT,
      message: `Internal Server Error while fetching posts for category '${categorySlug}' and page '${offset}'`,
      error,
    });
  }
}
