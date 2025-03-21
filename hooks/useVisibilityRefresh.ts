import { useRouter } from "next/router";
import { useEffect, useState } from "react";

/**
 * Custom hook that refreshes the page data when tab becomes visible
 * @param {boolean} enabled - Whether the hook should be enabled
 * @param {number} debounceMs - Debounce time in milliseconds to prevent multiple refreshes
 * @returns {object} - Object containing refresh state information
 */
export const useVisibilityRefresh = (enabled = true, debounceMs = 1000) => {
  console.log(
    "Component with visibility hook rendered",
    new Date().toISOString()
  );

  const router = useRouter();
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    console.log("useVisibilityRefresh hook initialized with enabled:", enabled);

    if (!enabled) return;

    let debounceTimer: NodeJS.Timeout;

    const refreshData = () => {
      console.log("refreshData function called");

      const now = new Date();
      if (
        lastRefreshed &&
        now.getTime() - lastRefreshed.getTime() < debounceMs
      ) {
        console.log("Skipping refresh - too soon since last refresh");
        return;
      }

      setIsRefreshing(true);
      console.log("Setting isRefreshing to true");

      setLastRefreshed(now);
      console.log("lastRefreshed updated to:", now.toISOString());

      router
        .replace(router.asPath, undefined, { scroll: false })
        .then(() => {
          console.log("router.replace completed successfully");
        })
        .catch((error) => {
          console.error("Error in router.replace:", error);
        })
        .finally(() => {
          setTimeout(() => {
            setIsRefreshing(false);
            console.log("isRefreshing set to false");
          }, 500);
        });
    };

    const handleVisibilityChange = () => {
      console.log(
        "visibilitychange event triggered, current state:",
        document.visibilityState
      );

      if (document.visibilityState === "visible") {
        console.log("Tab became visible, scheduling refresh with debounce");
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          console.log("Debounce timeout complete, calling refreshData");
          refreshData();
        }, 300);
      }
    };

    if (typeof document !== "undefined") {
      console.log("Adding visibilitychange event listener");
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      console.log("Cleaning up useVisibilityRefresh hook");
      if (typeof document !== "undefined") {
        console.log("Removing visibilitychange event listener");
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      }
      console.log("Clearing debounce timer");
      clearTimeout(debounceTimer);
    };
  }, [router, enabled, lastRefreshed, debounceMs]);

  return {
    lastRefreshed,
    isRefreshing,
  };
};
