// lib/dashboard/queries/performance-metrics.ts
import { PrismaClient } from "@prisma/client";
import { subDays } from "date-fns";
import { PERFORMANCE_THRESHOLDS } from "../constants";

export interface PerformanceMetrics {
  averageEngagement: number;
  averageViews: number;
  averageLikes: number;
  viralVideos: number; // Count of videos with high velocity
  engagementTrend: "up" | "down" | "stable";
  topCategories: { category: string; count: number; avgViews: number }[];
  watchTimeEstimate: number; // Total estimated minutes watched
  performanceScore: number; // 0-100 overall score
}

export interface VideoPerformance {
  videoId: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  engagement: number;
  performanceRating: "excellent" | "good" | "average" | "poor";
}

/**
 * Extract statistics from video JSON fields
 */
function extractStats(video: any): {
  views: number;
  likes: number;
  comments: number;
} {
  let views = 0;
  let likes = 0;
  let comments = 0;

  if (typeof video.statistics === "object" && video.statistics) {
    views = Number(video.statistics.viewCount || 0);
    likes = Number(video.statistics.likeCount || 0);
    comments = Number(video.statistics.commentCount || 0);
  }

  return { views, likes, comments };
}

/**
 * Calculate engagement rate
 */
function calculateEngagementRate(
  views: number,
  likes: number,
  comments: number
): number {
  if (views === 0) return 0;
  return Number((((likes + comments) / views) * 100).toFixed(2));
}

/**
 * Rate performance based on engagement
 */
function ratePerformance(
  engagement: number
): "excellent" | "good" | "average" | "poor" {
  if (engagement >= PERFORMANCE_THRESHOLDS.ENGAGEMENT_RATE.EXCELLENT * 100)
    return "excellent";
  if (engagement >= PERFORMANCE_THRESHOLDS.ENGAGEMENT_RATE.GOOD * 100)
    return "good";
  if (engagement >= PERFORMANCE_THRESHOLDS.ENGAGEMENT_RATE.AVERAGE * 100)
    return "average";
  return "poor";
}

/**
 * Get overall performance metrics
 */
export async function getPerformanceMetrics(
  prisma: PrismaClient
): Promise<PerformanceMetrics> {
  try {
    // Get videos from last 30 days for metrics
    const thirtyDaysAgo = subDays(new Date(), 30);
    const sevenDaysAgo = subDays(new Date(), 7);

    // Fetch recent videos
    const recentVideos = await prisma.videos.findMany({
      where: {
        publishedAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        videoId: true,
        statistics: true,
        categoryId: true,
        contentDetails: true,
        publishedAt: true,
      },
    });

    // Calculate aggregate metrics
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let viralCount = 0;
    let totalWatchTime = 0;
    const categoryMap = new Map<string, { count: number; views: number }>();

    recentVideos.forEach((video) => {
      const { views, likes, comments } = extractStats(video);

      totalViews += views;
      totalLikes += likes;
      totalComments += comments;

      // Check if viral (high velocity)
      const hoursSincePublish = Math.max(
        1,
        (Date.now() - new Date(video.publishedAt).getTime()) / (1000 * 60 * 60)
      );
      const velocity = views / hoursSincePublish;

      if (velocity >= PERFORMANCE_THRESHOLDS.VIRAL_VELOCITY.TRENDING) {
        viralCount++;
      }

      // Estimate watch time (assume 50% average view duration)
      if (
        typeof video.contentDetails === "object" &&
        video.contentDetails?.durationSeconds
      ) {
        const estimatedViewDuration =
          Number(video.contentDetails.durationSeconds) * 0.5;
        totalWatchTime += (views * estimatedViewDuration) / 60; // Convert to minutes
      }

      // Track by category
      const category = video.categoryId || "uncategorized";
      const catData = categoryMap.get(category) || { count: 0, views: 0 };
      catData.count++;
      catData.views += views;
      categoryMap.set(category, catData);
    });

    const videoCount = recentVideos.length || 1;
    const averageEngagement = calculateEngagementRate(
      totalViews,
      totalLikes,
      totalComments
    );
    const averageViews = Math.round(totalViews / videoCount);
    const averageLikes = Math.round(totalLikes / videoCount);

    // Get videos from last 7 days for trend comparison
    const lastWeekVideos = recentVideos.filter(
      (v) => new Date(v.publishedAt) >= sevenDaysAgo
    );

    const lastWeekStats = lastWeekVideos.reduce(
      (acc, video) => {
        const { views, likes, comments } = extractStats(video);
        return {
          views: acc.views + views,
          likes: acc.likes + likes,
          comments: acc.comments + comments,
        };
      },
      { views: 0, likes: 0, comments: 0 }
    );

    const lastWeekEngagement = calculateEngagementRate(
      lastWeekStats.views,
      lastWeekStats.likes,
      lastWeekStats.comments
    );

    // Determine trend
    let engagementTrend: "up" | "down" | "stable" = "stable";
    if (lastWeekEngagement > averageEngagement * 1.1) engagementTrend = "up";
    else if (lastWeekEngagement < averageEngagement * 0.9)
      engagementTrend = "down";

    // Process top categories
    const topCategories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category: getCategoryName(category),
        count: data.count,
        avgViews: Math.round(data.views / data.count),
      }))
      .sort((a, b) => b.avgViews - a.avgViews)
      .slice(0, 5);

    // Calculate performance score (0-100)
    let performanceScore = 50; // Base score

    // Engagement factor (up to 30 points)
    if (
      averageEngagement >=
      PERFORMANCE_THRESHOLDS.ENGAGEMENT_RATE.EXCELLENT * 100
    )
      performanceScore += 30;
    else if (
      averageEngagement >=
      PERFORMANCE_THRESHOLDS.ENGAGEMENT_RATE.GOOD * 100
    )
      performanceScore += 20;
    else if (
      averageEngagement >=
      PERFORMANCE_THRESHOLDS.ENGAGEMENT_RATE.AVERAGE * 100
    )
      performanceScore += 10;

    // Viral factor (up to 20 points)
    const viralRate = viralCount / videoCount;
    performanceScore += Math.min(20, viralRate * 100);

    // Trend factor (up to 10 points)
    if (engagementTrend === "up") performanceScore += 10;
    else if (engagementTrend === "stable") performanceScore += 5;

    // Cap at 100
    performanceScore = Math.min(100, Math.round(performanceScore));

    return {
      averageEngagement,
      averageViews,
      averageLikes,
      viralVideos: viralCount,
      engagementTrend,
      topCategories,
      watchTimeEstimate: Math.round(totalWatchTime),
      performanceScore,
    };
  } catch (error) {
    console.error("Failed to get performance metrics:", error);
    return {
      averageEngagement: 0,
      averageViews: 0,
      averageLikes: 0,
      viralVideos: 0,
      engagementTrend: "stable",
      topCategories: [],
      watchTimeEstimate: 0,
      performanceScore: 0,
    };
  }
}

/**
 * Get individual video performance
 */
export async function getVideoPerformance(
  prisma: PrismaClient,
  limit = 10
): Promise<VideoPerformance[]> {
  try {
    const videos = await prisma.videos.findMany({
      orderBy: {
        publishedAt: "desc",
      },
      take: limit,
      select: {
        videoId: true,
        title: true,
        statistics: true,
      },
    });

    return videos.map((video) => {
      const { views, likes, comments } = extractStats(video);
      const engagement = calculateEngagementRate(views, likes, comments);

      return {
        videoId: video.videoId,
        title: video.title,
        views,
        likes,
        comments,
        engagement,
        performanceRating: ratePerformance(engagement),
      };
    });
  } catch (error) {
    console.error("Failed to get video performance:", error);
    return [];
  }
}

/**
 * Map category IDs to readable names
 */
function getCategoryName(categoryId: string): string {
  const categories: { [key: string]: string } = {
    "1": "Film & Animation",
    "2": "Autos & Vehicles",
    "10": "Music",
    "15": "Pets & Animals",
    "17": "Sports",
    "19": "Travel & Events",
    "20": "Gaming",
    "22": "People & Blogs",
    "23": "Comedy",
    "24": "Entertainment",
    "25": "News & Politics",
    "26": "Howto & Style",
    "27": "Education",
    "28": "Science & Technology",
    uncategorized: "Uncategorized",
  };

  return categories[categoryId] || `Category ${categoryId}`;
}
