// lib/dashboard/queries/trending.ts
import { PrismaClient } from "@prisma/client";
import { subDays } from "date-fns";
import { QUERY_CONFIG } from "../constants";

export interface TrendingVideo {
  videoId: string;
  title: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  velocity: number; // views per hour
  engagement: number; // engagement rate
  publishedAt: Date;
  thumbnail: string | null;
  isShort: boolean;
  tier: string;
  duration: string;
}

/**
 * Calculate view velocity (views per hour since publish)
 */
function calculateVelocity(video: any): number {
  const hoursSincePublish = Math.max(
    1,
    (Date.now() - new Date(video.publishedAt).getTime()) / (1000 * 60 * 60)
  );

  const viewCount = extractViewCount(video);
  return Math.round(viewCount / hoursSincePublish);
}

/**
 * Calculate engagement rate
 */
function calculateEngagement(video: any): number {
  const viewCount = extractViewCount(video);
  const likeCount = extractLikeCount(video);
  const commentCount = extractCommentCount(video);

  if (viewCount === 0) return 0;

  return Number((((likeCount + commentCount) / viewCount) * 100).toFixed(2));
}

/**
 * Extract view count from statistics JSON
 */
function extractViewCount(video: any): number {
  if (typeof video.statistics === "object" && video.statistics) {
    return Number(video.statistics.viewCount || 0);
  }
  return 0;
}

/**
 * Extract like count from statistics JSON
 */
function extractLikeCount(video: any): number {
  if (typeof video.statistics === "object" && video.statistics) {
    return Number(video.statistics.likeCount || 0);
  }
  return 0;
}

/**
 * Extract comment count from statistics JSON
 */
function extractCommentCount(video: any): number {
  if (typeof video.statistics === "object" && video.statistics) {
    return Number(video.statistics.commentCount || 0);
  }
  return 0;
}

/**
 * Extract thumbnail URL from thumbnails JSON
 */
function extractThumbnail(video: any): string | null {
  if (typeof video.thumbnails === "object" && video.thumbnails) {
    return (
      video.thumbnails.high ||
      video.thumbnails.medium ||
      video.thumbnails.default ||
      null
    );
  }
  return null;
}

/**
 * Extract duration from contentDetails JSON
 */
function extractDuration(video: any): string {
  if (typeof video.contentDetails === "object" && video.contentDetails) {
    return video.contentDetails.duration || "PT0S";
  }
  return "PT0S";
}

/**
 * Get trending videos with calculated metrics
 */
export async function getTrendingVideos(
  prisma: PrismaClient,
  limit = QUERY_CONFIG.TRENDING_LIMIT
): Promise<TrendingVideo[]> {
  try {
    const daysAgo = subDays(new Date(), QUERY_CONFIG.TRENDING_DAYS_BACK);

    // Fetch recent videos with high-tier classifications
    const videos = await prisma.videos.findMany({
      where: {
        publishedAt: {
          gte: daysAgo,
        },
        OR: [
          { tier: { in: ["hot", "trending", "viral-short", "popular-short"] } },
          { isShort: false }, // Include all recent regular videos
          { isShort: true }, // Include all recent shorts
        ],
      },
      orderBy: [{ publishedAt: "desc" }],
      take: limit * 10, // Get more to filter/sort in JavaScript
      select: {
        videoId: true,
        title: true,
        publishedAt: true,
        statistics: true,
        thumbnails: true,
        contentDetails: true,
        isShort: true,
        tier: true,
      },
    });

    // Process and calculate metrics
    const processed = videos
      .map((video) => {
        const viewCount = extractViewCount(video);
        const likeCount = extractLikeCount(video);
        const commentCount = extractCommentCount(video);

        // Filter by minimum view thresholds
        const minViews = video.isShort
          ? QUERY_CONFIG.TRENDING_MIN_VIEWS.SHORT
          : QUERY_CONFIG.TRENDING_MIN_VIEWS.VIDEO;

        if (
          viewCount < minViews &&
          !["hot", "trending", "viral-short"].includes(video.tier)
        ) {
          return null;
        }

        return {
          videoId: video.videoId,
          title: video.title,
          viewCount,
          likeCount,
          commentCount,
          velocity: calculateVelocity(video),
          engagement: calculateEngagement(video),
          publishedAt: video.publishedAt,
          thumbnail: extractThumbnail(video),
          isShort: video.isShort,
          tier: video.tier,
          duration: extractDuration(video),
        };
      })
      .filter((video): video is TrendingVideo => video !== null)
      .sort((a, b) => {
        // Sort by a combination of velocity and engagement
        const scoreA = a.velocity + a.engagement * 100;
        const scoreB = b.velocity + b.engagement * 100;
        return scoreB - scoreA;
      })
      .slice(0, limit);

    return processed;
  } catch (error) {
    console.error("Failed to get trending videos:", error);
    return [];
  }
}

/**
 * Get top performing videos by engagement rate
 */
export async function getTopPerformers(
  prisma: PrismaClient,
  limit = QUERY_CONFIG.PERFORMANCE_TOP_LIMIT
): Promise<TrendingVideo[]> {
  try {
    // Get all videos (not just recent)
    const videos = await prisma.videos.findMany({
      orderBy: [{ publishedAt: "desc" }],
      take: 100, // Get top 100 to process
      select: {
        videoId: true,
        title: true,
        publishedAt: true,
        statistics: true,
        thumbnails: true,
        contentDetails: true,
        isShort: true,
        tier: true,
      },
    });

    // Calculate engagement and sort
    const processed = videos
      .map((video) => {
        const viewCount = extractViewCount(video);
        const likeCount = extractLikeCount(video);
        const commentCount = extractCommentCount(video);

        // Skip videos with very low views
        if (viewCount < 1000) return null;

        return {
          videoId: video.videoId,
          title: video.title,
          viewCount,
          likeCount,
          commentCount,
          velocity: calculateVelocity(video),
          engagement: calculateEngagement(video),
          publishedAt: video.publishedAt,
          thumbnail: extractThumbnail(video),
          isShort: video.isShort,
          tier: video.tier,
          duration: extractDuration(video),
        };
      })
      .filter((video): video is TrendingVideo => video !== null)
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, limit);

    return processed;
  } catch (error) {
    console.error("Failed to get top performers:", error);
    return [];
  }
}
