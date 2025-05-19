import type { NextApiRequest, NextApiResponse } from "next";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { GET_SEARCH_POSTS } from "@/lib/gql-queries/get-search-posts";
import { SearchVariables } from "@/types/global";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  // Method validation
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { term, category, page = "0" } = req.query;

  // Input validation
  if (!term || typeof term !== "string" || term.trim().length === 0) {
    return res.status(400).json({ message: "Missing or invalid search term" });
  }

  const pageNum = parseInt(page as string, 10);
  if (isNaN(pageNum) || pageNum < 0) {
    return res.status(400).json({ message: "Invalid page number" });
  }

  try {
    const queryVariables: SearchVariables = {
      where: {
        search: term,
        offsetPagination: {
          offset: 10 * pageNum,
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
  } catch {
    return res.status(500).json({ message: "Error fetching search results" });
  }
}
