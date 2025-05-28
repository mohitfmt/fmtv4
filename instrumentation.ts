// instrumentation.ts (at root level, not in src/)
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[Instrumentation] Initializing server-side instrumentation");

    // Initialize memory management in production or when DEBUG_MEMORY is set
    if (
      process.env.NODE_ENV === "production" ||
      process.env.DEBUG_MEMORY === "true"
    ) {
      const { startMemoryDebugger, track } = await import(
        "@/lib/debug/memoryDebugger"
      );

      // Import all caches to track
      const {
        postDataCache,
        filteredCategoryCache,
        moreHomePostsCache,
        moreHorizontalPostsCache,
        moreVerticalPostsCache,
        moreSubcategoryPostsCache,
        categoryCache,
        postPageCache,
      } = await import("@/lib/cache/smart-cache-registry");

      // Start the enhanced memory debugger
      startMemoryDebugger({
        label: "FMT-Memory",
        interval: 30_000, // Check every 30 seconds
        enableGC: true,
        enableHandlesDump: false, // Disable in production
        heapDumpInterval:
          process.env.NODE_ENV === "production" ? 0 : 60 * 60 * 1_000,
        // Adjusted thresholds for your 2GB container
        gcThreshold: 800, // Start GC at 800MB
        warningThreshold: 1200, // Warning at 1.2GB
        criticalThreshold: 1600, // Critical at 1.6GB (leaves 400MB buffer)
      });

      // Track cache sizes
      track("postDataCache.size", () => postDataCache.size);
      track("filteredCategoryCache.size", () => filteredCategoryCache.size);
      track("moreHomePostsCache.size", () => moreHomePostsCache.size);
      track(
        "moreHorizontalPostsCache.size",
        () => moreHorizontalPostsCache.size
      );
      track("moreVerticalPostsCache.size", () => moreVerticalPostsCache.size);
      track(
        "moreSubcategoryPostsCache.size",
        () => moreSubcategoryPostsCache.size
      );
      track("categoryCache.size", () => categoryCache.size);
      track("postPageCache.size", () => postPageCache.size);

      // Track calculated sizes if available
      track("postDataCache.MB", () =>
        Math.round((postDataCache.calculatedSize || 0) / 1024 / 1024)
      );
      track("categoryCache.MB", () =>
        Math.round((categoryCache.calculatedSize || 0) / 1024 / 1024)
      );

      console.log("[Instrumentation] Memory management initialized");
    }
  }
}

export function onRequestError(
  error: { digest: string } & Error,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string };
  }
) {
  console.error(`[Request Error] ${request.method} ${request.path}`, {
    digest: error.digest,
    message: error.message,
    stack: error.stack,
  });
}
