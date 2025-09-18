// types/video-admin-dashboard.ts

// Import types from query modules
import type { TrendingVideo } from "@/lib/dashboard/queries/trending";
import type {
  WeeklyStats,
  UploadHistoryItem,
} from "@/lib/dashboard/queries/weekly-stats";
import type { PerformanceMetrics } from "@/lib/dashboard/queries/performance-metrics";
import type { ContentInsights } from "@/lib/dashboard/queries/content-insights";
import type { ContentSuggestions } from "@/lib/dashboard/google-trends";

// Re-export for convenience
export type {
  TrendingVideo,
  WeeklyStats,
  UploadHistoryItem,
  PerformanceMetrics,
  ContentInsights,
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
  insights: ContentInsights;
  suggestions: ContentSuggestions;
  recentActivity: ActivityItem[];
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

// Chart Data Types
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface EngagementData {
  date: string;
  views: number;
  likes: number;
  comments: number;
  engagement: number;
}

// Component Props Types
export interface StatCardProps {
  icon: any; // IconType from react-icons
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  trendValue?: string | number;
  color?: "primary" | "success" | "warning" | "danger";
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

export interface ChartProps {
  data: any[];
  loading?: boolean;
  className?: string;
}

// Prisma Model Types (for reference)
export interface PrismaVideo {
  id: string;
  videoId: string;
  channelId: string;
  title: string;
  description: string;
  publishedAt: Date;
  thumbnails: any; // JSON field
  statistics: {
    viewCount: number;
    likeCount: number;
    commentCount: number;
  };
  contentDetails: {
    duration: string;
    durationSeconds: number;
    dimension: string;
    definition: string;
    caption: boolean;
    licensedContent: boolean;
    projection: string;
  };
  status: {
    uploadStatus: string;
    privacyStatus: string;
    license: string;
    embeddable: boolean;
    publicStatsViewable: boolean;
    madeForKids: boolean;
  };
  categoryId: string;
  tags: string[];
  defaultLanguage: string;
  isShort: boolean;
  videoType: string;
  tier: string;
  playlists: string[];
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrismaPlaylist {
  id: string;
  playlistId: string;
  title: string;
  description?: string;
  itemCount: number;
  thumbnailUrl?: string;
  channelTitle?: string;
  isActive: boolean;
  lastSynced?: Date;
  syncInProgress?: boolean;
  syncLeaseUntil?: Date;
  syncLeaseOwner?: string;
  lastSyncResult?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrismaActivityLog {
  id: string;
  action: string;
  entityType?: string;
  userId: string;
  timestamp: Date;
  metadata?: any; // JSON field
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface PrismaSyncStatus {
  id: string;
  currentlySyncing: boolean;
  currentPlaylistId?: string;
  lastSync?: Date;
  lastError?: string;
  totalSyncs: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrismaWebsubSubscription {
  id: string;
  channelId: string;
  webhookUrl: string;
  status: "active" | "pending" | "expired" | "failed";
  lastRenewal?: Date;
  expiresAt?: Date;
  renewalCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Utility Types
export type TrendType = "rising" | "breakout" | "stable";
export type PerformanceRating = "excellent" | "good" | "average" | "poor";
export type CacheType = "cdn" | "lru" | "all";

// Configuration Types
export interface DashboardConfig {
  refreshInterval: number;
  enableAutoRefresh: boolean;
  maxRetries: number;
  cacheTimeout: number;
}

// Hook Return Types
export interface UseDashboardReturn {
  data: DashboardStats | null;
  loading: boolean;
  error: Error | null;
  refreshing: boolean;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  isOffline: boolean;
}

// Export all types as a namespace for convenience
export namespace Dashboard {
  export type Stats = DashboardStats;
  export type Response = DashboardResponse;
  export type Video = TrendingVideo;
  export type Activity = ActivityItem;
  export type Cache = CacheStats;
  export type Sync = SyncStats;
  export type Performance = PerformanceMetrics;
  export type Insights = ContentInsights;
  export type Suggestions = ContentSuggestions;
}
