// lib/dashboard/queries/weekly-stats.ts
import { PrismaClient } from "@prisma/client";
import {
  startOfWeek,
  endOfWeek,
  subWeeks,
  subDays,
  format,
  startOfDay,
  endOfDay,
} from "date-fns";

export interface UploadHistoryItem {
  date: string; // yyyy-MM-dd format
  day: string; // Day name (Mon, Tue, etc.)
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  fullDate: string; // Formatted date (Jan 15)
  videos: number; // Videos uploaded this day
  lastWeek: number; // Videos uploaded same day last week
  isToday: boolean; // Highlight today
}

export interface WeeklyStats {
  thisWeek: number;
  lastWeek: number;
  weekChange: number; // Percentage change
  uploadHistory: UploadHistoryItem[];
  thisWeekDates: {
    start: string;
    end: string;
  };
  lastWeekDates: {
    start: string;
    end: string;
  };
  dailyAverage: number;
  peakDay: string | null;
}

/**
 * Get weekly video statistics with proper Monday-Sunday boundaries
 */
export async function getWeeklyVideoStats(
  prisma: PrismaClient
): Promise<WeeklyStats> {
  const now = new Date();

  // Week boundaries (Monday start)
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

  // Fetch videos from last 2 weeks
  const twoWeeksAgo = startOfWeek(subWeeks(now, 2), { weekStartsOn: 1 });

  const videos = await prisma.videos.findMany({
    where: {
      publishedAt: {
        gte: twoWeeksAgo,
      },
    },
    select: {
      publishedAt: true,
      videoId: true,
    },
    orderBy: {
      publishedAt: "desc",
    },
  });

  // Process daily counts
  const dailyCounts = new Map<string, number>();
  let thisWeekTotal = 0;
  let lastWeekTotal = 0;

  videos.forEach((video) => {
    if (!video.publishedAt) return;

    const videoDate = new Date(video.publishedAt);
    const dateKey = format(videoDate, "yyyy-MM-dd");

    // Increment daily count
    dailyCounts.set(dateKey, (dailyCounts.get(dateKey) || 0) + 1);

    // Count weekly totals
    if (videoDate >= thisWeekStart && videoDate <= thisWeekEnd) {
      thisWeekTotal++;
    } else if (videoDate >= lastWeekStart && videoDate <= lastWeekEnd) {
      lastWeekTotal++;
    }
  });

  // Build upload history for chart (last 7 days)
  const uploadHistory: UploadHistoryItem[] = [];
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let maxDayCount = 0;
  let peakDayName: string | null = null;

  for (let i = 6; i >= 0; i--) {
    const currentDate = subDays(now, i);
    const lastWeekDate = subDays(currentDate, 7);

    const currentKey = format(currentDate, "yyyy-MM-dd");
    const lastWeekKey = format(lastWeekDate, "yyyy-MM-dd");

    const dayOfWeek = currentDate.getDay();
    const dayName = daysOfWeek[dayOfWeek];
    const dayCount = dailyCounts.get(currentKey) || 0;

    // Track peak day
    if (dayCount > maxDayCount) {
      maxDayCount = dayCount;
      peakDayName = dayName;
    }

    uploadHistory.push({
      date: currentKey,
      day: dayName,
      dayOfWeek,
      fullDate: format(currentDate, "MMM d"),
      videos: dayCount,
      lastWeek: dailyCounts.get(lastWeekKey) || 0,
      isToday: format(currentDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd"),
    });
  }

  // Calculate metrics
  const weekChange =
    lastWeekTotal > 0
      ? Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)
      : thisWeekTotal > 0
        ? 100
        : 0;

  const dailyAverage =
    thisWeekTotal > 0 ? Number((thisWeekTotal / 7).toFixed(1)) : 0;

  return {
    thisWeek: thisWeekTotal,
    lastWeek: lastWeekTotal,
    weekChange,
    uploadHistory,
    thisWeekDates: {
      start: format(thisWeekStart, "MMM d"),
      end: format(thisWeekEnd, "MMM d"),
    },
    lastWeekDates: {
      start: format(lastWeekStart, "MMM d"),
      end: format(lastWeekEnd, "MMM d"),
    },
    dailyAverage,
    peakDay: peakDayName,
  };
}

/**
 * Get videos added today
 */
export async function getVideosAddedToday(
  prisma: PrismaClient
): Promise<number> {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  return await prisma.videos.count({
    where: {
      publishedAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });
}

/**
 * Get upload frequency analysis
 */
export async function getUploadFrequency(prisma: PrismaClient): Promise<{
  byDayOfWeek: { day: string; count: number; percentage: number }[];
  byHour: { hour: number; count: number }[];
  bestDay: string;
  bestHour: number;
}> {
  const thirtyDaysAgo = subDays(new Date(), 30);

  const videos = await prisma.videos.findMany({
    where: {
      publishedAt: {
        gte: thirtyDaysAgo,
      },
    },
    select: {
      publishedAt: true,
    },
  });

  // Count by day of week
  const dayCountMap = new Map<number, number>();
  const hourCountMap = new Map<number, number>();

  videos.forEach((video) => {
    if (!video.publishedAt) return;

    const date = new Date(video.publishedAt);
    const dayOfWeek = date.getDay();
    const hour = date.getHours();

    dayCountMap.set(dayOfWeek, (dayCountMap.get(dayOfWeek) || 0) + 1);
    hourCountMap.set(hour, (hourCountMap.get(hour) || 0) + 1);
  });

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const total = videos.length;

  // Process day of week data
  const byDayOfWeek = Array.from({ length: 7 }, (_, i) => {
    const count = dayCountMap.get(i) || 0;
    return {
      day: daysOfWeek[i],
      count,
      percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
    };
  });

  // Process hour data
  const byHour = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: hourCountMap.get(i) || 0,
  }));

  // Find best day and hour
  const bestDayIndex =
    Array.from(dayCountMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 0;

  const bestHour =
    Array.from(hourCountMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 0;

  return {
    byDayOfWeek,
    byHour,
    bestDay: daysOfWeek[bestDayIndex],
    bestHour,
  };
}
