// constants/revalidation-config.ts

/**
 * Centralized revalidation configuration for ISR
 * All times are in seconds
 *
 * Strategy:
 * - WebSub handles real-time updates (primary mechanism)
 * - ISR revalidation acts as a safety net for missed updates
 * - Older content gets longer revalidation times
 */

export const REVALIDATION_TIMES = {
  // Article pages - based on age
  ARTICLE_FRESH: 900, // 15 minutes - articles < 24 hours old
  ARTICLE_RECENT: 1800, // 30 minutes - articles 1-7 days old
  ARTICLE_OLD: 3600, // 1 hour - articles > 7 days old
  ARTICLE_ARCHIVED: 86400, // 24 hours - articles > 30 days old

  // Category pages - based on traffic priority
  HOMEPAGE: 300, // 5 minutes - highest traffic
  MAIN_CATEGORY: 600, // 10 minutes - main sections
  SUBCATEGORY: 900, // 15 minutes - subsections
  TAG_PAGE: 1800, // 30 minutes - tag archives
  AUTHOR_PAGE: 1800, // 30 minutes - author archives

  // Static pages
  STATIC_PAGE: 86400, // 24 hours - about, contact, etc.
  SEARCH_PAGE: 60, // 1 minute - search results

  // Error handling
  ERROR_PAGE: 60, // 1 minute - quick retry for errors
  NOT_FOUND: 10, // 10 seconds - very quick recheck for 404s
  DELETED_CHECK: 30, // 30 seconds - deleted content verification

  // Special pages
  PREVIEW: 0, // No cache for preview pages
  SITEMAP: 3600, // 1 hour - sitemap updates
  FEED: 600, // 10 minutes - RSS/Atom feeds

  // API routes
  API_TRENDING: 300, // 5 minutes - trending content
  API_POPULAR: 600, // 10 minutes - popular posts
  API_RELATED: 1800, // 30 minutes - related articles
} as const;

/**
 * High-priority categories that need more frequent updates
 */
export const HIGH_PRIORITY_CATEGORIES = [
  "nation",
  "bahasa",
  "business",
  "world",
  "news",
  "berita",
  "highlight",
  "super-highlight",
  "breaking-news",
];

/**
 * Calculate dynamic revalidation time based on content type and age
 */
export function getDynamicRevalidationTime(
  contentType: "article" | "category" | "subcategory" | "static",
  lastModified?: string | Date,
  category?: string
): number {
  // Static pages
  if (contentType === "static") {
    return REVALIDATION_TIMES.STATIC_PAGE;
  }

  // Categories
  if (contentType === "category") {
    const isHighPriority =
      category && HIGH_PRIORITY_CATEGORIES.includes(category);
    return isHighPriority
      ? REVALIDATION_TIMES.MAIN_CATEGORY
      : REVALIDATION_TIMES.SUBCATEGORY;
  }

  // Subcategories
  if (contentType === "subcategory") {
    const isHighPriority =
      category && HIGH_PRIORITY_CATEGORIES.includes(category);
    return isHighPriority
      ? REVALIDATION_TIMES.SUBCATEGORY
      : REVALIDATION_TIMES.SUBCATEGORY * 1.5;
  }

  // Articles - based on age
  if (contentType === "article" && lastModified) {
    const modifiedDate =
      typeof lastModified === "string" ? new Date(lastModified) : lastModified;
    const ageInMs = Date.now() - modifiedDate.getTime();
    const ageInHours = ageInMs / (1000 * 60 * 60);
    const ageInDays = ageInHours / 24;

    if (ageInDays > 30) return REVALIDATION_TIMES.ARTICLE_ARCHIVED;
    if (ageInDays > 7) return REVALIDATION_TIMES.ARTICLE_OLD;
    if (ageInDays > 1) return REVALIDATION_TIMES.ARTICLE_RECENT;
    return REVALIDATION_TIMES.ARTICLE_FRESH;
  }

  // Default fallback
  return REVALIDATION_TIMES.MAIN_CATEGORY;
}

/**
 * Get revalidation time for specific page types
 */
export function getPageRevalidationTime(
  pageType: string,
  metadata?: {
    lastModified?: string;
    category?: string;
    isError?: boolean;
    isDeleted?: boolean;
  }
): number {
  // Error states
  if (metadata?.isError) return REVALIDATION_TIMES.ERROR_PAGE;
  if (metadata?.isDeleted) return REVALIDATION_TIMES.DELETED_CHECK;

  // Map page types to revalidation times
  const pageTypeMap: Record<string, number> = {
    home: REVALIDATION_TIMES.HOMEPAGE,
    news: REVALIDATION_TIMES.MAIN_CATEGORY,
    berita: REVALIDATION_TIMES.MAIN_CATEGORY,
    business: REVALIDATION_TIMES.MAIN_CATEGORY,
    lifestyle: REVALIDATION_TIMES.MAIN_CATEGORY,
    opinion: REVALIDATION_TIMES.MAIN_CATEGORY,
    sports: REVALIDATION_TIMES.MAIN_CATEGORY,
    world: REVALIDATION_TIMES.MAIN_CATEGORY,
    search: REVALIDATION_TIMES.SEARCH_PAGE,
    sitemap: REVALIDATION_TIMES.SITEMAP,
    feed: REVALIDATION_TIMES.FEED,
    tag: REVALIDATION_TIMES.TAG_PAGE,
    author: REVALIDATION_TIMES.AUTHOR_PAGE,
    about: REVALIDATION_TIMES.STATIC_PAGE,
    contact: REVALIDATION_TIMES.STATIC_PAGE,
    privacy: REVALIDATION_TIMES.STATIC_PAGE,
    terms: REVALIDATION_TIMES.STATIC_PAGE,
  };

  return pageTypeMap[pageType] || REVALIDATION_TIMES.MAIN_CATEGORY;
}

/**
 * Check if content should be statically generated or use ISR
 */
export function shouldUseISR(
  pageType: string,
  visitFrequency?: number // visits per day
): boolean {
  // Always use ISR for these page types
  const alwaysISR = [
    "home",
    "news",
    "berita",
    "business",
    "lifestyle",
    "opinion",
    "sports",
    "world",
  ];
  if (alwaysISR.includes(pageType)) return true;

  // Use ISR if page gets more than 100 visits per day
  if (visitFrequency && visitFrequency > 100) return true;

  // Use static generation for rarely visited pages
  return false;
}

/**
 * Get cache control headers for different page types
 */
export function getCacheControlHeaders(
  pageType: string,
  revalidationTime: number
): string {
  // For high-traffic pages, use stale-while-revalidate
  const highTrafficPages = ["home", "news", "berita", "business"];

  if (highTrafficPages.includes(pageType)) {
    return `public, s-maxage=${revalidationTime}, stale-while-revalidate=${revalidationTime * 2}`;
  }

  // For other pages, use standard caching
  return `public, s-maxage=${revalidationTime}, max-age=${Math.floor(revalidationTime / 2)}`;
}

/**
 * Monitoring helper - log unusually high revalidation counts
 */
export function logRevalidationMetrics(
  path: string,
  revalidationCount: number,
  timeWindow: number = 3600 // 1 hour window
): void {
  const expectedRevalidations = Math.ceil(
    timeWindow / REVALIDATION_TIMES.MAIN_CATEGORY
  );

  // Alert if revalidations are 3x higher than expected
  if (revalidationCount > expectedRevalidations * 3) {
    console.warn(
      `High revalidation count for ${path}: ${revalidationCount} in ${timeWindow}s (expected: ~${expectedRevalidations})`
    );

    // In production, send to monitoring service
    if (process.env.NODE_ENV === "production") {
      // sendToMonitoring({ path, revalidationCount, timeWindow, expected: expectedRevalidations });
    }
  }
}

// Export type for TypeScript
export type RevalidationTime =
  (typeof REVALIDATION_TIMES)[keyof typeof REVALIDATION_TIMES];
