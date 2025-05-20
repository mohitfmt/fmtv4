import type { NextApiRequest, NextApiResponse } from "next";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { GET_FILTERED_CATEGORY } from "@/lib/gql-queries/get-filtered-category";
import { apiErrorResponse } from "@/lib/utils";

const CONTEXT = "/api/more-author-posts";
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

  const { authorId, offset = 0 } = req.body;

  // Input validation
  const parsedAuthorId = Number(authorId);
  const parsedOffset = Number(offset);

  if (!authorId || isNaN(parsedAuthorId) || parsedAuthorId <= 0) {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: `'authorId' is required and must be a valid number. (received: ${authorId})`,
    });
  }

  if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: `'offset' must be a non-negative integer. (received: ${offset})`,
    });
  }

  // CDN-friendly caching
  res.setHeader(
    "Cache-Control",
    "public, max-age=300, s-maxage=300, stale-while-revalidate=60"
  );

  try {
    const response = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
      variables: {
        first: POSTS_PER_PAGE,
        where: {
          offsetPagination: { offset: parsedOffset, size: POSTS_PER_PAGE },
          authorIn: [parsedAuthorId],
          status: "PUBLISH",
        },
      },
    });

    return res.status(200).json({
      posts: response?.posts,
      total: response?.posts?.edges?.length ?? 0,
    });
  } catch (error) {
    return apiErrorResponse({
      res,
      status: 500,
      context: CONTEXT,
      message: "Internal Server Error while fetching author posts.",
      error,
    });
  }
}
