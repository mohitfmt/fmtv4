import { GetServerSideProps } from "next";
import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import AdminLayout from "@/components/admin/AdminLayout";
import { withAdminPageSSR } from "@/lib/adminAuth";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import {
  Trash2,
  RefreshCw,
  Database,
  Cloud,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
  Activity,
  AlertCircle,
  Gauge,
  Loader2,
  BarChart3,
  Clock,
  MemoryStick,
} from "lucide-react";
import { videoApiJson } from "@/lib/videoApi";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface PageProps {
  requiresAuth?: boolean;
  unauthorized?: boolean;
  userEmail?: string;
  traceId?: string;
  enableOneTap?: boolean;
  session?: any;
}

interface CacheMetrics {
  cdn: {
    provider: string;
    status: "healthy" | "degraded" | "error";
    hitRate: number;
    missRate: number;
    bandwidth: string;
    requests: number;
    cached: number;
    size: string;
    lastCleared?: string;
    cost: number;
  };
  lru: {
    status: "active" | "inactive";
    caches: Array<{
      name: string;
      size: number;
      maxSize: number;
      hitRate: number;
      ttl: number;
      hits: number;
      misses: number;
      evictions: number;
    }>;
    totalMemory: string;
    memoryUsage: number;
    lastCleared?: string;
  };
  database: {
    videos: number;
    playlists: number;
    totalSize: string;
    collections: number;
    indexes: number;
    lastOptimized?: string;
    performance: "optimal" | "good" | "slow";
  };
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    throughput: number;
    healthScore: number;
  };
}

interface CacheOperation {
  id: string;
  type: "clear" | "purge" | "optimize" | "refresh";
  target: string;
  status: "success" | "failed" | "pending";
  timestamp: string;
  duration: number;
  itemsAffected: number;
  sizeCleaned?: string;
  performedBy: string;
}

interface CacheStatus {
  metrics: CacheMetrics;
  recentOperations: CacheOperation[];
  recommendations: string[];
}

export default function CacheManagementPage({
  requiresAuth,
  unauthorized,
  userEmail,
  session: serverSession,
}: PageProps) {
  const { data: session } = useSession();
  const currentSession = session || serverSession;
  // State Management
  const [status, setStatus] = useState<CacheStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // UI State
  const [activeTab, setActiveTab] = useState<
    "overview" | "cdn" | "lru" | "database"
  >("overview");
  const [selectedCaches, setSelectedCaches] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Operation States
  const [clearing, setClearing] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  // Load cache status
  const loadCacheStatus = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }

      const response = await videoApiJson<CacheStatus>(
        "/api/video-admin/cache/status"
      );

      if (response) {
        setStatus(response);
      }
    } catch (error) {
      console.error("Failed to load cache status:", error);
      if (!silent) {
        setError("Failed to load cache status");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and auto-refresh
  useEffect(() => {
    if (currentSession) {
      loadCacheStatus();
    }
  }, [loadCacheStatus, currentSession]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadCacheStatus(true);
      }, 10000); // Every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, loadCacheStatus]);

  // Clear cache
  const clearCache = async (type: "cdn" | "lru" | "all", target?: string) => {
    setClearing(type);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await videoApiJson("/api/video-admin/cache/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, target }),
      });

      if (response?.success) {
        setSuccessMessage(
          `Successfully cleared ${type === "all" ? "all caches" : `${type} cache`}`
        );
        await loadCacheStatus(true);
      }
    } catch (error) {
      setError(`Failed to clear ${type} cache`);
    } finally {
      setClearing(null);
      setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 5000);
    }
  };

  // Purge CDN
  const purgeCDN = async (path?: string) => {
    setPurging(true);
    setError(null);

    try {
      const response = await videoApiJson("/api/video-admin/cache/purge-cdn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: path || "/*" }),
      });

      if (response?.success) {
        setSuccessMessage("CDN purge initiated successfully");
        await loadCacheStatus(true);
      }
    } catch (error) {
      setError("Failed to purge CDN");
    } finally {
      setPurging(false);
      setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 5000);
    }
  };

  // Optimize database
  const optimizeDatabase = async () => {
    setOptimizing(true);
    setError(null);

    try {
      const response = await videoApiJson("/api/video-admin/cache/optimize", {
        method: "POST",
      });

      if (response?.success) {
        setSuccessMessage("Database optimization completed");
        await loadCacheStatus(true);
      }
    } catch (error) {
      setError("Failed to optimize database");
    } finally {
      setOptimizing(false);
      setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 5000);
    }
  };

  // Calculate overall health
  const getOverallHealth = () => {
    if (!status) return { status: "unknown", color: "gray", score: 0 };

    const { metrics } = status;
    const score = metrics.performance.healthScore;

    if (score >= 90) {
      return { status: "Excellent", color: "green", score };
    } else if (score >= 70) {
      return { status: "Good", color: "blue", score };
    } else if (score >= 50) {
      return { status: "Warning", color: "yellow", score };
    } else {
      return { status: "Critical", color: "red", score };
    }
  };

  // Format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  if (requiresAuth && !currentSession) {
    return null;
  }
  
  if (loading && !status) {
    return (
      <AdminLayout
        title="Cache Management"
        description="Manage CDN and application caches"
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const health = getOverallHealth();

  return (
    <>
      <Head>
        <title>Cache Management - Video Admin</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </Head>

      <AdminLayout
        title="Cache Management"
        description="Monitor and manage CDN, LRU, and database caches"
      >
        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-green-800 dark:text-green-200">
                {successMessage}
              </p>
            </div>
          </div>
        )}

        {/* Health Overview */}
        <div
          className={cn(
            "mb-6 p-4 rounded-lg border-2",
            health.color === "green" &&
              "bg-green-50 dark:bg-green-950/20 border-green-500",
            health.color === "blue" &&
              "bg-blue-50 dark:bg-blue-950/20 border-blue-500",
            health.color === "yellow" &&
              "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500",
            health.color === "red" &&
              "bg-red-50 dark:bg-red-950/20 border-red-500"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Gauge
                  className={cn(
                    "w-8 h-8",
                    health.color === "green" && "text-green-600",
                    health.color === "blue" && "text-blue-600",
                    health.color === "yellow" && "text-yellow-600",
                    health.color === "red" && "text-red-600"
                  )}
                />
                <span className="absolute -bottom-1 -right-1 text-xs font-bold">
                  {health.score}%
                </span>
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  Cache Performance: {health.status}
                </p>
                <p className="text-sm text-muted-foreground">
                  {status?.metrics?.cdn?.hitRate || 0}% CDN hit rate •{" "}
                  {status?.metrics?.lru?.memoryUsage || 0}% memory usage •{" "}
                  {status?.metrics?.performance?.avgResponseTime || 0}ms avg
                  response
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  autoRefresh
                    ? "bg-primary text-primary-foreground"
                    : "bg-card hover:bg-accent"
                )}
                title="Auto-refresh"
              >
                <Activity className="w-4 h-4" />
              </button>

              <Button
                onClick={() => loadCacheStatus()}
                disabled={refreshing}
                variant="outline"
                size="sm"
              >
                <RefreshCw
                  className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")}
                />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* CDN Status */}
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <Cloud
                className={cn(
                  "w-8 h-8",
                  status?.metrics.cdn.status === "healthy" && "text-green-500",
                  status?.metrics.cdn.status === "degraded" &&
                    "text-yellow-500",
                  status?.metrics.cdn.status === "error" && "text-red-500"
                )}
              />
              <span className="text-2xl font-bold text-foreground">
                {status?.metrics.cdn.hitRate || 0}%
              </span>
            </div>
            <h3 className="font-semibold text-foreground">CDN Cache</h3>
            <p className="text-sm text-muted-foreground">
              {status?.metrics.cdn.cached || 0} items •{" "}
              {status?.metrics.cdn.size || "0 GB"}
            </p>
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-green-500 h-1.5 rounded-full transition-all"
                style={{ width: `${status?.metrics.cdn.hitRate || 0}%` }}
              />
            </div>
          </div>

          {/* LRU Cache */}
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <MemoryStick
                className={cn(
                  "w-8 h-8",
                  status?.metrics.lru.status === "active"
                    ? "text-blue-500"
                    : "text-gray-500"
                )}
              />
              <span className="text-2xl font-bold text-foreground">
                {status?.metrics.lru.memoryUsage || 0}%
              </span>
            </div>
            <h3 className="font-semibold text-foreground">LRU Cache</h3>
            <p className="text-sm text-muted-foreground">
              {status?.metrics.lru.caches?.length || 0} caches •{" "}
              {status?.metrics.lru.totalMemory}
            </p>
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  status &&
                    status.metrics.lru.memoryUsage < 60 &&
                    "bg-blue-500",
                  status &&
                    status.metrics.lru.memoryUsage >= 60 &&
                    status.metrics.lru.memoryUsage < 80 &&
                    "bg-yellow-500",
                  status && status.metrics.lru.memoryUsage >= 80 && "bg-red-500"
                )}
                style={{ width: `${status?.metrics.lru.memoryUsage || 0}%` }}
              />
            </div>
          </div>

          {/* Database */}
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <Database
                className={cn(
                  "w-8 h-8",
                  status?.metrics.database.performance === "optimal" &&
                    "text-green-500",
                  status?.metrics.database.performance === "good" &&
                    "text-blue-500",
                  status?.metrics.database.performance === "slow" &&
                    "text-red-500"
                )}
              />
              <span className="text-lg font-bold text-foreground">
                {status?.metrics.database.totalSize}
              </span>
            </div>
            <h3 className="font-semibold text-foreground">Database</h3>
            <p className="text-sm text-muted-foreground">
              {status?.metrics.database.videos || 0} videos •{" "}
              {status?.metrics.database.playlists || 0} playlists
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {status?.metrics.database.performance} performance
            </p>
          </div>

          {/* Performance */}
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-8 h-8 text-orange-500" />
              <span className="text-2xl font-bold text-foreground">
                {status?.metrics.performance.avgResponseTime || 0}ms
              </span>
            </div>
            <h3 className="font-semibold text-foreground">Response Time</h3>
            <p className="text-sm text-muted-foreground">
              P95: {status?.metrics.performance.p95ResponseTime || 0}ms
            </p>
            <p className="text-xs text-muted-foreground">
              Error rate: {status?.metrics.performance.errorRate || 0}%
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6 p-4 bg-card rounded-lg border border-border">
          <h3 className="font-semibold text-foreground mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => clearCache("cdn")}
              disabled={clearing === "cdn"}
              variant="outline"
              className="text-blue-600 border-blue-600"
            >
              {clearing === "cdn" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Cloud className="w-4 h-4 mr-2" />
              )}
              Clear CDN Cache
            </Button>

            <Button
              onClick={() => clearCache("lru")}
              disabled={clearing === "lru"}
              variant="outline"
              className="text-purple-600 border-purple-600"
            >
              {clearing === "lru" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <MemoryStick className="w-4 h-4 mr-2" />
              )}
              Clear LRU Cache
            </Button>

            <Button
              onClick={() => purgeCDN()}
              disabled={purging}
              variant="outline"
            >
              {purging ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Purge All CDN
            </Button>

            <Button
              onClick={optimizeDatabase}
              disabled={optimizing}
              variant="outline"
            >
              {optimizing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Database className="w-4 h-4 mr-2" />
              )}
              Optimize Database
            </Button>

            <Button
              onClick={() => clearCache("all")}
              disabled={clearing === "all"}
              variant="destructive"
            >
              {clearing === "all" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <AlertTriangle className="w-4 h-4 mr-2" />
              )}
              Clear All Caches
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-card rounded-lg border border-border">
          <div className="border-b border-border">
            <nav className="flex">
              {[
                { id: "overview", label: "Overview", icon: BarChart3 },
                { id: "cdn", label: "CDN Cache", icon: Cloud },
                { id: "lru", label: "LRU Cache", icon: MemoryStick },
                { id: "database", label: "Database", icon: Database },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 border-b-2 transition-colors",
                      activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Performance Metrics */}
                <div>
                  <h4 className="font-semibold text-foreground mb-4">
                    Performance Metrics
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Avg Response
                      </p>
                      <p className="text-2xl font-bold">
                        {status?.metrics.performance.avgResponseTime || 0}ms
                      </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        P95 Response
                      </p>
                      <p className="text-2xl font-bold">
                        {status?.metrics.performance.p95ResponseTime || 0}ms
                      </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Throughput
                      </p>
                      <p className="text-2xl font-bold">
                        {status?.metrics.performance.throughput || 0}/s
                      </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Error Rate
                      </p>
                      <p className="text-2xl font-bold text-red-600">
                        {status?.metrics.performance.errorRate || 0}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recent Operations */}
                <div>
                  <h4 className="font-semibold text-foreground mb-4">
                    Recent Operations
                  </h4>
                  <div className="space-y-2">
                    {status?.recentOperations &&
                    status.recentOperations.length > 0 ? (
                      status.recentOperations.map((op) => (
                        <div
                          key={op.id}
                          className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                        >
                          {op.status === "success" ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : op.status === "pending" ? (
                            <Clock className="w-5 h-5 text-yellow-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {op.type.charAt(0).toUpperCase() +
                                op.type.slice(1)}{" "}
                              {op.target}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{op.itemsAffected} items</span>
                              {op.sizeCleaned && (
                                <span>{op.sizeCleaned} cleared</span>
                              )}
                              <span>{op.duration}ms</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(op.timestamp), {
                                addSuffix: true,
                              })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              by {op.performedBy}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>No recent operations</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recommendations */}
                {status?.recommendations &&
                  status.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-4">
                        Recommendations
                      </h4>
                      <div className="space-y-2">
                        {status.recommendations.map((rec, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg"
                          >
                            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                            <p className="text-sm">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* CDN Tab */}
            {activeTab === "cdn" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      Hit Rate
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {status?.metrics.cdn.hitRate || 0}%
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      Miss Rate
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                      {status?.metrics.cdn.missRate || 0}%
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      Bandwidth
                    </p>
                    <p className="text-2xl font-bold">
                      {status?.metrics.cdn.bandwidth}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      Total Requests
                    </p>
                    <p className="text-2xl font-bold">
                      {status?.metrics.cdn.requests?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      Cached Items
                    </p>
                    <p className="text-2xl font-bold">
                      {status?.metrics.cdn.cached?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      Cache Size
                    </p>
                    <p className="text-2xl font-bold">
                      {status?.metrics.cdn.size}
                    </p>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="font-semibold text-foreground mb-4">
                    CDN Actions
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">Purge Specific Path</p>
                        <p className="text-sm text-muted-foreground">
                          Clear cache for a specific URL path
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="/api/videos/*"
                          className="px-3 py-1 bg-card border border-border rounded"
                        />
                        <Button
                          onClick={() => purgeCDN("/api/videos/*")}
                          disabled={purging}
                          size="sm"
                        >
                          Purge
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">Clear All CDN Cache</p>
                        <p className="text-sm text-muted-foreground">
                          Remove all cached content from CDN
                        </p>
                      </div>
                      <Button
                        onClick={() => clearCache("cdn")}
                        disabled={clearing === "cdn"}
                        variant="destructive"
                        size="sm"
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* LRU Tab */}
            {activeTab === "lru" && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-foreground mb-4">
                    Active Caches
                  </h4>
                  <div className="space-y-2">
                    {status?.metrics.lru.caches &&
                    status.metrics.lru.caches.length > 0 ? (
                      status.metrics.lru.caches.map((cache) => (
                        <div
                          key={cache.name}
                          className="p-4 bg-muted/30 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium">{cache.name}</h5>
                            <Button
                              onClick={() => clearCache("lru", cache.name)}
                              disabled={clearing === cache.name}
                              size="sm"
                              variant="ghost"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            <div>
                              <p className="text-muted-foreground">Size</p>
                              <p className="font-medium">
                                {cache.size}/{cache.maxSize}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Hit Rate</p>
                              <p className="font-medium text-green-600">
                                {cache.hitRate}%
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">TTL</p>
                              <p className="font-medium">{cache.ttl}s</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">
                                Hits/Misses
                              </p>
                              <p className="font-medium">
                                {cache.hits}/{cache.misses}
                              </p>
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
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <MemoryStick className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>No active LRU caches</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Memory Usage</p>
                      <p className="text-sm text-muted-foreground">
                        {status?.metrics.lru.totalMemory} used (
                        {status?.metrics.lru.memoryUsage}%)
                      </p>
                    </div>
                    <Button
                      onClick={() => clearCache("lru")}
                      disabled={clearing === "lru"}
                      variant="destructive"
                    >
                      Clear All LRU
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Database Tab */}
            {activeTab === "database" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      Total Videos
                    </p>
                    <p className="text-2xl font-bold">
                      {status?.metrics.database.videos?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      Total Playlists
                    </p>
                    <p className="text-2xl font-bold">
                      {status?.metrics.database.playlists || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      Database Size
                    </p>
                    <p className="text-2xl font-bold">
                      {status?.metrics.database.totalSize}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      Collections
                    </p>
                    <p className="text-2xl font-bold">
                      {status?.metrics.database.collections || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      Indexes
                    </p>
                    <p className="text-2xl font-bold">
                      {status?.metrics.database.indexes || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      Performance
                    </p>
                    <p
                      className={cn(
                        "text-2xl font-bold capitalize",
                        status?.metrics.database.performance === "optimal" &&
                          "text-green-600",
                        status?.metrics.database.performance === "good" &&
                          "text-blue-600",
                        status?.metrics.database.performance === "slow" &&
                          "text-red-600"
                      )}
                    >
                      {status?.metrics.database.performance}
                    </p>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="font-semibold text-foreground mb-4">
                    Database Maintenance
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">Optimize Database</p>
                        <p className="text-sm text-muted-foreground">
                          Rebuild indexes and optimize queries
                        </p>
                        {status?.metrics.database.lastOptimized && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last optimized:{" "}
                            {formatDistanceToNow(
                              new Date(status.metrics.database.lastOptimized),
                              { addSuffix: true }
                            )}
                          </p>
                        )}
                      </div>
                      <Button onClick={optimizeDatabase} disabled={optimizing}>
                        {optimizing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Database className="w-4 h-4 mr-2" />
                        )}
                        Optimize
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = withAdminPageSSR(
  async (context) => {
    return {
      props: {
        requiresAuth: true,
      },
    };
  }
);
