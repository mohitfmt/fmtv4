import type { NextApiRequest, NextApiResponse } from "next";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { GET_FILTERED_CATEGORY } from "@/lib/gql-queries/get-filtered-category";
import { apiErrorResponse } from "@/lib/utils";

const CONTEXT = "/api/more-tag-posts";
const POSTS_PER_PAGE = 20;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  // Method validation
  if (req.method !== "POST") {
    return apiErrorResponse({
      res,
      status: 405,
      context: CONTEXT,
      message: "Method not allowed. Use POST.",
    });
  }

  const { tagId, offset } = req.body;

  // Validation
  if (!tagId || isNaN(Number(tagId))) {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: `Missing or invalid 'tagId' (received: ${tagId}).`,
    });
  }

  const parsedOffset = Number(offset) || 0;

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
                field: "ID",
                operator: "IN",
                taxonomy: "TAG",
                terms: [tagId],
              },
            ],
          },
          status: "PUBLISH",
        },
      },
    });

    res.setHeader(
      "Cache-Control",
      "public, max-age=300, s-maxage=300, stale-while-revalidate=60"
    );

    return res.status(200).json({
      posts: response.posts,
      total: response.posts.edges.length,
    });
  } catch (error) {
    return apiErrorResponse({
      res,
      status: 500,
      context: CONTEXT,
      message: "Internal Server Error :",
      error,
    });
  }
}
