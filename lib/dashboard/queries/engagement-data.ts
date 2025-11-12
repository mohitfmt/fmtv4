// lib/dashboard/queries/engagement-data.ts
// SIMPLE TIMEZONE SOLUTION - Uses manual UTC+8 offset
import { PrismaClient } from "@prisma/client";
import { subDays, format } from "date-fns";

export interface EngagementData {
  date: string;
  views: number;
  likes: number;
  comments: number;
  engagement: number;
}

// Malaysia Time is UTC+8
const MALAYSIA_OFFSET_MS = 8 * 60 * 60 * 1000;

// Convert UTC to Malaysia Time
function toMalaysiaTime(date: Date): Date {
  return new Date(date.getTime() + MALAYSIA_OFFSET_MS);
}

export async function getEngagementData(
  prisma: PrismaClient,
  days: number = 7
): Promise<EngagementData[]> {
  try {
    // Get current time in Malaysia timezone
    const now = toMalaysiaTime(new Date());
    const startDate = subDays(now, days - 1);

    // Fetch videos grouped by day for the last 'days' days
    const videos = await prisma.videos.findMany({
      where: {
        publishedAt: {
          gte: startDate,
        },
        isActive: true,
      },
      select: {
        publishedAt: true,
        statistics: true,
      },
      orderBy: {
        publishedAt: "asc",
      },
    });

    // Initialize daily stats in Malaysia Time
    const dailyStats = new Map<
      string,
      { views: number; likes: number; comments: number }
    >();

    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(now, i), "MMM dd");
      dailyStats.set(date, { views: 0, likes: 0, comments: 0 });
    }

    // Aggregate stats by date (in Malaysia Time)
    videos.forEach((video) => {
      // Convert video date from UTC to Malaysia Time
      const videoDate = toMalaysiaTime(new Date(video.publishedAt));
      const date = format(videoDate, "MMM dd");

      const existing = dailyStats.get(date) || {
        views: 0,
        likes: 0,
        comments: 0,
      };

      if (typeof video.statistics === "object" && video.statistics) {
        const stats = video.statistics as any;
        existing.views += Number(stats.viewCount || 0);
        existing.likes += Number(stats.likeCount || 0);
        existing.comments += Number(stats.commentCount || 0);
      }

      dailyStats.set(date, existing);
    });

    // Convert to array format
    const data: EngagementData[] = [];
    dailyStats.forEach((stats, date) => {
      const engagement =
        stats.views > 0
          ? ((stats.likes + stats.comments) / stats.views) * 100
          : 0;

      data.push({
        date,
        views: stats.views,
        likes: stats.likes,
        comments: stats.comments,
        engagement: Number(engagement.toFixed(2)),
      });
    });

    return data;
  } catch (error) {
    console.error("Failed to get engagement data:", error);
    return [];
  }
}
