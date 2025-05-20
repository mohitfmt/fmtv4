import { calculateCacheDuration, withTimeout } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

const CONTEXT = "/api/most-viewed";
const CACHE_SECONDS = calculateCacheDuration();
const POSTS_TIMEOUT_MS = 5000;

function logError(context: string, error: unknown) {
  console.error(
    `[API_ERROR] ${context}:`,
    error instanceof Error ? error.stack || error.message : error
  );
}

async function fetchMostViewed(): Promise<any[]> {
  try {
    const results = await withTimeout(
      prisma.mostViewed.findMany(),
      POSTS_TIMEOUT_MS
    );
    return results.map((item) => ({
      ...item,
      date: item.date.toISOString(),
    }));
  } catch (error) {
    logError(`${CONTEXT} > fetchMostViewed`, error);
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  // Method check
  if (req.method !== "GET") {
    logError(`${CONTEXT}`, "Invalid method");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const mostViewedData = await fetchMostViewed();

    res.setHeader(
      "Cache-Control",
      `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`
    );

    return res.status(200).json(mostViewedData);
  } catch (error) {
    logError(`${CONTEXT}`, error);
    return res.status(500).json({
      error: "Failed to fetch most viewed data",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  } finally {
    await prisma.$disconnect();
  }
}
