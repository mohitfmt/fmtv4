// instrumentation.ts (at root level)
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[Instrumentation] Server-side initialization started");

    // Initialize memory management in production
    if (
      process.env.NODE_ENV === "production" ||
      process.env.DEBUG_MEMORY === "true"
    ) {
      const { startMemoryDebugger, track } = await import(
        "@/lib/debug/memoryDebugger"
      );

      // Import caches
      const caches = await import("@/lib/cache/smart-cache-registry");
      // Detect container memory
      let containerMemoryMB = 2048; // Default 2GB

      // Production typically has more memory than staging
      const isProd = process.env.NEXT_PUBLIC_DOMAIN?.includes("www.");
      containerMemoryMB = isProd ? 8192 : 2048;

      // Calculate dynamic thresholds
      const gcThreshold = Math.floor(containerMemoryMB * 0.25); // 25% - Start proactive GC
      const warningThreshold = Math.floor(containerMemoryMB * 0.35); // 35% - Warning
      const criticalThreshold = Math.floor(containerMemoryMB * 0.45); // 45% - Critical

      // Start memory debugger
      startMemoryDebugger({
        label: "FMT-Memory",
        interval: 30_000, // Check every 30 seconds
        enableGC: true,
        enableHandlesDump: false, // Never in production
        heapDumpInterval: 0, // Never in production
        gcThreshold,
        warningThreshold,
        criticalThreshold,
        fallbackGCInterval: isProd ? 60 * 60 * 1000 : 45 * 60 * 1000, // 60min prod, 45min staging
      });

      // Track only the most important caches
      track("postDataCache.size", () => caches.postDataCache.size);
      track("categoryCache.size", () => caches.categoryCache.size);
      track(
        "filteredCategoryCache.size",
        () => caches.filteredCategoryCache.size
      );
      track("totalCacheMB", () => {
        const totalBytes =
          (caches.postDataCache.calculatedSize || 0) +
          (caches.categoryCache.calculatedSize || 0) +
          (caches.filteredCategoryCache.calculatedSize || 0);
        return Math.round(totalBytes / 1024 / 1024);
      });

      console.log("[Instrumentation] Memory management active");
    }
  }
}

// Optional: Log critical errors only
export function onRequestError(
  error: { digest: string } & Error,
  request: {
    path: string;
    method: string;
  }
) {
  // Only log server errors, not 4xx client errors
  if (!error.message?.includes("4")) {
    console.error(
      `[RequestError] ${request.method} ${request.path}: ${error.message}`
    );
  }
}
