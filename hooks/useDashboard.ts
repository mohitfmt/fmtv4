// lib/hooks/useDashboard.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { videoApiJson } from "@/lib/videoApi";

interface DashboardStats {
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
  };
  cache: {
    cdnHitRate: number;
    lruUsage: number;
    lastCleared: string | null;
    totalCacheSize: number;
    maxCacheSize: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    userId: string;
    timestamp: string;
  }>;
}

interface DashboardResponse {
  data: DashboardStats;
  traceId: string;
  timestamp: string;
  cached?: boolean;
}

interface UseDashboardOptions {
  refreshInterval?: number;
  enableAutoRefresh?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: (data: DashboardStats) => void;
}

export function useDashboard(options: UseDashboardOptions = {}) {
  const {
    refreshInterval = 2 * 60 * 1000, // 2 minutes default
    enableAutoRefresh = true,
    onError,
    onSuccess,
  } = options;

  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDashboard = useCallback(
    async (isManualRefresh = false) => {
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        if (isManualRefresh || !data) {
          setLoading(true);
        } else {
          setIsRefreshing(true);
        }
        setError(null);

        const response = await videoApiJson<DashboardResponse>(
          "/api/video-admin/dashboard/stats",
          {
            signal: abortControllerRef.current.signal,
          }
        );

        if (response?.data) {
          setData(response.data);
          setLastUpdated(new Date());
          setRetryCount(0);

          // Cache in sessionStorage
          sessionStorage.setItem(
            "dashboard-cache",
            JSON.stringify({
              data: response.data,
              timestamp: Date.now(),
            })
          );

          onSuccess?.(response.data);
        }
      } catch (err: any) {
        // Ignore abort errors
        if (err.name === "AbortError") {
          return;
        }

        const error = new Error(
          err.message || "Failed to fetch dashboard data"
        );
        setError(error);
        onError?.(error);

        // Implement exponential backoff retry
        if (retryCount < 3 && !isManualRefresh) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
          retryTimeoutRef.current = setTimeout(() => {
            setRetryCount((prev) => prev + 1);
            fetchDashboard();
          }, delay);
        }
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [data, retryCount, onError, onSuccess]
  );

  // Load cached data on mount
  useEffect(() => {
    const cached = sessionStorage.getItem("dashboard-cache");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Use cached data if less than 10 minutes old
        if (Date.now() - parsed.timestamp < 10 * 60 * 1000) {
          setData(parsed.data);
          setLastUpdated(new Date(parsed.timestamp));
          setLoading(false);
        }
      } catch (e) {
        console.error("Failed to parse cached dashboard data:", e);
      }
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchDashboard();

    return () => {
      // Cleanup on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!enableAutoRefresh || !refreshInterval) {
      return;
    }

    const interval = setInterval(() => {
      fetchDashboard();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [enableAutoRefresh, refreshInterval, fetchDashboard]);

  const refresh = useCallback(() => {
    return fetchDashboard(true);
  }, [fetchDashboard]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    isRefreshing,
    retryCount,
    refresh,
  };
}

// Hook for activity detection
export function useActivityDetection(timeout = 5 * 60 * 1000) {
  const [isActive, setIsActive] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsActive(true);
    timeoutRef.current = setTimeout(() => {
      setIsActive(false);
    }, timeout);
  }, [timeout]);

  useEffect(() => {
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
      "keydown",
    ];

    const handleActivity = () => resetTimeout();

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, true);
    });

    resetTimeout();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetTimeout]);

  return isActive;
}

// Hook for online/offline detection
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

// Hook for dynamic refresh interval
export function useDynamicRefresh(
  fetchFunction: () => void,
  {
    activeInterval = 2 * 60 * 1000, // 2 minutes
    inactiveInterval = 5 * 60 * 1000, // 5 minutes
    boostDuration = 30 * 1000, // 30 seconds boost after manual action
    boostInterval = 30 * 1000, // 30 seconds during boost
  } = {}
) {
  const isActive = useActivityDetection();
  const [isBoosted, setIsBoosted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  const boostTimeoutRef = useRef<NodeJS.Timeout>();

  // Calculate current interval
  const getCurrentInterval = useCallback(() => {
    if (isBoosted) return boostInterval;
    return isActive ? activeInterval : inactiveInterval;
  }, [isActive, isBoosted, activeInterval, inactiveInterval, boostInterval]);

  // Trigger boost (after manual actions)
  const triggerBoost = useCallback(() => {
    setIsBoosted(true);

    if (boostTimeoutRef.current) {
      clearTimeout(boostTimeoutRef.current);
    }

    boostTimeoutRef.current = setTimeout(() => {
      setIsBoosted(false);
    }, boostDuration);
  }, [boostDuration]);

  // Setup interval
  useEffect(() => {
    const setupInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      const interval = getCurrentInterval();
      intervalRef.current = setInterval(fetchFunction, interval);
    };

    setupInterval();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (boostTimeoutRef.current) {
        clearTimeout(boostTimeoutRef.current);
      }
    };
  }, [fetchFunction, getCurrentInterval]);

  return {
    isActive,
    isBoosted,
    currentInterval: getCurrentInterval(),
    triggerBoost,
  };
}

// Hook for session persistence
export function useSessionPersistence<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;

    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading sessionStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setPersistentValue = useCallback(
    (newValue: T) => {
      setValue(newValue);
      try {
        sessionStorage.setItem(key, JSON.stringify(newValue));
      } catch (error) {
        console.error(`Error setting sessionStorage key "${key}":`, error);
      }
    },
    [key]
  );

  return [value, setPersistentValue];
}
