// lib/dashboard/queries/content-insights.ts
import { PrismaClient } from "@prisma/client";
import { subDays } from "date-fns";

export interface TagInsight {
  tag: string;
  count: number;
  avgViews: number;
  trending: boolean;
}

export interface CategoryDistribution {
  category: string;
  categoryId: string;
  videoCount: number;
  percentage: number;
  totalViews: number;
  avgEngagement: number;
}

export interface UploadPattern {
  hour: number;
  dayOfWeek: number;
  count: number;
  avgViews: number;
  heatValue: number; // 0-100 for heatmap
}

export interface ContentInsights {
  topTags: TagInsight[];
  categoryDistribution: CategoryDistribution[];
  uploadHeatmap: UploadPattern[];
  contentTypes: {
    shorts: number;
    regular: number;
    shortsPercentage: number;
  };
  optimalUploadTime: {
    day: string;
    hour: number;
    reason: string;
  };
}

/**
 * Extract statistics safely from JSON
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
 * Get content insights and patterns
 */
export async function getContentInsights(
  prisma: PrismaClient
): Promise<ContentInsights> {
  try {
    const thirtyDaysAgo = subDays(new Date(), 30);

    // Fetch videos with all necessary fields
    const videos = await prisma.videos.findMany({
      where: {
        publishedAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        videoId: true,
        tags: true,
        categoryId: true,
        statistics: true,
        publishedAt: true,
        isShort: true,
      },
    });

    // Process tags
    const tagMap = new Map<string, { count: number; totalViews: number }>();
    const categoryMap = new Map<
      string,
      {
        count: number;
        totalViews: number;
        totalEngagement: number;
      }
    >();
    const heatmapData = new Map<
      string,
      { count: number; totalViews: number }
    >();

    let shortsCount = 0;
    let regularCount = 0;

    videos.forEach((video) => {
      const { views, likes, comments } = extractStats(video);
      const engagement = views > 0 ? ((likes + comments) / views) * 100 : 0;

      // Count content types
      if (video.isShort) {
        shortsCount++;
      } else {
        regularCount++;
      }

      // Process tags
      if (Array.isArray(video.tags)) {
        video.tags.forEach((tag) => {
          const tagData = tagMap.get(tag) || { count: 0, totalViews: 0 };
          tagData.count++;
          tagData.totalViews += views;
          tagMap.set(tag, tagData);
        });
      }

      // Process categories
      const categoryId = video.categoryId || "uncategorized";
      const catData = categoryMap.get(categoryId) || {
        count: 0,
        totalViews: 0,
        totalEngagement: 0,
      };
      catData.count++;
      catData.totalViews += views;
      catData.totalEngagement += engagement;
      categoryMap.set(categoryId, catData);

      // Process upload patterns
      if (video.publishedAt) {
        const date = new Date(video.publishedAt);
        const hour = date.getHours();
        const dayOfWeek = date.getDay();
        const heatKey = `${dayOfWeek}-${hour}`;

        const heatData = heatmapData.get(heatKey) || {
          count: 0,
          totalViews: 0,
        };
        heatData.count++;
        heatData.totalViews += views;
        heatmapData.set(heatKey, heatData);
      }
    });

    // Process top tags
    const topTags = Array.from(tagMap.entries())
      .map(([tag, data]) => {
        const avgViews = Math.round(data.totalViews / data.count);
        const trending = data.count >= 3 && avgViews > 10000; // Simple trending logic

        return {
          tag,
          count: data.count,
          avgViews,
          trending,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20 tags

    // Process category distribution
    const totalVideos = videos.length || 1;
    const categoryDistribution = Array.from(categoryMap.entries())
      .map(([categoryId, data]) => ({
        category: getCategoryName(categoryId),
        categoryId,
        videoCount: data.count,
        percentage: Number(((data.count / totalVideos) * 100).toFixed(1)),
        totalViews: data.totalViews,
        avgEngagement: Number((data.totalEngagement / data.count).toFixed(2)),
      }))
      .sort((a, b) => b.videoCount - a.videoCount);

    // Process upload heatmap
    const maxHeatValue = Math.max(
      ...Array.from(heatmapData.values()).map((d) => d.count)
    );
    const uploadHeatmap: UploadPattern[] = [];

    // Generate all hour/day combinations
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      for (let hour = 0; hour < 24; hour++) {
        const key = `${dayOfWeek}-${hour}`;
        const data = heatmapData.get(key) || { count: 0, totalViews: 0 };

        uploadHeatmap.push({
          hour,
          dayOfWeek,
          count: data.count,
          avgViews:
            data.count > 0 ? Math.round(data.totalViews / data.count) : 0,
          heatValue:
            maxHeatValue > 0
              ? Math.round((data.count / maxHeatValue) * 100)
              : 0,
        });
      }
    }

    // Find optimal upload time
    const optimalSlot = uploadHeatmap
      .filter((slot) => slot.count > 0)
      .sort((a, b) => b.avgViews - a.avgViews)[0];

    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const optimalUploadTime = optimalSlot
      ? {
          day: daysOfWeek[optimalSlot.dayOfWeek],
          hour: optimalSlot.hour,
          reason: `Average ${optimalSlot.avgViews.toLocaleString()} views for videos posted at this time`,
        }
      : {
          day: "Monday",
          hour: 9,
          reason: "Not enough data to determine optimal time",
        };

    // Content types
    const contentTypes = {
      shorts: shortsCount,
      regular: regularCount,
      shortsPercentage:
        totalVideos > 0
          ? Number(((shortsCount / totalVideos) * 100).toFixed(1))
          : 0,
    };

    return {
      topTags,
      categoryDistribution,
      uploadHeatmap,
      contentTypes,
      optimalUploadTime,
    };
  } catch (error) {
    console.error("Failed to get content insights:", error);
    return {
      topTags: [],
      categoryDistribution: [],
      uploadHeatmap: [],
      contentTypes: {
        shorts: 0,
        regular: 0,
        shortsPercentage: 0,
      },
      optimalUploadTime: {
        day: "Monday",
        hour: 9,
        reason: "Unable to determine",
      },
    };
  }
}

/**
 * Get tag cloud data
 */
export async function getTagCloud(
  prisma: PrismaClient,
  limit = 30
): Promise<{ text: string; value: number; trending: boolean }[]> {
  const insights = await getContentInsights(prisma);

  return insights.topTags.slice(0, limit).map((tag) => ({
    text: tag.tag,
    value: tag.count,
    trending: tag.trending,
  }));
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
