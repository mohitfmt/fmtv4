// lib/dashboard/queries/performance-metrics-enhanced.ts
import { PrismaClient } from "@prisma/client";
import { subDays, subHours } from "date-fns";

export interface EnhancedPerformanceMetrics {
  // Core metrics
  averageEngagement: number;
  averageViews: number;
  averageLikes: number;
  viralVideos: number;
  engagementTrend: "up" | "down" | "stable";
  topCategories: { category: string; count: number; avgViews: number }[];
  watchTimeEstimate: number;
  performanceScore: number;

  // New motivational metrics
  weekOverWeekGrowth: number;
  viewsPerVideo: number;
  bestPerformingHour: string;
  momentumScore: number;
  risingStars: number;
  achievements: Achievement[];
  topPerformers: VideoHighlight[];
  publishingConsistency: number;
  averageVelocity: number;
}

export interface Achievement {
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress?: number;
}

export interface VideoHighlight {
  videoId: string;
  title: string;
  metric: string;
  value: number | string;
  badge?: string;
}

// Clean playlist name to category
function getCleanCategory(playlistTitle: string): string {
  if (!playlistTitle) return "Uncategorized";

  // Remove common prefixes and clean up
  const cleaned = playlistTitle
    .replace(/^FMT\s*[-–]\s*/i, "") // Remove "FMT -" or "FMT –"
    .replace(/^FMT\s+/i, "") // Remove "FMT "
    .replace(/\s*[-–]\s*FMT$/i, "") // Remove trailing "- FMT"
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();

  // Special mappings
  const mappings: Record<string, string> = {
    "Citra FMT": "Citra",
    "Sorotan berita": "Sorotan",
    "FMT News": "News",
    "FMT Lifestyle": "Lifestyle",
    "FMT Sports": "Sports",
    "FMT Entertainment": "Entertainment",
    "FMT Business": "Business",
  };

  return mappings[playlistTitle] || cleaned || "General";
}

// Get category from video's playlists
async function getCategoryFromVideo(
  video: any,
  prisma: PrismaClient
): Promise<string> {
  if (video.playlists && video.playlists.length > 0) {
    // Get the first playlist's title
    const playlist = await prisma.playlist.findFirst({
      where: {
        playlistId: { in: video.playlists },
        isActive: true,
      },
      select: { title: true },
      orderBy: { itemCount: "desc" }, // Prefer larger playlists
    });

    if (playlist?.title) {
      return getCleanCategory(playlist.title);
    }
  }

  // Fallback to YouTube category
  return getCategoryName(video.categoryId);
}

// Map YouTube category IDs to names
function getCategoryName(categoryId: string): string {
  const categories: Record<string, string> = {
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
  };

  return categories[categoryId] || "General";
}

// Extract stats from video
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

// Calculate engagement rate
function calculateEngagementRate(
  views: number,
  likes: number,
  comments: number
): number {
  if (views === 0) return 0;
  return Number((((likes + comments) / views) * 100).toFixed(2));
}

// Main enhanced performance metrics function
export async function getPerformanceMetrics(
  prisma: PrismaClient
): Promise<EnhancedPerformanceMetrics> {
  try {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const sevenDaysAgo = subDays(new Date(), 7);
    const fourteenDaysAgo = subDays(new Date(), 14);
    const twentyFourHoursAgo = subHours(new Date(), 24);

    // Fetch recent videos with extended data
    const recentVideos = await prisma.videos.findMany({
      where: {
        publishedAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        videoId: true,
        title: true,
        statistics: true,
        categoryId: true,
        contentDetails: true,
        publishedAt: true,
        playlists: true,
        tier: true,
        isShort: true,
      },
    });

    // Calculate core metrics
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let viralCount = 0;
    let totalWatchTime = 0;
    let risingStarsCount = 0;
    const categoryMap = new Map<string, { count: number; views: number }>();
    const hourlyDistribution = new Map<number, number>();
    const topPerformers: VideoHighlight[] = [];

    // Process each video
    for (const video of recentVideos) {
      const { views, likes, comments } = extractStats(video);

      totalViews += views;
      totalLikes += likes;
      totalComments += comments;

      // Check if viral
      const hoursSincePublish = Math.max(
        1,
        (Date.now() - new Date(video.publishedAt).getTime()) / (1000 * 60 * 60)
      );
      const velocity = views / hoursSincePublish;

      // More lenient viral threshold
      if (velocity >= 50 || video.tier === "hot" || video.tier === "trending") {
        viralCount++;
      }

      // Check for rising stars (rapid recent growth)
      if (hoursSincePublish < 72 && velocity >= 20) {
        risingStarsCount++;
      }

      // Track publishing hour
      const publishHour = new Date(video.publishedAt).getHours();
      hourlyDistribution.set(
        publishHour,
        (hourlyDistribution.get(publishHour) || 0) + views
      );

      // Estimate watch time
      if (video.contentDetails?.durationSeconds) {
        const estimatedViewDuration =
          Number(video.contentDetails.durationSeconds) * 0.5;
        totalWatchTime += (views * estimatedViewDuration) / 60;
      }

      // Get category from playlist
      const category = await getCategoryFromVideo(video, prisma);
      const catData = categoryMap.get(category) || { count: 0, views: 0 };
      catData.count++;
      catData.views += views;
      categoryMap.set(category, catData);

      // Track top performers
      const engagement = calculateEngagementRate(views, likes, comments);
      if (engagement > 5) {
        topPerformers.push({
          videoId: video.videoId,
          title: video.title.substring(0, 50),
          metric: "High Engagement",
          value: `${engagement.toFixed(1)}%`,
          badge: engagement > 10 ? "🏆" : "⭐",
        });
      }
    }

    const videoCount = recentVideos.length || 1;
    const averageEngagement = calculateEngagementRate(
      totalViews,
      totalLikes,
      totalComments
    );
    const averageViews = Math.round(totalViews / videoCount);
    const averageLikes = Math.round(totalLikes / videoCount);
    const averageVelocity = totalViews / (videoCount * 24 * 30); // Average views per hour

    // Calculate week-over-week growth
    const lastWeekVideos = recentVideos.filter(
      (v) => new Date(v.publishedAt) >= sevenDaysAgo
    );
    const previousWeekVideos = recentVideos.filter(
      (v) =>
        new Date(v.publishedAt) >= fourteenDaysAgo &&
        new Date(v.publishedAt) < sevenDaysAgo
    );

    const lastWeekViews = lastWeekVideos.reduce((sum, v) => {
      const { views } = extractStats(v);
      return sum + views;
    }, 0);

    const previousWeekViews = previousWeekVideos.reduce((sum, v) => {
      const { views } = extractStats(v);
      return sum + views;
    }, 0);

    const weekOverWeekGrowth =
      previousWeekViews > 0
        ? ((lastWeekViews - previousWeekViews) / previousWeekViews) * 100
        : 0;

    // Find best performing hour
    let bestHour = 0;
    let maxHourViews = 0;
    hourlyDistribution.forEach((views, hour) => {
      if (views > maxHourViews) {
        maxHourViews = views;
        bestHour = hour;
      }
    });
    const bestPerformingHour = `${bestHour}:00 - ${(bestHour + 1) % 24}:00`;

    // Calculate momentum score (0-100)
    let momentumScore = 50; // Base

    if (weekOverWeekGrowth > 20) momentumScore += 20;
    else if (weekOverWeekGrowth > 10) momentumScore += 15;
    else if (weekOverWeekGrowth > 0) momentumScore += 10;
    else if (weekOverWeekGrowth < -10) momentumScore -= 10;

    if (viralCount > 2) momentumScore += 15;
    else if (viralCount > 0) momentumScore += 10;

    if (risingStarsCount > 3) momentumScore += 15;
    else if (risingStarsCount > 1) momentumScore += 10;

    momentumScore = Math.min(100, Math.max(0, momentumScore));

    // Determine engagement trend
    const lastWeekEngagement =
      lastWeekVideos.length > 0
        ? calculateEngagementRate(
            lastWeekViews,
            lastWeekVideos.reduce((sum, v) => sum + extractStats(v).likes, 0),
            lastWeekVideos.reduce((sum, v) => sum + extractStats(v).comments, 0)
          )
        : 0;

    let engagementTrend: "up" | "down" | "stable" = "stable";
    if (lastWeekEngagement > averageEngagement * 1.1) engagementTrend = "up";
    else if (lastWeekEngagement < averageEngagement * 0.9)
      engagementTrend = "down";

    // Process top categories
    const topCategories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category: category,
        count: data.count,
        avgViews: Math.round(data.views / data.count),
      }))
      .sort((a, b) => b.avgViews - a.avgViews)
      .slice(0, 5);

    // Calculate performance score
    let performanceScore = 50;

    if (averageEngagement >= 10) performanceScore += 30;
    else if (averageEngagement >= 5) performanceScore += 20;
    else if (averageEngagement >= 2) performanceScore += 10;

    const viralRate = viralCount / videoCount;
    performanceScore += Math.min(20, viralRate * 100);

    if (engagementTrend === "up") performanceScore += 10;
    else if (engagementTrend === "stable") performanceScore += 5;

    performanceScore = Math.min(100, Math.round(performanceScore));

    // Calculate achievements
    const achievements: Achievement[] = [
      {
        icon: "🚀",
        title: "Viral Creator",
        description: "Create a viral video",
        unlocked: viralCount > 0,
        progress: Math.min(100, viralCount * 100),
      },
      {
        icon: "💎",
        title: "Engagement Master",
        description: "Reach 5% average engagement",
        unlocked: averageEngagement >= 5,
        progress: Math.min(100, (averageEngagement / 5) * 100),
      },
      {
        icon: "🔥",
        title: "Hot Streak",
        description: "3+ trending videos",
        unlocked: viralCount >= 3,
        progress: Math.min(100, (viralCount / 3) * 100),
      },
      {
        icon: "📈",
        title: "Growing Channel",
        description: "Positive week-over-week growth",
        unlocked: weekOverWeekGrowth > 0,
        progress: Math.min(100, Math.abs(weekOverWeekGrowth)),
      },
      {
        icon: "⚡",
        title: "Speed Demon",
        description: "High velocity content",
        unlocked: averageVelocity > 100,
        progress: Math.min(100, (averageVelocity / 100) * 100),
      },
      {
        icon: "🎯",
        title: "Consistent Creator",
        description: "Regular publishing schedule",
        unlocked: lastWeekVideos.length >= 3,
        progress: Math.min(100, (lastWeekVideos.length / 3) * 100),
      },
    ];

    // Calculate publishing consistency
    const publishingConsistency =
      lastWeekVideos.length >= 3
        ? 100
        : lastWeekVideos.length === 2
          ? 66
          : lastWeekVideos.length === 1
            ? 33
            : 0;

    return {
      averageEngagement,
      averageViews,
      averageLikes,
      viralVideos: viralCount,
      engagementTrend,
      topCategories,
      watchTimeEstimate: Math.round(totalWatchTime),
      performanceScore,
      weekOverWeekGrowth: Math.round(weekOverWeekGrowth),
      viewsPerVideo: averageViews,
      bestPerformingHour,
      momentumScore,
      risingStars: risingStarsCount,
      achievements,
      topPerformers: topPerformers.slice(0, 5),
      publishingConsistency,
      averageVelocity: Math.round(averageVelocity),
    };
  } catch (error) {
    console.error("Failed to get enhanced performance metrics:", error);
    // Return default values
    return {
      averageEngagement: 0,
      averageViews: 0,
      averageLikes: 0,
      viralVideos: 0,
      engagementTrend: "stable",
      topCategories: [],
      watchTimeEstimate: 0,
      performanceScore: 0,
      weekOverWeekGrowth: 0,
      viewsPerVideo: 0,
      bestPerformingHour: "Unknown",
      momentumScore: 0,
      risingStars: 0,
      achievements: [],
      topPerformers: [],
      publishingConsistency: 0,
      averageVelocity: 0,
    };
  }
}
