import { GetServerSideProps } from "next";
import { useState, useEffect } from "react";
import Head from "next/head";
import AdminLayout from "@/components/admin/AdminLayout";
import { withAdminPageSSR } from "@/lib/adminAuth";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  RefreshCw,
  Database,
  Cloud,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
} from "lucide-react";
import { videoApiJson } from "@/lib/videoApi";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface CacheStatus {
  cdn: {
    provider: string; // Cloudflare
    status: "healthy" | "degraded" | "error";
    cachedItems: number;
    size: string;
    hitRate: number;
    lastCleared?: string;
  };
  lruCache: {
    status: "active" | "inactive";
    caches: {
      name: string;
      size: number;
      maxSize: number;
      hitRate: number;
      ttl: number;
    }[];
    totalMemory: string;
    lastCleared?: string;
  };
  database: {
    videos: number;
    playlists: number;
    totalSize: string;
    lastOptimized?: string;
  };
}

interface ClearResult {
  success: boolean;
  itemsCleared: number;
  message: string;
}

export default function CachePage() {
  const [status, setStatus] = useState<CacheStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const data = await videoApiJson<CacheStatus>(
        "/api/video-admin/cache/status"
      );
      setStatus(data);
    } catch (error) {
      console.error("Failed to load cache status:", error);
      setMessage({ type: "error", text: "Failed to load cache status" });
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async (type: "cdn" | "lru" | "all") => {
    setClearing(type);
    setMessage(null);

    try {
      const result = await videoApiJson<ClearResult>(
        `/api/video-admin/cache/clear`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        }
      );

      setMessage({
        type: result.success ? "success" : "error",
        text: result.message,
      });

      // Reload status after clearing
      await loadStatus();

      // Clear message after 5 seconds
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      setMessage({
        type: "error",
        text: `Failed to clear ${type} cache`,
      });
    } finally {
      setClearing(null);
    }
  };

  const optimizeDatabase = async () => {
    setClearing("database");
    setMessage(null);

    try {
      await videoApiJson("/api/video-admin/cache/optimize", {
        method: "POST",
      });

      setMessage({
        type: "success",
        text: "Database optimized successfully",
      });

      await loadStatus();
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to optimize database",
      });
    } finally {
      setClearing(null);
    }
  };

  const purgeCDNCache = async (path?: string) => {
    setClearing("cdn-purge");
    setMessage(null);

    try {
      const result = await videoApiJson<ClearResult>(
        "/api/video-admin/cache/purge-cdn",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path }),
        }
      );

      setMessage({
        type: result.success ? "success" : "error",
        text: result.message,
      });

      await loadStatus();
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to purge CDN cache",
      });
    } finally {
      setClearing(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
      case "active":
        return "text-green-500";
      case "degraded":
        return "text-yellow-500";
      case "error":
      case "inactive":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Cache Management" description="Loading...">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Cache Management - FMT Admin</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </Head>

      <AdminLayout
        title="Cache Management"
        description="Manage CDN and LRU caches"
      >
        {/* Alert Message */}
        {message && (
          <div
            className={cn(
              "mb-6 p-4 rounded-lg border flex items-center gap-2",
              message.type === "error"
                ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
                : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
            )}
          >
            {message.type === "error" ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            {message.text}
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-card rounded-lg border border-border p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button
              onClick={() => purgeCDNCache()}
              disabled={clearing !== null}
              variant="outline"
              className="justify-start"
            >
              {clearing === "cdn-purge" ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Cloud className="w-4 h-4 mr-2" />
              )}
              Purge Video CDN
            </Button>
            <Button
              onClick={() => clearCache("lru")}
              disabled={clearing !== null}
              variant="outline"
              className="justify-start"
            >
              {clearing === "lru" ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Clear LRU Cache
            </Button>
            <Button
              onClick={optimizeDatabase}
              disabled={clearing !== null}
              variant="outline"
              className="justify-start"
            >
              {clearing === "database" ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Database className="w-4 h-4 mr-2" />
              )}
              Optimize Database
            </Button>
            <Button
              onClick={() => clearCache("all")}
              disabled={clearing !== null}
              variant="destructive"
              className="justify-start"
            >
              {clearing === "all" ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Clear All Caches
            </Button>
          </div>
        </div>

        {/* Cache Status Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* CDN Cache (Cloudflare) */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold">CDN Cache (Cloudflare)</h3>
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  getStatusColor(status?.cdn.status || "")
                )}
              >
                {status?.cdn.status}
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Provider</span>
                <span className="text-sm font-medium">
                  {status?.cdn.provider}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Cached Items
                </span>
                <span className="text-sm font-medium">
                  {status?.cdn.cachedItems?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Size</span>
                <span className="text-sm font-medium">{status?.cdn.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Hit Rate</span>
                <span className="text-sm font-medium">
                  {status?.cdn.hitRate}%
                </span>
              </div>
              {status?.cdn.lastCleared && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Last Cleared
                  </span>
                  <span className="text-sm">
                    {formatDistanceToNow(new Date(status.cdn.lastCleared), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-4">
              <input
                type="text"
                placeholder="Subpath under /videos (e.g., 'latest' for /videos/latest)"
                className="w-full p-2 text-sm border border-border rounded bg-background mb-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    purgeCDNCache((e.target as HTMLInputElement).value);
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                ⚠️ Only purges video content under /videos/*
              </p>
              <p className="text-xs text-muted-foreground">
                Leave empty to purge all video cache (/videos/*)
              </p>
            </div>
          </div>

          {/* Database */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold">Database</h3>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Videos</span>
                <span className="text-sm font-medium">
                  {status?.database.videos?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Playlists</span>
                <span className="text-sm font-medium">
                  {status?.database.playlists}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Total Size
                </span>
                <span className="text-sm font-medium">
                  {status?.database.totalSize}
                </span>
              </div>
              {status?.database.lastOptimized && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Last Optimized
                  </span>
                  <span className="text-sm">
                    {formatDistanceToNow(
                      new Date(status.database.lastOptimized),
                      { addSuffix: true }
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* LRU Cache Details */}
        <div className="bg-card rounded-lg border border-border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold">LRU Memory Caches</h3>
            </div>
            <span
              className={cn(
                "text-sm font-medium",
                getStatusColor(status?.lruCache.status || "")
              )}
            >
              {status?.lruCache.status} - {status?.lruCache.totalMemory}
            </span>
          </div>

          {status?.lruCache.caches && status.lruCache.caches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {status.lruCache.caches.map((cache) => (
                <div
                  key={cache.name}
                  className="bg-background rounded-lg border border-border p-3"
                >
                  <h4 className="font-medium text-sm mb-2">{cache.name}</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Size/Max</span>
                      <span>
                        {cache.size}/{cache.maxSize}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Hit Rate</span>
                      <span>{cache.hitRate}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">TTL</span>
                      <span>{cache.ttl / 1000}s</span>
                    </div>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{
                        width: `${(cache.size / cache.maxSize) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No active LRU caches
            </p>
          )}

          {status?.lruCache.lastCleared && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  All caches last cleared
                </span>
                <span>
                  {formatDistanceToNow(new Date(status.lruCache.lastCleared), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-2">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-semibold mb-1">Cache Information</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  CDN cache (Cloudflare) stores video thumbnails and static
                  assets globally
                </li>
                <li>
                  LRU memory caches store API responses and frequently accessed
                  data in-memory
                </li>
                <li>
                  Database stores video metadata and playlists persistently
                </li>
                <li>
                  Clearing cache may temporarily slow down the site as it
                  rebuilds
                </li>
                <li>
                  <strong>CDN purge only affects /videos/* paths</strong> -
                  other content remains cached
                </li>
              </ul>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = withAdminPageSSR();
