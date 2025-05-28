// lib/debug/memoryDebugger.ts - ENHANCED VERSION
import heapdump from "heapdump";
import { changeManager } from "@/lib/cache/smart-cache-registry";

const tracked = new Map<string, () => number>();
const memoryHistory: number[] = [];
let lastGC = Date.now();
const GC_MIN_INTERVAL = 30000; // 30 seconds minimum between GCs

/** Register a metric to track (e.g. cache.size) */
export function track(label: string, fn: () => number) {
  tracked.set(label, fn);
}

/** Smart GC that runs based on memory pressure, not just time */
function smartGC(reason: string): boolean {
  const now = Date.now();
  const timeSinceLastGC = now - lastGC;

  // Don't GC too frequently
  if (timeSinceLastGC < GC_MIN_INTERVAL) {
    console.log(
      `[MemoryDebugger] Skipping GC (${reason}), only ${timeSinceLastGC}ms since last GC`
    );
    return false;
  }

  const gcFn = global.gc;
  if (gcFn && typeof gcFn === "function") {
    const before = process.memoryUsage().heapUsed;
    gcFn();
    const after = process.memoryUsage().heapUsed;
    const freedMB = Math.round((before - after) / 1024 / 1024);

    console.log(
      `[MemoryDebugger] Manual GC triggered (${reason}), freed ${freedMB}MB`
    );
    lastGC = now;
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

  // MB per minute (assuming intervals)
  return (recentAvg - olderAvg) * 2;
}

export function startMemoryDebugger({
  label = "FMT",
  interval = 30_000,
  enableGC = true,
  enableHandlesDump = true,
  heapDumpInterval = 60 * 60 * 1_000,
  // New smart GC thresholds
  gcThreshold = 1000, // Trigger GC above 1GB
  warningThreshold = 1200, // Warning at 1.2GB
  criticalThreshold = 1600, // Critical at 1.6GB
}: {
  label?: string;
  interval?: number;
  enableGC?: boolean;
  enableHandlesDump?: boolean;
  heapDumpInterval?: number;
  gcThreshold?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
} = {}) {
  let lastDump = Date.now();

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

    // Track memory history
    memoryHistory.push(heapMB);
    if (memoryHistory.length > 50) {
      memoryHistory.shift();
    }

    const trend = calculateTrend();

    console.log(
      `[${label}] heapUsed=${heapMB}MB ` +
        `rss=${rssMB}MB ` +
        `trend=${trend > 0 ? "+" : ""}${trend.toFixed(1)}MB/min`
    );

    // log tracked metrics
    for (const [name, fn] of tracked.entries()) {
      try {
        console.log(`[${label}] ${name} = ${fn()}`);
      } catch (err) {
        console.warn(`[${label}] Error in tracker ${name}:`, err);
      }
    }

    // Smart GC based on memory pressure and trend
    if (enableGC) {
      if (heapMB > criticalThreshold) {
        console.error(
          `[${label}] CRITICAL: Memory above ${criticalThreshold}MB!`
        );
        smartGC("critical-memory");
      } else if (heapMB > warningThreshold) {
        console.warn(`[${label}] WARNING: Memory above ${warningThreshold}MB`);
        smartGC("warning-memory");
      } else if (heapMB > gcThreshold && trend > 10) {
        // Memory is rising fast
        smartGC("rising-trend");
      }
    }

    // periodic heap snapshot
    const now = Date.now();
    if (heapDumpInterval && now - lastDump > heapDumpInterval) {
      const path = `/tmp/heap-${now}.heapsnapshot`;
      heapdump.writeSnapshot(path);
      console.log(`[${label}] Heap snapshot written to ${path}`);
      lastDump = now;
    }

    // dynamic import of why-is-node-running (no require)
    if (enableHandlesDump && process.env.DEBUG_HANDLE_ANALYSIS === "true") {
      import("why-is-node-running")
        .then((mod) => {
          const whyFn = (mod as any).default ?? mod;
          whyFn();
        })
        .catch((e) => {
          console.warn(`[${label}] why-is-node-running import failed:`, e);
        });
    }
  }, interval);

  console.log(`[${label}] Memory debugger started with smart GC enabled`);
  console.log(
    `[${label}] Thresholds - GC: ${gcThreshold}MB, Warning: ${warningThreshold}MB, Critical: ${criticalThreshold}MB`
  );
}
