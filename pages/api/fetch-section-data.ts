import type { NextApiRequest, NextApiResponse } from "next";
import { getCategoryNews } from "@/lib/gql-queries/get-category-news";
import { ParsedUrlQuery } from "querystring";

// Deduplication cache per category-limit key
const recentlyRequestedKeys = new Map<string, number>();
const DEDUPE_TTL_MS = 30_000; // 30 seconds

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { category, limit } = req.query as ParsedUrlQuery;

  if (!category || typeof category !== "string") {
    return res
      .status(400)
      .json({ error: "Missing or invalid 'category' parameter." });
  }

  const parsedLimit = Number(limit || 5);
  if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 7) {
    return res
      .status(400)
      .json({ error: "'limit' must be a number between 1 and 7." });
  }

  // Generates a unique key for the request (e.g., top-news-6).
  // Checks when this key was last requested.
  const key = `${category}-${parsedLimit}`;
  const now = Date.now();
  const lastCalled = recentlyRequestedKeys.get(key) || 0;

  // If this section (category-limit) was requested within the last 30 seconds,
  // it rejects the call to avoid a flood of requests (especially during hydration glitches or network retries).
  if (now - lastCalled < DEDUPE_TTL_MS) {
    return res
      .status(429)
      .json({ error: "Please wait before retrying this section." });
  }

  // Otherwise, it records this request as "recently triggered" and schedules its expiry after 30 seconds.

  recentlyRequestedKeys.set(key, now);
  setTimeout(() => recentlyRequestedKeys.delete(key), DEDUPE_TTL_MS);

  try {
    const posts = await getCategoryNews(category, parsedLimit, false);

    res.setHeader(
      "Cache-Control",
      "public, max-age=300, s-maxage=300, stale-while-revalidate=60"
    );
    return res.status(200).json(posts);
  } catch {
    return res
      .status(500)
      .json({ error: "[API_ERROR] Failed to fetch posts section." });
  }
}
