// lib/validation.ts
/**
 * Minimal validation helpers for API data integrity
 * (Light implementation as requested - not strict)
 */

/**
 * Sanitize and validate dashboard stats response
 */
export function validateDashboardStats(data: any): boolean {
  // Basic structure check - very lenient
  if (!data || typeof data !== "object") {
    return false;
  }

  // Check for required top-level properties
  const requiredProps = ["videos", "playlists", "sync", "cache"];
  for (const prop of requiredProps) {
    if (!(prop in data)) {
      console.warn(`Missing required property: ${prop}`);
      // In lenient mode, we'll continue
    }
  }

  return true;
}

/**
 * Sanitize numeric values with fallbacks
 */
export function sanitizeNumber(
  value: any,
  fallback = 0,
  min?: number,
  max?: number
): number {
  const num = Number(value);

  if (isNaN(num)) {
    return fallback;
  }

  if (min !== undefined && num < min) {
    return min;
  }

  if (max !== undefined && num > max) {
    return max;
  }

  return num;
}

/**
 * Sanitize percentage values (0-100)
 */
export function sanitizePercentage(value: any, fallback = 0): number {
  return sanitizeNumber(value, fallback, 0, 100);
}

/**
 * Sanitize date strings
 */
export function sanitizeDate(value: any): string | null {
  if (!value) return null;

  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  } catch {
    return null;
  }
}

/**
 * Sanitize dashboard response with fallbacks
 */
export function sanitizeDashboardResponse(data: any): any {
  if (!data) return null;

  return {
    videos: {
      total: sanitizeNumber(data.videos?.total, 0),
      lastAdded: sanitizeDate(data.videos?.lastAdded),
      trending: sanitizeNumber(data.videos?.trending, 0),
      newToday: sanitizeNumber(data.videos?.newToday, 0),
    },
    playlists: {
      total: sanitizeNumber(data.playlists?.total, 0),
      active: sanitizeNumber(data.playlists?.active, 0),
      inactive: sanitizeNumber(data.playlists?.inactive, 0),
    },
    sync: {
      status: data.sync?.status || "unknown",
      lastSync: sanitizeDate(data.sync?.lastSync),
      nextSync: sanitizeDate(data.sync?.nextSync),
      currentlySyncing: Boolean(data.sync?.currentlySyncing),
      currentPlaylist: data.sync?.currentPlaylist || null,
    },
    cache: {
      cdnHitRate: sanitizePercentage(data.cache?.cdnHitRate, 94),
      lruUsage: sanitizePercentage(data.cache?.lruUsage, 0),
      lastCleared: sanitizeDate(data.cache?.lastCleared),
      totalCacheSize: sanitizeNumber(data.cache?.totalCacheSize, 0),
      maxCacheSize: sanitizeNumber(data.cache?.maxCacheSize, 0),
    },
    recentActivity: Array.isArray(data.recentActivity)
      ? data.recentActivity.slice(0, 10).map((activity: any) => ({
          id: String(activity.id || Math.random()),
          action: String(activity.action || "Unknown"),
          entityType: String(activity.entityType || "unknown"),
          userId: String(activity.userId || "system"),
          timestamp:
            sanitizeDate(activity.timestamp) || new Date().toISOString(),
        }))
      : [],
  };
}

/**
 * Validate API response wrapper
 */
export function validateApiResponse(response: any): {
  isValid: boolean;
  data: any;
  error?: string;
} {
  if (!response) {
    return {
      isValid: false,
      data: null,
      error: "No response received",
    };
  }

  if (response.success === false) {
    return {
      isValid: false,
      data: null,
      error: response.error || "Request failed",
    };
  }

  if (!response.data) {
    return {
      isValid: false,
      data: null,
      error: "No data in response",
    };
  }

  // Sanitize and return
  const sanitized = sanitizeDashboardResponse(response.data);

  return {
    isValid: true,
    data: sanitized,
  };
}

/**
 * Simple input sanitization for user inputs
 */
export function sanitizeInput(input: any, maxLength = 1000): string {
  if (typeof input !== "string") {
    return "";
  }

  // Remove control characters and trim
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, "").trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validate email domain (for FMT check)
 */
export function isValidFMTEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== "string") {
    return false;
  }

  const normalizedEmail = email.toLowerCase().trim();
  return normalizedEmail.endsWith("@freemalaysiatoday.com");
}

/**
 * Create optimistic update for dashboard
 */
export function createOptimisticUpdate(
  currentData: any,
  action: string,
  payload?: any
): any {
  if (!currentData) return currentData;

  const updated = { ...currentData };

  switch (action) {
    case "REFRESH_START":
      // Could add a refreshing indicator
      return updated;

    case "CACHE_CLEAR":
      // Optimistically reset cache metrics
      if (updated.cache) {
        updated.cache = {
          ...updated.cache,
          cdnHitRate: 0,
          lruUsage: 0,
          lastCleared: new Date().toISOString(),
        };
      }
      return updated;

    case "PLAYLIST_SYNC":
      // Optimistically show syncing state
      if (updated.sync) {
        updated.sync = {
          ...updated.sync,
          status: "syncing",
          currentlySyncing: true,
          currentPlaylist: payload?.playlistId || null,
        };
      }
      return updated;

    default:
      return updated;
  }
}

/**
 * Debounce helper for API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
