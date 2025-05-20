import type { NextApiRequest, NextApiResponse } from "next";
import { getCategoryNews } from "@/lib/gql-queries/get-category-news";
import { ParsedUrlQuery } from "querystring";
import { apiErrorResponse } from "@/lib/utils";

const CONTEXT = "/api/fetch-section-data";

// Deduplication setup
const recentlyRequestedKeys = new Map<string, number>();
const DEDUPE_TTL_MS = 30_000; // 30 seconds

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
      message: "Method Not Allowed. Use GET.",
    });
  }

  const { category, limit } = req.query as ParsedUrlQuery;

  // Input validation
  if (
    !category ||
    typeof category !== "string" ||
    category.trim().length === 0
  ) {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: "Missing or invalid 'category' parameter.",
    });
  }

  const parsedLimit = Number(limit || 5);
  if (!Number.isInteger(parsedLimit) || parsedLimit <= 0 || parsedLimit > 7) {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: "'limit' must be a number between 1 and 7.",
    });
  }

  // Deduplication check
  const key = `${category}-${parsedLimit}`;
  const now = Date.now();
  const lastCalled = recentlyRequestedKeys.get(key) || 0;

  if (now - lastCalled < DEDUPE_TTL_MS) {
    return apiErrorResponse({
      res,
      status: 429,
      context: CONTEXT,
      message: `Too many requests for '${key}'. Please wait before retrying.`,
    });
  }

  // Store the timestamp and auto-expire after TTL
  recentlyRequestedKeys.set(key, now);
  setTimeout(() => recentlyRequestedKeys.delete(key), DEDUPE_TTL_MS);

  try {
    const posts = await getCategoryNews(category, parsedLimit, false);

    // CDN + browser caching
    res.setHeader(
      "Cache-Control",
      "public, max-age=300, s-maxage=300, stale-while-revalidate=60"
    );

    return res.status(200).json(posts);
  } catch (error) {
    return apiErrorResponse({
      res,
      status: 500,
      context: CONTEXT,
      message: "Internal Server Error while fetching hoem section posts.",
      error,
    });
  }
}
