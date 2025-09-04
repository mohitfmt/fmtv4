// types/video-admin.ts

// Playlist Types
export interface Playlist {
  id: string;
  playlistId: string;
  title: string;
  description?: string;
  itemCount: number;
  thumbnailUrl?: string;
  isActive: boolean;
  lastSynced?: string;
  updatedAt?: string;
  createdAt?: string;
  channelTitle?: string;
  syncInProgress?: boolean;
  lastSyncResult?: {
    videosAdded?: number;
    videosUpdated?: number;
    videosRemoved?: number;
    error?: string;
  };
}

export interface PlaylistsResponse {
  success: boolean;
  data: Playlist[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  traceId?: string;
  timestamp?: string;
}

export interface SyncResponse {
  success: boolean;
  message: string;
  playlistId?: string;
  playlistName?: string;
  estimatedTime?: number;
  queuePosition?: number;
  inProgress?: boolean;
  traceId?: string;
  timestamp?: string;
}

// Dashboard Types
export interface DashboardStats {
  videos: {
    total: number;
    lastAdded: string | null;
    trending: number;
    newToday: number;
  };
  playlists: {
    total: number;
    active: number;
    inactive: number;
  };
  sync: {
    status: "active" | "inactive" | "syncing";
    lastSync: string | null;
    nextSync: string | null;
    currentlySyncing: boolean;
    currentPlaylist: string | null;
    webhookActive: boolean;
    webhookExpiry: number | null;
  };
  cache: {
    cdnHitRate: number;
    lruUsage: number;
    lastCleared: string | null;
    totalCacheSize: number;
    maxCacheSize: number;
    cacheCount: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    userId: string;
    timestamp: string;
    details: string | null;
  }>;
}

export interface DashboardResponse {
  success: boolean;
  data?: DashboardStats;
  error?: string;
  message?: string;
  traceId: string;
  timestamp: string;
}

// Sync Types
export interface SyncStatus {
  id: string;
  currentlySyncing: boolean;
  currentPlaylistId: string | null;
  lastSync: string | null;
  lastError: string | null;
  totalSyncs: number;
}

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

// Cache Types
export interface CacheStatus {
  cdn: {
    provider: string;
    status: "healthy" | "degraded" | "error";
    cachedItems: number;
    size: string;
    hitRate: number;
    lastCleared?: string;
  };
  lruCache: {
    status: "active" | "inactive";
    caches: Array<{
      name: string;
      size: number;
      maxSize: number;
      hitRate: number;
      ttl: number;
    }>;
    totalMemory: string;
    lastCleared?: string;
  };
  database: {
    videos: number;
    playlists: number;
    totalSize: string;
    lastOptimized?: string;
  };
}

export interface CacheResponse {
  success: boolean;
  data?: CacheStatus;
  error?: string;
  message?: string;
  traceId?: string;
  timestamp?: string;
}

// Configuration Types
export interface VideoConfig {
  homepage: {
    playlistId: string;
    fallbackPlaylistId?: string;
  };
  videoPage: {
    heroPlaylistId: string;
    shortsPlaylistId: string;
    displayedPlaylists: Array<{
      playlistId: string;
      position: number;
      enabled: boolean;
    }>;
  };
}

export interface ConfigResponse {
  success: boolean;
  data?: VideoConfig;
  error?: string;
  message?: string;
  traceId?: string;
  timestamp?: string;
}

// Common API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  traceId?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

// Admin Activity Types
export interface AdminActivity {
  id: string;
  userId: string;
  action: string;
  entityType?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

// Error Response
export interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
  details?: any;
  traceId?: string;
  timestamp?: string;
}
