// pages/video-admin/index.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import AdminLayout from "@/components/admin/AdminLayout";
import { videoApiJson } from "@/lib/videoApi";
import { formatDistanceToNow } from "date-fns";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { LazyMotion } from "framer-motion";
import {
  FiActivity,
  FiAlertCircle,
  FiDatabase,
  FiLayers,
  FiRefreshCw,
  FiTrendingUp,
  FiVideo,
  FiWifiOff,
  FiZap,
} from "react-icons/fi";
import { cn } from "@/lib/utils";

// Import dashboard components
import { StatsCard } from "@/components/admin/dashboard/cards/StatsCard";
import { TrendingVideosCard } from "@/components/admin/dashboard/cards/TrendingVideosCard";
import { PerformanceMetricsCard } from "@/components/admin/dashboard/cards/PerformanceMetricsCard";
import { ContentSuggestionsCard } from "@/components/admin/dashboard/cards/ContentSuggestionsCard";
// ContentInsightsCard import removed
import UploadHistoryChart from "@/components/admin/dashboard/charts/UploadHistoryChart";
import EngagementChart from "@/components/admin/dashboard/charts/EngagementChart";

// Import constants
import { REFRESH_CONFIG } from "@/lib/dashboard/constants";

// Import types
import type { DashboardStats } from "@/types/video-admin-dashboard";
import { useVideoAdminAuth } from "@/hooks/useVideoAdminAuth";

// Import animation features
const loadFeatures = () =>
  import("@/lib/framer-features").then((res) => res.default);

interface DashboardResponse {
  success: boolean;
  data?: DashboardStats;
  error?: string;
  traceId: string;
  timestamp: string;
  cached?: boolean;
}

export default function VideoDashboard() {
  const { user, isAuthorized, isChecking } = useVideoAdminAuth();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  // State management
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [retryCountView, setRetryCountView] = useState(0);

  // Refs for intervals and retries
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch dashboard statistics
  const fetchStats = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setRefreshing(true);
        setError(null);
      }

      try {
        const response = await videoApiJson("/api/video-admin/dashboard/stats");

        // Check if response exists first
        if (!response) {
          throw new Error("No response from server");
        }

        if (response.success && response.data) {
          setStats(response.data);
          setLastUpdate(new Date());
          setError(null);
          setRetryCountView(0);
        } else {
          throw new Error(response.error || "Failed to fetch dashboard stats");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred";

        console.error("Dashboard stats error:", errorMessage);
        setError(errorMessage);

        // Retry logic
        if (
          !isManualRefresh &&
          retryCountView < REFRESH_CONFIG.RETRY_MAX_ATTEMPTS
        ) {
          setRetryCountView((prev) => prev + 1);
          retryTimeoutRef.current = setTimeout(
            () => fetchStats(),
            REFRESH_CONFIG.RETRY_BASE_DELAY * Math.pow(2, retryCountView)
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [retryCountView]
  );

  // Manual refresh handler
  const handleManualRefresh = useCallback(() => {
    if (!refreshing && !loading) {
      fetchStats(true);
    }
  }, [refreshing, loading, fetchStats]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefreshEnabled) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    refreshIntervalRef.current = setInterval(
      () => fetchStats(),
      REFRESH_CONFIG.ACTIVE_INTERVAL
    );

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefreshEnabled, fetchStats]);

  // Initial data fetch
  useEffect(() => {
    fetchStats();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  if (isChecking || !isAuthorized) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  // Activity item component
  const ActivityItem = ({ activity }: { activity: any }) => {
    const getActivityIcon = () => {
      switch (activity.entityType) {
        case "video":
          return <FiVideo className="w-4 h-4" />;
        case "playlist":
          return <FiLayers className="w-4 h-4" />;
        case "sync":
          return <FiRefreshCw className="w-4 h-4" />;
        case "cache":
          return <FiDatabase className="w-4 h-4" />;
        default:
          return <FiActivity className="w-4 h-4" />;
      }
    };

    return (
      <div className="flex gap-3 items-start group">
        <div className="w-8 h-8 bg-muted/50 rounded-full flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          {getActivityIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm">{activity.action}</p>
          <p className="text-xs text-muted-foreground">
            {activity.relativeTime}
            {activity.details && ` • ${activity.details}`}
          </p>
        </div>
      </div>
    );
  };

  // System status component
  const SystemStatus = ({ stats }: { stats: DashboardStats | null }) => (
    <div className="bg-card border rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">System Status</h3>

      <div className="space-y-4">
        {/* Sync Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-3 h-3 rounded-full",
                stats?.sync.status === "active"
                  ? "bg-green-500 animate-pulse"
                  : stats?.sync.status === "syncing"
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-gray-400"
              )}
            />
            <span className="text-sm">Sync Status</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {stats?.sync.status || "Unknown"}
          </span>
        </div>

        {/* WebSub Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-3 h-3 rounded-full",
                stats?.sync.webhookActive ? "bg-green-500" : "bg-gray-400"
              )}
            />
            <span className="text-sm">WebSub Webhook</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {stats?.sync.webhookActive ? "Active" : "Inactive"}
          </span>
        </div>

        {/* Cache Performance */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-3 h-3 rounded-full",
                (stats?.cache.cdnHitRate ?? 0) >= 90
                  ? "bg-green-500"
                  : (stats?.cache.cdnHitRate ?? 0) >= 70
                    ? "bg-yellow-500"
                    : "bg-red-500"
              )}
            />
            <span className="text-sm">Cache Performance</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {stats?.cache.cdnHitRate || 0}% Hit Rate
          </span>
        </div>

        {/* Last Sync */}
        {stats?.sync.lastSync && (
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Last sync:{" "}
              {formatDistanceToNow(new Date(stats.sync.lastSync), {
                addSuffix: true,
              })}
            </p>
            {stats.sync.nextSync && (
              <p className="text-xs text-muted-foreground mt-1">
                Next sync:{" "}
                {formatDistanceToNow(new Date(stats.sync.nextSync), {
                  addSuffix: true,
                })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Video Dashboard | Admin</title>
        <meta name="description" content="Video content management dashboard" />
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </Head>
      <AdminLayout>
        <LazyMotion features={loadFeatures} strict={prefersReducedMotion}>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Video Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                  Monitor and manage your video content
                </p>
                {lastUpdate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last updated{" "}
                    {formatDistanceToNow(lastUpdate, { addSuffix: true })}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    autoRefreshEnabled
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                  title={
                    autoRefreshEnabled
                      ? "Disable auto-refresh"
                      : "Enable auto-refresh"
                  }
                >
                  {autoRefreshEnabled ? (
                    <FiZap className="w-5 h-5" />
                  ) : (
                    <FiWifiOff className="w-5 h-5" />
                  )}
                </button>

                <button
                  onClick={handleManualRefresh}
                  disabled={refreshing || loading}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    refreshing || loading
                      ? "bg-muted cursor-not-allowed"
                      : "bg-card hover:bg-muted"
                  )}
                >
                  <FiRefreshCw
                    className={cn(
                      "w-5 h-5",
                      (refreshing || loading) && "animate-spin"
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Error State */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FiAlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-500">{error}</p>
                    {retryCountView > 0 &&
                      retryCountView < REFRESH_CONFIG.RETRY_MAX_ATTEMPTS && (
                        <p className="text-xs text-red-400 mt-1">
                          Retry attempt: {retryCountView}/
                          {REFRESH_CONFIG.RETRY_MAX_ATTEMPTS}
                        </p>
                      )}
                  </div>
                </div>
              </div>
            )}

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                icon={FiVideo}
                label="Total Videos"
                value={stats?.videos.total || 0}
                loading={loading && !stats}
                color="primary"
                // New props for Videos Today feature
                showTodayCount={true}
                todayValue={stats?.videos.newToday || 0}
                todayLoading={loading && !stats}
              />

              <StatsCard
                icon={FiTrendingUp}
                label="Videos This Week"
                value={stats?.videos.thisWeek || 0}
                trend={
                  stats && stats.videos.weekChange > 0
                    ? "up"
                    : (stats?.videos.weekChange ?? 0 < 0)
                      ? "down"
                      : "neutral"
                }
                trendValue={
                  stats ? `${Math.abs(stats.videos.weekChange)}%` : undefined
                }
                loading={loading && !stats}
                color="success"
              />

              <StatsCard
                icon={FiLayers}
                label="Active Playlists"
                value={`${stats?.playlists.active || 0}/${stats?.playlists.total || 0}`}
                trend={
                  stats && stats.playlists.utilizationRate >= 80 ? "up" : "down"
                }
                trendValue={
                  stats ? `${stats.playlists.utilizationRate}%` : undefined
                }
                loading={loading && !stats}
                color="warning"
              />

              <StatsCard
                icon={FiActivity}
                label="Cache Hit Rate"
                value={`${stats?.cache.cdnHitRate || 0}%`}
                trend={stats && stats.cache.cdnHitRate >= 90 ? "up" : "down"}
                trendValue={stats?.cache.formattedSize}
                loading={loading && !stats}
                color={
                  stats && stats.cache.cdnHitRate >= 90 ? "success" : "danger"
                }
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload History */}
              <div className="bg-card border rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold">Upload History</h3>
                    <p className="text-sm text-muted-foreground">
                      {stats?.videos.weekDates.thisWeek.start} -{" "}
                      {stats?.videos.weekDates.thisWeek.end}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Daily avg: {stats?.videos.dailyAverage || 0}
                  </div>
                </div>

                <UploadHistoryChart
                  data={stats?.videos.uploadHistory || []}
                  loading={loading && !stats}
                />
              </div>

              {/* Engagement Metrics */}
              <div className="bg-card border rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-6">
                  Engagement Metrics
                </h3>
                <EngagementChart
                  data={stats?.engagementData || []}
                  performanceMetrics={stats?.performance || undefined}
                  loading={loading && !stats}
                />
              </div>
            </div>

            {/* Advanced Metrics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <PerformanceMetricsCard
                  metrics={stats?.performance || null}
                  loading={loading && !stats}
                />
                <TrendingVideosCard
                  videos={stats?.videos.trendingList || []}
                  loading={loading && !stats}
                />
              </div>
              <div>
                <ContentSuggestionsCard
                  suggestions={stats?.suggestions || null}
                  loading={loading && !stats}
                  onRefresh={handleManualRefresh}
                />
              </div>
            </div>

            {/* Activity and System Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <div className="bg-card border rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>

                {loading && !stats ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex gap-3 items-start animate-pulse"
                      >
                        <div className="w-8 h-8 bg-muted rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {stats?.recentActivity
                      .slice(0, 10)
                      .map((activity) => (
                        <ActivityItem key={activity.id} activity={activity} />
                      ))}

                    {(!stats?.recentActivity ||
                      stats.recentActivity.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No recent activity
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* System Status */}
              <SystemStatus stats={stats} />
            </div>

            {/* ContentInsightsCard has been removed from here */}
          </div>
        </LazyMotion>
      </AdminLayout>
    </>
  );
}
