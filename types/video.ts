// types/video.ts or add to your existing types file

export interface VideoThumbnails {
  default?: {
    url: string;
    width?: number;
    height?: number;
  };
  medium?: {
    url: string;
    width?: number;
    height?: number;
  };
  high?: {
    url: string;
    width?: number;
    height?: number;
  };
  standard?: {
    url: string;
    width?: number;
    height?: number;
  };
  maxres?: {
    url: string;
    width?: number;
    height?: number;
  };
}

export interface VideoStatistics {
  viewCount: string;
  likeCount: string;
  commentCount: string;
  favoriteCount?: string;
}

export interface Video {
  videoId: string;
  channelId?: string;
  title: string;
  description: string;
  publishedAt: string | Date;
  tags?: string[];
  categoryId?: string;
  thumbnails: VideoThumbnails | any; // Use 'any' if stored as JSON in Prisma
  duration: string; // ISO 8601 format (PT4M13S)
  durationSeconds: number;
  statistics: VideoStatistics;
  isShort: boolean;
  tier:
    | "hot"
    | "trending"
    | "recent"
    | "evergreen"
    | "archive"
    | "viral-short"
    | "popular-short";
  playlists?: string[];

  // Optional fields from Prisma
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  privacyStatus?: string;
  embeddable?: boolean;
  caption?: string;
  lastSyncedAt?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface VideoHubData {
  hero: Video[];
  shorts: Video[];
  playlists: {
    [key: string]: {
      name: string;
      videos: Video[];
    };
  };
  stats: {
    totalVideos: number;
    todayViews: number;
    newToday: number;
  };
}

export interface PlaylistInfo {
  id: string;
  target: string;
  name: string;
  playlistId: string;
}

export interface WebSubSubscription {
  id?: string;
  channelId: string;
  webhookUrl: string;
  status: "active" | "pending" | "expired" | "failed";
  lastRenewal?: Date | string;
  expiresAt?: Date | string;
  renewalCount: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface WebSubStats {
  id?: string;
  lastWebhookReceived?: Date | string;
  webhooksReceived: number;
  videosProcessed: number;
  lastError?: string;
  updatedAt?: Date | string;
}

// API Response Types
export interface VideoGalleryResponse {
  hero: Video[];
  shorts: Video[];
  playlists: Record<
    string,
    {
      name: string;
      videos: Video[];
    }
  >;
  stats: {
    totalVideos: number;
    todayViews: number;
    newToday: number;
  };
}

export interface WebSubStatusResponse {
  subscription: {
    isActive: boolean;
    lastRenewal: string;
    expiresAt: string;
    renewalCount: number;
    webhookUrl: string;
  };
  health: {
    status: "healthy" | "warning" | "expired";
    expiresInHours: number;
    expiresInDays: number;
    needsRenewal: boolean;
  };
  stats: {
    lastWebhookReceived: string;
    totalWebhooksReceived: number;
    videosProcessed: number;
  };
  recentVideos: Array<{
    title: string;
    lastSyncedAt: Date | string;
    videoId: string;
  }>;
  timestamp: string;
}
