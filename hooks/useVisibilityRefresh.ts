import { useRouter } from "next/router";
import { useEffect, useState, useCallback } from "react";

/**
 * Enhanced hook that forcefully refreshes page data when a tab becomes visible
 * Uses a cache-busting strategy to ensure fresh content is fetched
 *
 * @param {boolean} enabled - Whether the hook should be enabled
 * @param {number} debounceMs - Debounce time in milliseconds to prevent multiple refreshes
 * @returns {object} - Object containing refresh state information
 */
export const useVisibilityRefresh = (enabled = true, debounceMs = 1000) => {
  const router = useRouter();
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Forcefully refresh the current page data
   * Uses a cache-busting technique to guarantee fresh data
   */
  const refreshData = useCallback(() => {
    // Debounce check
    const now = new Date();
    if (lastRefreshed && now.getTime() - lastRefreshed.getTime() < debounceMs) {
      return;
    }

    // Update state
    setIsRefreshing(true);
    setLastRefreshed(now);

    // Get current path
    const currentPath = router.asPath;

    // Create a cache-busting version by adding a timestamp parameter
    const hasQuery = currentPath.includes("?");
    const timestampParam = `_refresh=${Date.now()}`;
    const newPath = hasQuery
      ? `${currentPath}&${timestampParam}`
      : `${currentPath}?${timestampParam}`;

    // First navigate to the timestamped path to force data refetch
    router
      .replace(newPath, undefined, {
        scroll: false,
        shallow: false, // Crucial: don't use shallow routing to force data refetch
      })
      .then(() => {
        // Then navigate back to the clean path to maintain URL cleanliness
        return router.replace(currentPath, undefined, {
          scroll: false,
          shallow: true, // We can use shallow here since we just want to clean the URL
        });
      })
      .catch((error) => {
        console.error("[useVisibilityRefresh] Error refreshing page:", error);
      })
      .finally(() => {
        // Set a delay before clearing the refreshing state to prevent UI flickers
        setTimeout(() => {
          setIsRefreshing(false);
        }, 500);
      });
  }, [router, lastRefreshed, debounceMs]);

  // Set up the visibility change listener
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    let debounceTimer: NodeJS.Timeout;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Clear any pending refresh
        clearTimeout(debounceTimer);

        // Set a short delay before refreshing to ensure the tab is fully visible
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
  }, [enabled, refreshData]);

  // Also set up a periodic check for content updates
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    // Store initial content version when page loads
    const initialVersion = document
      .querySelector('meta[name="content-version"]')
      ?.getAttribute("content");

    // Function to check for new content
    const checkForUpdates = async () => {
      try {
        // Fetch just the headers of the current page to check for new versions
        const response = await fetch(window.location.pathname, {
          method: "HEAD",
          cache: "no-cache",
          headers: {
            "x-fmt-fresh": "1", // Custom header to signal we want fresh content
          },
        });

        // Get the server's content version
        const serverVersion = response.headers.get("x-fmt-version");

        // If server has newer content, trigger a refresh
        if (serverVersion && serverVersion !== initialVersion) {
          refreshData();
        }
      } catch (e) {
        console.error(
          "[useVisibilityRefresh] Error checking for content updates:",
          e
        );
      }
    };

    // Check for updates periodically (every 30 seconds)
    const checkInterval = setInterval(checkForUpdates, 30000);

    // Clean up
    return () => clearInterval(checkInterval);
  }, [enabled, refreshData]);

  return {
    lastRefreshed,
    isRefreshing,
    refreshData, // Expose the refresh function so it can be triggered manually
  };
};
