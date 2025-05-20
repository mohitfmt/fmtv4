import type { NextApiRequest, NextApiResponse } from "next";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { GET_SEARCH_POSTS } from "@/lib/gql-queries/get-search-posts";
import { SearchVariables } from "@/types/global";
import { apiErrorResponse } from "@/lib/utils";

const CONTEXT = "/api/search";

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

  const { term, category, page = 0 } = req.query;

  // Input validation
  if (!term || typeof term !== "string" || term.trim().length === 0) {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: "'term' is required and must be a non-empty string.",
    });
  }

  const pageNum = parseInt(page as string, 10);
  if (!Number.isInteger(pageNum) || pageNum < 0) {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: `'page' must be a non-negative integer (received: ${page}).`,
    });
  }

  try {
    const queryVariables: SearchVariables = {
      where: {
        search: term,
        offsetPagination: {
          offset: pageNum * 10,
          size: 10,
        },
      },
    };

    if (category && category !== "all" && category !== "") {
      queryVariables.where.taxQuery = {
        relation: "AND",
        taxArray: [
          {
            field: "SLUG",
            operator: "IN",
            taxonomy: "CATEGORY",
            terms: (category as string).split(","),
          },
        ],
      };
    }

    const response = await gqlFetchAPI(GET_SEARCH_POSTS, {
      variables: queryVariables,
    });

    // Cloudflare + browser caching
    res.setHeader(
      "Cache-Control",
      "public, max-age=300, s-maxage=300, stale-while-revalidate=60"
    );

    return res.status(200).json(response);
  } catch (error) {
    return apiErrorResponse({
      res,
      status: 500,
      context: CONTEXT,
      message: "Internal Server Error while fetching search results.",
      error,
    });
  }
}
