// pages/api/videos/[videoId]/view.ts
// API endpoint to track video views

import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only accept POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { videoId } = req.query;

  if (!videoId || typeof videoId !== "string") {
    return res.status(400).json({ error: "Invalid video ID" });
  }

  try {
    // Get client IP for rate limiting (basic protection)
    const forwarded = req.headers["x-forwarded-for"];
    const ip =
      typeof forwarded === "string"
        ? forwarded.split(",")[0]
        : req.socket.remoteAddress;

    // Create a unique view identifier
    const viewerId = `${ip}-${videoId}`;
    const viewKey = `view:${viewerId}`;

    // Check if this IP has already viewed this video recently (using simple in-memory cache)
    // In production, use Redis or similar for better rate limiting
    const recentView = global.recentViews?.get(viewKey);
    const now = Date.now();

    // Initialize global cache if not exists
    if (!global.recentViews) {
      global.recentViews = new Map();
    }

    // If viewed within last hour, don't count again
    if (recentView && now - recentView < 3600000) {
      return res.status(200).json({
        success: false,
        message: "View already counted recently",
      });
    }

    // Increment view count in database
    const updatedVideo = await prisma.videos.update({
      where: { videoId },
      data: {
        statistics: {
          update: {
            viewCount: {
              increment: 1,
            },
          },
        },
      },
      select: {
        videoId: true,
        statistics: {
          select: {
            viewCount: true,
          },
        },
      },
    });

    // Store in recent views cache
    global.recentViews.set(viewKey, now);

    // Clean up old entries periodically (simple cleanup)
    if (global.recentViews.size > 10000) {
      const cutoff = now - 3600000; // 1 hour ago
      for (const [key, time] of global.recentViews.entries()) {
        if (time < cutoff) {
          global.recentViews.delete(key);
        }
      }
    }

    // Log the view for analytics (optional)
    if (process.env.NODE_ENV === "production") {
      console.log(
        `[View Track] Video ${videoId} viewed. Total: ${updatedVideo.statistics?.viewCount}`
      );
    }

    return res.status(200).json({
      success: true,
      viewCount: updatedVideo.statistics?.viewCount,
    });
  } catch (error: any) {
    console.error(
      `[View Track] Error incrementing view for ${videoId}:`,
      error
    );

    // Don't expose database errors to client
    return res.status(500).json({
      error: "Failed to track view",
      success: false,
    });
  }
}

// Extend global namespace for TypeScript
declare global {
  // eslint-disable-next-line no-var
  var recentViews: Map<string, number> | undefined;
}

export {};
