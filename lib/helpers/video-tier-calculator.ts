// lib/helpers/video-tier-calculator.ts

export function calculateVideoTier(
  viewCount: number,
  publishedAt: Date | string,
  isShort: boolean,
  engagementRate?: number
): string {
  const publishDate = new Date(publishedAt);
  const hoursSincePublish = Math.max(
    1,
    (Date.now() - publishDate.getTime()) / (1000 * 60 * 60)
  );

  const velocity = viewCount / hoursSincePublish;

  // More lenient tier calculation to encourage team
  if (isShort) {
    if (velocity >= 50 || viewCount > 10000) return "viral-short";
    if (velocity >= 20 || viewCount > 5000) return "popular-short";
    if (hoursSincePublish < 48 || viewCount > 1000) return "trending";
    return "standard";
  }

  // Regular videos
  if (velocity >= 100 || (hoursSincePublish < 24 && viewCount > 1000)) {
    return "hot";
  }
  if (velocity >= 50 || (hoursSincePublish < 72 && viewCount > 500)) {
    return "trending";
  }
  if (hoursSincePublish < 168 && viewCount > 100) {
    return "recent";
  }
  if (viewCount > 50000) {
    return "evergreen";
  }

  // Engagement-based tier boost
  if (engagementRate && engagementRate > 5) {
    return hoursSincePublish < 168 ? "trending" : "evergreen";
  }

  return hoursSincePublish > 720 ? "archive" : "standard"; // 30 days
}

export function getEngagementRate(
  views: number,
  likes: number,
  comments: number
): number {
  if (views === 0) return 0;
  return ((likes + comments) / views) * 100;
}
