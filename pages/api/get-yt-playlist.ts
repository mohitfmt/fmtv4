import type { NextApiRequest, NextApiResponse } from "next";
import { apiErrorResponse } from "@/lib/utils";

const CONTEXT = "/api/get-yt-playlist";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Method check
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

  const { playlistId } = req.body;

  // Input validation
  if (
    !playlistId ||
    typeof playlistId !== "string" ||
    playlistId.trim() === ""
  ) {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: "'playlistId' is required and must be a non-empty string.",
    });
  }

  try {
    const response = await fetch(
      `https://storage.googleapis.com/origin-s3feed.freemalaysiatoday.com/json/youtube-playlist/${playlistId}.json`
    );

    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }

    const data = await response?.json();

    // CDN cache control
    res.setHeader(
      "Cache-Control",
      "public, max-age=300, s-maxage=300, stale-while-revalidate=60"
    );

    return res.status(200).json(data);
  } catch (error) {
    return apiErrorResponse({
      res,
      status: 500,
      context: CONTEXT,
      message: "Internal Server Error while fetching playlist.",
      error,
    });
  }
}
