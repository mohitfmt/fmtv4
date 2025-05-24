// lib/debug/memoryDebugger.ts
import heapdump from "heapdump";

//const isGCExposed = typeof global.gc() === "function";
const tracked = new Map<string, () => number>();

/** Register a metric to track (e.g. cache.size) */
export function track(label: string, fn: () => number) {
  tracked.set(label, fn);
}

export function startMemoryDebugger({
  label = "FMT",
  interval = 30_000,
  enableGC = true,
  enableHandlesDump = true,
  heapDumpInterval = 60 * 60 * 1_000,
}: {
  label?: string;
  interval?: number;
  enableGC?: boolean;
  enableHandlesDump?: boolean;
  heapDumpInterval?: number;
} = {}) {
  let lastDump = Date.now();

  setInterval(() => {
    const mem = process.memoryUsage();
    console.log(
      `[${label}] heapUsed=${Math.round(mem.heapUsed / 1024 / 1024)}MB ` +
        `rss=${Math.round(mem.rss / 1024 / 1024)}MB`
    );

    // log tracked metrics
    for (const [name, fn] of tracked.entries()) {
      try {
        console.log(`[${label}] ${name} = ${fn()}`);
      } catch (err) {
        console.warn(`[${label}] Error in tracker ${name}:`, err);
      }
    }

    // manual GC if available
    const gcFn = global.gc;
    if (enableGC && typeof gcFn === "function") {
      gcFn(); // <— now safe, TS knows gcFn is a function
      console.log(`[${label}] Manual GC triggered`);
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
          // mod.default is the function
          const whyFn = (mod as any).default ?? mod;
          whyFn();
        })
        .catch((e) => {
          console.warn(`[${label}] why-is-node-running import failed:`, e);
        });
    }
  }, interval);
}
