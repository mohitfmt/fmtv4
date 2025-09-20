// types/video-admin-dashboard.ts

// Import types from query modules
import type { TrendingVideo } from "@/lib/dashboard/queries/trending";
import type {
  WeeklyStats,
  UploadHistoryItem,
} from "@/lib/dashboard/queries/weekly-stats";
import type { PerformanceMetrics } from "@/lib/dashboard/queries/performance-metrics";
// ContentInsights import removed
import type { ContentSuggestions } from "@/lib/dashboard/google-trends";
import type { EngagementData } from "@/lib/dashboard/queries/engagement-data";

// Re-export for convenience
export type {
  TrendingVideo,
  WeeklyStats,
  UploadHistoryItem,
  PerformanceMetrics,
  // ContentInsights removed
  ContentSuggestions,
};

// Activity Item
export interface ActivityItem {
  id: string;
  action: string; // Formatted action name
  entityType: string;
  userId: string;
  timestamp: string; // ISO date string
  details: string | null; // Additional context
  relativeTime: string; // "5m ago", "2h ago", etc.
}

// Video Statistics
export interface VideoStats {
  total: number;
  newToday: number;
  thisWeek: number;
  lastWeek: number;
  weekChange: number; // Percentage change
  dailyAverage: number;
  peakDay: string | null;
  lastAdded: string | null; // ISO date string
  lastAddedTitle: string | null;
  lastAddedId: string | null;
  trending: number; // Count of trending videos
  trendingList: TrendingVideo[];
  uploadHistory: UploadHistoryItem[];
  weekDates: {
    thisWeek: { start: string; end: string };
    lastWeek: { start: string; end: string };
  };
}

// Playlist Statistics
export interface PlaylistStats {
  total: number;
  active: number;
  inactive: number;
  utilizationRate: number; // Percentage of active playlists
}

// Sync Status
export interface SyncStats {
  status: "active" | "inactive" | "syncing";
  lastSync: string | null; // ISO date string
  nextSync: string | null; // ISO date string
  currentlySyncing: boolean;
  currentPlaylist: string | null;
  webhookActive: boolean;
  webhookExpiry: number | null; // Unix timestamp
  totalSyncs: number;
}

// Cache Metrics
export interface CacheStats {
  cdnHitRate: number; // Percentage
  lruUsage: number; // Percentage
  lastCleared: string | null; // ISO date string
  totalCacheSize: number; // In items
  maxCacheSize: number; // In items
  cacheCount: number; // Number of cache instances
  formattedSize: string; // Human-readable size
  formattedMaxSize: string; // Human-readable max size
}

// Main Dashboard Stats
export interface DashboardStats {
  videos: VideoStats;
  playlists: PlaylistStats;
  sync: SyncStats;
  cache: CacheStats;
  performance: PerformanceMetrics;
  // insights: ContentInsights; // REMOVED
  suggestions: ContentSuggestions;
  recentActivity: ActivityItem[];
  engagementData: EngagementData[];
}

// API Response
export interface DashboardResponse {
  success: boolean;
  data?: DashboardStats;
  error?: string;
  message?: string;
  traceId: string;
  timestamp: string;
  cached?: boolean;
}

// Additional helper types
export interface SyncHistory {
  id: string;
  playlistId: string;
  playlistName: string;
  status: "success" | "failed" | "partial";
  videosAdded: number;
  videosUpdated: number;
  videosRemoved: number;
  duration: number;
  error?: string;
  timestamp: string;
}

export interface WebSubStatus {
  isActive: boolean;
  lastRenewal: string | null;
  expiresAt: string | null;
  renewalCount: number;
  webhookUrl: string;
  status: "active" | "pending" | "expired" | "failed";
}

export interface CacheStatus {
  cdn: {
    provider: string;
    status: "healthy" | "degraded" | "error";
    cachedItems: number;
    size: string;
    hitRate: number;
    lastCleared?: string;
  };
  lru: {
    status: "healthy" | "degraded" | "error";
    utilization: number;
    size: string;
    maxSize: string;
    evictions: number;
  };
  database: {
    status: "healthy" | "degraded" | "error";
    cachedQueries: number;
    hitRate: number;
    avgResponseTime: number;
  };
}

export interface SystemHealth {
  overall: "healthy" | "degraded" | "critical";
  services: {
    youtube: boolean;
    database: boolean;
    cache: boolean;
    webhooks: boolean;
  };
  lastCheck: string;
  nextCheck: string;
  issues: string[];
}
