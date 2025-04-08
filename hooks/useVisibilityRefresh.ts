import { useRouter } from "next/router";
import { useEffect, useState, useCallback, useRef } from "react";
import { mutate } from "swr";

/**
 * Enhanced hook that safely refreshes page data when a tab becomes visible
 * Uses multiple strategies to ensure reliable refreshes without causing application errors
 *
 * @param {boolean} enabled - Whether the hook should be enabled
 * @param {number} debounceMs - Debounce time in milliseconds to prevent multiple refreshes
 * @param {number} maxSessionAgeMs - Maximum age of session before disabling auto-refresh (default: 2 hours)
 * @returns {object} - Object containing refresh state and methods
 */
export const useVisibilityRefresh = (
  enabled = true,
  debounceMs = 1000,
  maxSessionAgeMs = 2 * 60 * 60 * 1000 // 2 hours default
) => {
  const router = useRouter();
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEnabled, setIsEnabled] = useState(enabled);
  const sessionStartTime = useRef(new Date());
  const refreshAttempts = useRef(0);
  const isRefreshingRef = useRef(false);

  // Track content version for comparison
  const contentVersionRef = useRef<string | null>(null);

  // Store the refresh methods in order of preference
  // We'll try each method in sequence if previous ones fail
  const refreshMethods = useRef({
    // Method 1: Use SWR's mutate to refresh data
    mutateData: async () => {
      if (typeof mutate !== "function") return false;

      try {
        // Refresh all cached data
        await mutate(
          () => true, // Match all keys
          undefined, // Don't update the cache data manually
          { revalidate: true } // Force revalidation
        );
        return true;
      } catch (error) {
        console.warn("[Refresh] SWR mutate failed:", error);
        return false;
      }
    },

    // Method 2: Use Next.js router events to refresh without URL param
    routerRefresh: async () => {
      try {
        // Force data refresh without URL param by using the existing URL
        await router.replace(router.asPath, undefined, {
          scroll: false,
          shallow: false, // Force data fetch
        });
        return true;
      } catch (error) {
        console.warn("[Refresh] Router replace failed:", error);
        return false;
      }
    },

    // Method 3: Controlled page reload (last resort)
    safeReload: () => {
      try {
        if (typeof window === "undefined") return false;

        // Store scroll position
        const scrollPos = window.scrollY;

        // Perform a clean reload without URL parameters
        const url =
          window.location.pathname +
          window.location.search.replace(/_refresh=\d+(&)?/, "");
        window.location.href = url;

        // Set a flag in sessionStorage to restore scroll after reload
        sessionStorage.setItem("fmt_scroll_pos", scrollPos.toString());

        return true;
      } catch (error) {
        console.error("[Refresh] Safe reload failed:", error);
        return false;
      }
    },
  });

  /**
   * Check if the session is too old for automatic refreshes
   * to prevent state corruption in long-running sessions
   */
  const isSessionTooOld = useCallback(() => {
    const now = new Date();
    const sessionAge = now.getTime() - sessionStartTime.current.getTime();
    return sessionAge > maxSessionAgeMs;
  }, [maxSessionAgeMs]);

  /**
   * Initialize content version tracking
   */
  useEffect(() => {
    if (typeof document !== "undefined") {
      // Get initial content version from meta tag
      contentVersionRef.current =
        document
          .querySelector('meta[name="content-version"]')
          ?.getAttribute("content") || null;

      // Check for scroll position restoration after page reload
      const savedScrollPos = sessionStorage.getItem("fmt_scroll_pos");
      if (savedScrollPos) {
        window.scrollTo(0, parseInt(savedScrollPos, 10));
        sessionStorage.removeItem("fmt_scroll_pos");
      }
    }
  }, []);

  /**
   * Safely refresh the current page data using multiple strategies
   * This function tries different refresh methods in sequence
   * until one succeeds, with fallbacks for error cases
   */
  const refreshData = useCallback(async () => {
    // Prevent concurrent refreshes
    if (isRefreshingRef.current) return;

    // Check session age
    if (isSessionTooOld()) {
      // console.log("[Refresh] Session too old, disabling automatic refreshes");
      setIsEnabled(false);
      return;
    }

    // Debounce check
    const now = new Date();
    if (lastRefreshed && now.getTime() - lastRefreshed.getTime() < debounceMs) {
      return;
    }

    // Safety check for too many consecutive refresh attempts
    // (could indicate an infinite refresh loop)
    if (refreshAttempts.current > 5) {
      console.warn(
        "[Refresh] Too many consecutive refresh attempts, cooling down"
      );
      refreshAttempts.current = 0;
      setTimeout(() => {
        refreshAttempts.current = 0;
      }, 30000); // 30 second cooldown
      return;
    }

    try {
      // Set state and ref to indicate refresh in progress
      setIsRefreshing(true);
      isRefreshingRef.current = true;
      setLastRefreshed(now);
      refreshAttempts.current++;

      // Try refresh methods in sequence until one succeeds
      const methods = refreshMethods.current;

      // Try SWR mutate first
      if (await methods.mutateData()) {
        // console.log("[Refresh] Successfully refreshed via SWR mutate");
      }
      // If that fails, try router refresh
      else if (await methods.routerRefresh()) {
        // console.log("[Refresh] Successfully refreshed via router");
      }
      // If all else fails, try a safe reload
      else if (methods.safeReload()) {
        // console.log("[Refresh] Performing safe page reload");
        return; // Return early as page will reload
      }
      // If all methods fail, log the error
      else {
        console.error("[Refresh] All refresh methods failed");
      }
    } catch (error) {
      console.error("[Refresh] Unhandled error during refresh:", error);
    } finally {
      // Reset state after a delay to prevent UI flickers
      setTimeout(() => {
        setIsRefreshing(false);
        isRefreshingRef.current = false;

        // Reset attempts counter on successful refresh
        if (refreshAttempts.current > 0) {
          refreshAttempts.current--;
        }
      }, 500);
    }
  }, [router, lastRefreshed, debounceMs, isSessionTooOld]);

  /**
   * Set up visibility change listener to refresh when tab becomes visible
   */
  useEffect(() => {
    if (!isEnabled || typeof document === "undefined") return;

    let debounceTimer: NodeJS.Timeout;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Clear any pending refresh
        clearTimeout(debounceTimer);

        // Check session age before scheduling a refresh
        if (isSessionTooOld()) {
          setIsEnabled(false);
          return;
        }

        // Set a short delay before refreshing
        debounceTimer = setTimeout(() => {
          refreshData();
        }, 300);
      }
    };

    // Add visibility change listener
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Clean up
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearTimeout(debounceTimer);
    };
  }, [isEnabled, refreshData, isSessionTooOld]);

  /**
   * Set up periodic content version check
   */
  useEffect(() => {
    if (!isEnabled || typeof window === "undefined") return;

    // Function to check for content updates via headers
    const checkForContentUpdates = async () => {
      try {
        // Skip check if we're already refreshing
        if (isRefreshingRef.current) return;

        // Skip check if session is too old
        if (isSessionTooOld()) {
          setIsEnabled(false);
          return;
        }

        // Get current path (handle both with and without trailing slash)
        const path = window.location.pathname.endsWith("/")
          ? window.location.pathname
          : `${window.location.pathname}/`;

        // Fetch just the headers to check for content version
        const response = await fetch(path, {
          method: "HEAD",
          cache: "no-cache",
          headers: {
            "x-fmt-fresh": "1", // Signal that we want fresh content
          },
        });

        // Get the server's content version
        const serverVersion = response.headers.get("x-fmt-version");

        // Compare versions
        if (
          serverVersion &&
          contentVersionRef.current &&
          serverVersion !== contentVersionRef.current
        ) {
          // console.log(
          //   `[Refresh] Content version changed from ${contentVersionRef.current} to ${serverVersion}`
          // );
          contentVersionRef.current = serverVersion;
          refreshData();
        } else if (serverVersion && !contentVersionRef.current) {
          // Initialize version if we didn't have one
          contentVersionRef.current = serverVersion;
        }
      } catch (e) {
        console.warn("[Refresh] Error checking for content updates:", e);
      }
    };

    // Set up periodic checks with progressive intervals
    // Start with frequent checks, then gradually increase interval
    const checkIntervals = [30000, 60000, 120000]; // 30s, 1m, 2m
    let currentIntervalIndex = 0;
    let checkTimer: NodeJS.Timeout;

    const scheduleNextCheck = () => {
      const interval =
        checkIntervals[
          Math.min(currentIntervalIndex, checkIntervals.length - 1)
        ];

      checkTimer = setTimeout(() => {
        checkForContentUpdates();

        // Increase interval for next check (up to the maximum)
        if (currentIntervalIndex < checkIntervals.length - 1) {
          currentIntervalIndex++;
        }

        scheduleNextCheck();
      }, interval);
    };

    // Start the check cycle
    scheduleNextCheck();

    // Disable automatic refreshes after the max session age
    const disableTimer = setTimeout(() => {
      // console.log(
      //   "[Refresh] Maximum session age reached, disabling automatic refreshes"
      // );
      setIsEnabled(false);
    }, maxSessionAgeMs);

    // Clean up
    return () => {
      clearTimeout(checkTimer);
      clearTimeout(disableTimer);
    };
  }, [isEnabled, refreshData, isSessionTooOld, maxSessionAgeMs]);

  /**
   * Force-enable or disable the refresh functionality
   */
  const setRefreshEnabled = useCallback((newEnabled: boolean) => {
    setIsEnabled(newEnabled);

    // Reset session start time when manually enabled
    if (newEnabled) {
      sessionStartTime.current = new Date();
      refreshAttempts.current = 0;
    }
  }, []);

  return {
    lastRefreshed,
    isRefreshing,
    isEnabled,
    refreshData, // Manual refresh function
    setEnabled: setRefreshEnabled, // Control enabled state
    forceReload: refreshMethods.current.safeReload, // Force a safe reload
  };
};

export default useVisibilityRefresh;
