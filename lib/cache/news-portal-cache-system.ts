// lib/cache/news-portal-cache-system.ts (Enhanced version)
import { LRUCache } from "lru-cache";
import { EventEmitter } from "events";

interface ContentChangeEvent {
  type: "new" | "update";
  articleId: string;
  slug: string;
  categories: string[];
  timestamp: Date;
  priority: "breaking" | "normal";
}

class CacheDependencyGraph {
  private dependencies = new Map<string, Set<string>>();
  private reverseDependencies = new Map<string, Set<string>>();
  private navigationPaths = new Map<string, Set<string>>();

  addDependency(cacheKey: string, articleId: string): void {
    if (!this.dependencies.has(articleId)) {
      this.dependencies.set(articleId, new Set());
    }
    this.dependencies.get(articleId)!.add(cacheKey);

    if (!this.reverseDependencies.has(cacheKey)) {
      this.reverseDependencies.set(cacheKey, new Set());
    }
    this.reverseDependencies.get(cacheKey)!.add(articleId);
  }

  setNavigationPaths(cacheKey: string, paths: string[]): void {
    this.navigationPaths.set(cacheKey, new Set(paths));
  }

  getNavigationPaths(cacheKey: string): string[] {
    return Array.from(this.navigationPaths.get(cacheKey) || []);
  }

  getDependentCacheKeys(articleId: string): string[] {
    return Array.from(this.dependencies.get(articleId) || []);
  }

  removeCacheKey(cacheKey: string): void {
    const articleIds = this.reverseDependencies.get(cacheKey) || [];

    articleIds.forEach((articleId) => {
      this.dependencies.get(articleId)?.delete(cacheKey);
      if (this.dependencies.get(articleId)?.size === 0) {
        this.dependencies.delete(articleId);
      }
    });

    this.reverseDependencies.delete(cacheKey);
    this.navigationPaths.delete(cacheKey);
  }

  getStats() {
    return {
      articles: this.dependencies.size,
      cacheKeys: this.reverseDependencies.size,
      navigationPaths: this.navigationPaths.size,
      totalDependencies: Array.from(this.dependencies.values()).reduce(
        (sum, set) => sum + set.size,
        0
      ),
    };
  }
}

export class SmartNewsCache<
  T extends Record<string, any>,
> extends EventEmitter {
  private cache: LRUCache<string, T>;
  private dependencyGraph = new CacheDependencyGraph();
  private name: string;

  constructor(name: string, options: LRUCache.Options<string, T, unknown>) {
    super();
    this.name = name;

    this.cache = new LRUCache({
      ...options,
      dispose: (value, key, reason) => {
        this.dependencyGraph.removeCacheKey(key);
        this.emit("evict", { key, reason });

        if (options.dispose) {
          options.dispose(value, key, reason);
        }
      },
    });
  }

  setWithDependencies(key: string, value: T, dependencies: string[]): void {
    this.cache.set(key, value);

    dependencies.forEach((articleId) => {
      this.dependencyGraph.addDependency(key, articleId);
    });

    this.emit("set", { key, dependencies });
  }

  setNavigationPaths(key: string, paths: string[]): void {
    this.dependencyGraph.setNavigationPaths(key, paths);
  }

  set(key: string, value: T): void {
    this.cache.set(key, value);
    this.emit("set", { key, dependencies: [] });
  }

  invalidateArticle(articleId: string): {
    invalidated: number;
    affectedPaths: string[];
  } {
    const keysToInvalidate =
      this.dependencyGraph.getDependentCacheKeys(articleId);

    let invalidated = 0;
    const allAffectedPaths = new Set<string>();

    keysToInvalidate.forEach((key) => {
      // Collect navigation paths before deleting
      const paths = this.dependencyGraph.getNavigationPaths(key);
      paths.forEach((path) => allAffectedPaths.add(path));

      if (this.cache.delete(key)) {
        invalidated++;
      }
    });

    if (invalidated > 0) {
      console.log(
        `[${this.name}] Invalidated ${invalidated} entries for article ${articleId}, affecting ${allAffectedPaths.size} paths`
      );
    }

    this.emit("invalidate", {
      articleId,
      invalidated,
      paths: Array.from(allAffectedPaths),
    });

    return {
      invalidated,
      affectedPaths: Array.from(allAffectedPaths),
    };
  }

  get(key: string): T | undefined {
    return this.cache.get(key);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  get size(): number {
    return this.cache.size;
  }

  get calculatedSize(): number | undefined {
    return this.cache.calculatedSize;
  }

  getStats() {
    return {
      name: this.name,
      size: this.cache.size,
      calculatedSize: this.cache.calculatedSize,
      dependencyStats: this.dependencyGraph.getStats(),
    };
  }
}

export class ContentChangeManager extends EventEmitter {
  private caches: Map<string, SmartNewsCache<any>> = new Map();
  private updateQueue: ContentChangeEvent[] = [];
  private isProcessing = false;
  private batchInterval: NodeJS.Timeout | null = null;
  private affectedPathsCollector = new Set<string>();

  constructor(private batchDelayMs: number = 100) {
    super();
    this.startBatchProcessor();
  }

  registerCache(name: string, cache: SmartNewsCache<any>): void {
    this.caches.set(name, cache);

    // Listen for invalidation events to collect affected paths
    cache.on("invalidate", ({ paths }) => {
      if (paths && paths.length > 0) {
        paths.forEach((path: string) => this.affectedPathsCollector.add(path));
      }
    });
  }

  handleContentChange(event: ContentChangeEvent): void {
    this.updateQueue.push(event);
    this.emit("queued", event);
  }

  getAffectedPaths(): string[] {
    const paths = Array.from(this.affectedPathsCollector);
    this.affectedPathsCollector.clear();
    return paths;
  }

  private startBatchProcessor(): void {
    this.batchInterval = setInterval(() => {
      if (this.updateQueue.length > 0 && !this.isProcessing) {
        this.processBatch();
      }
    }, this.batchDelayMs);
  }

  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.updateQueue.length === 0) return;

    this.isProcessing = true;
    const batch = [...this.updateQueue];
    this.updateQueue = [];

    const startTime = Date.now();
    const invalidationStats = new Map<string, number>();
    let totalInvalidated = 0;

    const changesByArticle = new Map<string, ContentChangeEvent>();
    batch.forEach((event) => {
      changesByArticle.set(event.articleId, event);
    });

    for (const [articleId, event] of changesByArticle) {
      for (const [cacheName, cache] of this.caches) {
        const { invalidated } = cache.invalidateArticle(articleId);

        if (invalidated > 0) {
          const currentCount = invalidationStats.get(cacheName) || 0;
          invalidationStats.set(cacheName, currentCount + invalidated);
          totalInvalidated += invalidated;
        }
      }

      this.emit("processed", event);
    }

    const duration = Date.now() - startTime;

    if (totalInvalidated > 0 || process.env.DEBUG_CACHE === "true") {
      console.log(`[ContentChangeManager] Batch processed in ${duration}ms:`, {
        articlesProcessed: changesByArticle.size,
        totalInvalidated,
        affectedPaths: this.affectedPathsCollector.size,
        cacheStats: Object.fromEntries(
          Array.from(invalidationStats.entries()).filter(
            ([_, count]) => count > 0
          )
        ),
      });
    }

    this.isProcessing = false;
  }

  getStats() {
    const cacheStats: any = {};
    this.caches.forEach((cache, name) => {
      cacheStats[name] = cache.getStats();
    });

    return {
      queueLength: this.updateQueue.length,
      isProcessing: this.isProcessing,
      affectedPaths: this.affectedPathsCollector.size,
      caches: cacheStats,
    };
  }

  destroy(): void {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
    }
  }
}

// Export everything else as before...
export function createNewsCaches() {
  const changeManager = new ContentChangeManager(100);

  const postDataCache = new SmartNewsCache<any>("postData", {
    max: 300,
    maxSize: 150 * 1024 * 1024, // 150MB
    ttl: 1000 * 60 * 5, // 5 minutes
    sizeCalculation: (value) => {
      const str = JSON.stringify(value);
      return str.length * 2;
    },
  });

  const categoryCache = new SmartNewsCache<any>("category", {
    max: 100,
    maxSize: 50 * 1024 * 1024, // 50MB
    ttl: 1000 * 60 * 2, // 2 minutes
    sizeCalculation: (value) => {
      const str = JSON.stringify(value);
      return str.length * 2;
    },
  });

  const homepageCache = new SmartNewsCache<any>("homepage", {
    max: 20,
    maxSize: 20 * 1024 * 1024, // 20MB
    ttl: 1000 * 60, // 1 minute
    sizeCalculation: (value) => {
      const str = JSON.stringify(value);
      return str.length * 2;
    },
  });

  changeManager.registerCache("postData", postDataCache);
  changeManager.registerCache("category", categoryCache);
  changeManager.registerCache("homepage", homepageCache);

  return {
    postDataCache,
    categoryCache,
    homepageCache,
    changeManager,
  };
}

const { postDataCache, categoryCache, homepageCache, changeManager } =
  createNewsCaches();

export { postDataCache, categoryCache, homepageCache, changeManager };

export class CacheHealthMonitor {
  private metricsHistory: any[] = [];
  private readonly maxHistorySize = 100;

  constructor() {
    setInterval(() => this.collectMetrics(), 30000);
  }

  private collectMetrics(): void {
    const metrics = {
      timestamp: new Date(),
      memory: process.memoryUsage(),
      cacheStats: changeManager.getStats(),
      hitRates: this.calculateHitRates(),
    };

    this.metricsHistory.push(metrics);

    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }

    this.checkHealthStatus(metrics);
  }

  private calculateHitRates(): Record<string, number> {
    return {
      postData: postDataCache.size / 300,
      category: categoryCache.size / 100,
      homepage: homepageCache.size / 20,
    };
  }

  private checkHealthStatus(metrics: any): void {
    const heapUsedMB = metrics.memory.heapUsed / 1024 / 1024;

    if (heapUsedMB > 1200) {
      console.error("[CacheHealth] CRITICAL: Memory usage above 1.2GB");
      this.triggerMemoryRelief();
    }
  }

  private triggerMemoryRelief(): void {
    const caches = [postDataCache, categoryCache, homepageCache];

    caches.forEach((cache: any) => {
      const currentSize = cache.size;
      console.log(
        `[MemoryRelief] Cache ${cache.name} has ${currentSize} items`
      );
    });

    if (global.gc) {
      global.gc();
    }
  }

  getHealthReport() {
    const latest = this.metricsHistory[this.metricsHistory.length - 1];
    const oldest = this.metricsHistory[0];

    if (!latest || !oldest) return null;

    const memoryGrowth = latest.memory.heapUsed - oldest.memory.heapUsed;
    const timeSpan =
      new Date(latest.timestamp).getTime() -
      new Date(oldest.timestamp).getTime();
    const growthRate = memoryGrowth / (timeSpan / 1000 / 60);

    return {
      current: {
        memoryMB: latest.memory.heapUsed / 1024 / 1024,
        caches: latest.cacheStats.caches,
        hitRates: latest.hitRates,
      },
      trend: {
        memoryGrowthPerHour: (growthRate * 60) / 1024 / 1024,
        stability: Math.abs(growthRate) < 1024 * 1024 ? "STABLE" : "UNSTABLE",
      },
      recommendation: this.getRecommendation(latest, growthRate),
    };
  }

  private getRecommendation(latest: any, growthRate: number): string {
    if (growthRate > 10 * 1024 * 1024) {
      return "High memory growth detected. Check for unusual traffic patterns.";
    }

    const avgHitRate =
      Object.values(latest.hitRates as Record<string, number>).reduce(
        (sum, rate) => sum + rate,
        0
      ) / Object.keys(latest.hitRates).length;

    if (avgHitRate < 0.6) {
      return "Low cache hit rates. Consider increasing cache TTLs or sizes.";
    }

    return "System operating normally.";
  }
}

export const cacheHealthMonitor = new CacheHealthMonitor();
