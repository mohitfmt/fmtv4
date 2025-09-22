// lib/dashboard/constants.ts

// Cache Configuration
export const CACHE_CONFIG = {
  DASHBOARD_TTL: 30 * 1000, // 30 seconds
  SESSION_CACHE_TTL: 10 * 60 * 1000, // 10 minutes
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 30, // 30 requests per minute
  CACHE_MAX_SIZE: 100, // Maximum cache entries
  CACHE_CLEANUP_INTERVAL: 60 * 1000, // 1 minute
} as const;

// Auto Refresh Configuration
export const REFRESH_CONFIG = {
  ACTIVE_INTERVAL: 2 * 60 * 1000, // 2 minutes when active
  INACTIVE_INTERVAL: 5 * 60 * 1000, // 5 minutes when inactive
  INACTIVITY_TIMEOUT: 5 * 60 * 1000, // 5 minutes to mark as inactive
  MANUAL_REFRESH_COOLDOWN: 5 * 1000, // 5 seconds between manual refreshes
  RETRY_MAX_ATTEMPTS: 3,
  RETRY_BASE_DELAY: 2000, // 2 seconds base delay for exponential backoff
} as const;

// Database Query Configuration
export const QUERY_CONFIG = {
  TIMEOUT_MS: 8000, // 8 seconds database timeout
  TRENDING_DAYS_BACK: 14, // Look back 7 days for trending
  TRENDING_MIN_VIEWS: {
    VIDEO: 1000, // Minimum views for trending video
    SHORT: 5000, // Minimum views for trending short
  },
  TRENDING_LIMIT: 10, // Top 5 trending videos
  RECENT_ACTIVITY_LIMIT: 10, // Last 10 activities
  PERFORMANCE_TOP_LIMIT: 10, // Top 10 performers
} as const;

// Chart Configuration
export const CHART_CONFIG = {
  UPLOAD_HISTORY_DAYS: 7, // Show last 7 days
  ENGAGEMENT_DAYS: 14, // Show 2 weeks of engagement
  HEATMAP_WEEKS: 4, // Show 4 weeks in heatmap
  ANIMATION_DURATION: 300, // 300ms chart animations
  TOOLTIP_DELAY: 100, // 100ms tooltip delay
} as const;

// Google Trends Configuration
export const TRENDS_CONFIG = {
  GEO: "MY", // Malaysia
  LANGUAGE: "en",
  CATEGORY: 0, // All categories
  SUGGESTIONS_LIMIT: 5, // Top 5 suggestions
  UPDATE_INTERVAL: 6 * 60 * 60 * 1000, // Update every 6 hours
} as const;

// Performance Thresholds
export const PERFORMANCE_THRESHOLDS = {
  ENGAGEMENT_RATE: {
    EXCELLENT: 0.1, // 10%+ engagement
    GOOD: 0.05, // 5%+ engagement
    AVERAGE: 0.02, // 2%+ engagement
  },
  VIRAL_VELOCITY: {
    HOT: 100, // 1000+ views/hour
    TRENDING: 50, // 500+ views/hour
    RISING: 10, // 100+ views/hour
  },
  CACHE_HIT_RATE: {
    EXCELLENT: 90, // 90%+ hit rate
    GOOD: 70, // 70%+ hit rate
    POOR: 50, // Below 50% needs attention
  },
} as const;

// UI Configuration
export const UI_CONFIG = {
  STAT_CARD_VARIANTS: {
    primary: "bg-primary/10 text-primary",
    success: "bg-green-500/10 text-green-500",
    warning: "bg-yellow-500/10 text-yellow-500",
    danger: "bg-red-500/10 text-red-500",
  },
  ANIMATION_VARIANTS: {
    fadeIn: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    slideUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
    },
    scaleIn: {
      initial: { scale: 0.9, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      exit: { scale: 0.9, opacity: 0 },
    },
  },
} as const;

// Export type helpers
export type CacheConfig = typeof CACHE_CONFIG;
export type RefreshConfig = typeof REFRESH_CONFIG;
export type QueryConfig = typeof QUERY_CONFIG;
export type ChartConfig = typeof CHART_CONFIG;
export type TrendsConfig = typeof TRENDS_CONFIG;
export type PerformanceThresholds = typeof PERFORMANCE_THRESHOLDS;
export type UIConfig = typeof UI_CONFIG;
