// lib/debug/memoryDebugger.ts - Production-Ready Version
import heapdump from "heapdump";
import { changeManager } from "@/lib/cache/smart-cache-registry";

const tracked = new Map<string, () => number>();
const memoryHistory: number[] = [];
let lastGC = Date.now();
let lastForcedGC = Date.now();
const GC_MIN_INTERVAL = 30000; // 30 seconds minimum between GCs

/** Register a metric to track (e.g. cache.size) */
export function track(label: string, fn: () => number) {
  tracked.set(label, fn);
}

/** Smart GC that runs based on memory pressure, not just time */
function smartGC(reason: string, force: boolean = false): boolean {
  const now = Date.now();
  const timeSinceLastGC = now - lastGC;

  // Don't GC too frequently UNLESS it's a forced/fallback GC
  if (!force && timeSinceLastGC < GC_MIN_INTERVAL) {
    return false; // Silently skip - no need to log this in production
  }

  const gcFn = global.gc;
  if (gcFn && typeof gcFn === "function") {
    const before = process.memoryUsage().heapUsed;
    const beforeMB = Math.round(before / 1024 / 1024);

    gcFn();

    const after = process.memoryUsage().heapUsed;
    const afterMB = Math.round(after / 1024 / 1024);
    const freedMB = beforeMB - afterMB;

    // Always log GC events - these are important
    console.log(
      `[MemoryDebugger] GC triggered (${reason}): freed ${freedMB}MB (${beforeMB}MB → ${afterMB}MB)`
    );

    lastGC = now;
    if (force) {
      lastForcedGC = now;
    }

    return true;
  }

  return false;
}

/** Calculate memory growth trend */
function calculateTrend(): number {
  if (memoryHistory.length < 3) return 0;

  const recent = memoryHistory.slice(-3);
  const older = memoryHistory.slice(0, 3);

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

  // MB per minute (assuming 30s intervals)
  return (recentAvg - olderAvg) * 2;
}

export function startMemoryDebugger({
  label = "FMT",
  interval = 30_000,
  enableGC = true,
  enableHandlesDump = false,
  heapDumpInterval = 0, // Disabled by default for production
  // Smart GC thresholds
  gcThreshold = 1000, // Trigger GC above 1GB
  warningThreshold = 1200, // Warning at 1.2GB
  criticalThreshold = 1600, // Critical at 1.6GB
  // Fallback GC interval (default 45 minutes)
  fallbackGCInterval = 45 * 60 * 1000,
}: {
  label?: string;
  interval?: number;
  enableGC?: boolean;
  enableHandlesDump?: boolean;
  heapDumpInterval?: number;
  gcThreshold?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  fallbackGCInterval?: number;
} = {}) {
  let lastDump = Date.now();
  let lastDetailedLog = Date.now();
  const DETAILED_LOG_INTERVAL = 5 * 60 * 1000; // Log details every 5 minutes

  // Log initial state
  console.log(`[${label}] Memory debugger initialized`);
  console.log(`[${label}] GC available: ${typeof global.gc === "function"}`);
  console.log(
    `[${label}] Thresholds - GC: ${gcThreshold}MB, Warning: ${warningThreshold}MB, Critical: ${criticalThreshold}MB, Fallback: ${fallbackGCInterval / 1000 / 60}min`
  );

  if (!global.gc || typeof global.gc !== "function") {
    console.error(
      `[${label}] ERROR: global.gc not available! Check NODE_OPTIONS=--expose-gc`
    );
    return; // Exit early if GC not available
  }

  // Listen to cache invalidation events for strategic GC
  if (enableGC && changeManager) {
    changeManager.on("processed", (event) => {
      const mem = process.memoryUsage();
      const heapMB = mem.heapUsed / 1024 / 1024;

      // After batch invalidation, if memory is high, trigger GC
      if (heapMB > gcThreshold) {
        smartGC("post-cache-invalidation");
      }
    });
  }

  setInterval(() => {
    const mem = process.memoryUsage();
    const heapMB = Math.round(mem.heapUsed / 1024 / 1024);
    const rssMB = Math.round(mem.rss / 1024 / 1024);
    const externalMB = Math.round(mem.external / 1024 / 1024);
    const arrayBuffersMB = Math.round(mem.arrayBuffers / 1024 / 1024);

    // Track memory history
    memoryHistory.push(heapMB);
    if (memoryHistory.length > 10) {
      memoryHistory.shift();
    }

    const trend = calculateTrend();
    const now = Date.now();
    const shouldLogDetails = now - lastDetailedLog > DETAILED_LOG_INTERVAL;

    // Production: Only log memory stats every 5 minutes or when there's an issue
    if (shouldLogDetails || heapMB > warningThreshold) {
      console.log(
        `[${label}] Memory: ` +
          `heap=${heapMB}MB (${((heapMB / rssMB) * 100).toFixed(1)}% of RSS), ` +
          `rss=${rssMB}MB, ` +
          `external=${externalMB}MB, ` +
          `arrayBuffers=${arrayBuffersMB}MB, ` +
          `trend=${trend > 0 ? "+" : ""}${trend.toFixed(1)}MB/min`
      );

      // Log cache sizes only in detailed logs
      if (shouldLogDetails) {
        for (const [name, fn] of tracked.entries()) {
          try {
            console.log(`[${label}] ${name} = ${fn()}`);
          } catch (err) {
            // Silently skip errors in production
          }
        }
        lastDetailedLog = now;
      }
    }

    // Smart GC based on memory pressure and trend
    if (enableGC) {
      // Check for critical memory first
      if (heapMB > criticalThreshold) {
        console.error(
          `[${label}] CRITICAL: Memory ${heapMB}MB exceeds ${criticalThreshold}MB!`
        );
        smartGC("critical-memory");
      }
      // Check for warning threshold
      else if (heapMB > warningThreshold) {
        console.warn(
          `[${label}] WARNING: Memory ${heapMB}MB exceeds ${warningThreshold}MB`
        );
        smartGC("warning-memory");
      }
      // Check for rising trend
      else if (heapMB > gcThreshold && trend > 10) {
        smartGC("rising-trend");
      }

      // FALLBACK: Force GC if it hasn't run in a long time
      const timeSinceLastForcedGC = now - lastForcedGC;
      if (timeSinceLastForcedGC > fallbackGCInterval) {
        console.log(
          `[${label}] Triggering fallback GC after ${Math.round(timeSinceLastForcedGC / 1000 / 60)} minutes`
        );
        smartGC("fallback-timer", true);
      }
    }

    // Heap dumps - only if explicitly enabled (not for production)
    if (heapDumpInterval && now - lastDump > heapDumpInterval) {
      const path = `/tmp/heap-${now}.heapsnapshot`;
      heapdump.writeSnapshot(path);
      console.log(`[${label}] Heap snapshot written to ${path}`);
      lastDump = now;
    }
  }, interval);
}
