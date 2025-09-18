// pages/video-admin/index.tsx
import { GetServerSideProps } from "next";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Head from "next/head";
import AdminLayout from "@/components/admin/AdminLayout";
import { withAdminPageSSR } from "@/lib/adminAuth";
import { videoApiJson } from "@/lib/videoApi";
import { formatDistanceToNow } from "date-fns";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { LazyMotion } from "framer-motion";
import {
  FiActivity,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
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
import { ContentInsightsCard } from "@/components/admin/dashboard/cards/ContentInsightsCard";
import { UploadHistoryChart } from "@/components/admin/dashboard/charts/UploadHistoryChart";
import { EngagementChart } from "@/components/admin/dashboard/charts/EngagementChart";

// Import constants
import { REFRESH_CONFIG, CACHE_CONFIG } from "@/lib/dashboard/constants";

// Import types
import type { DashboardStats } from "@/types/video-admin-dashboard";

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

interface PageProps {
  requiresAuth?: boolean;
  traceId?: string;
}

// Activity Item Component
function ActivityItem({ activity }: { activity: any }) {
  const getActivityIcon = () => {
    if (activity.action.includes("sync"))
      return <FiRefreshCw className="w-4 h-4" />;
    if (activity.action.includes("cache"))
      return <FiDatabase className="w-4 h-4" />;
    if (activity.action.includes("success"))
      return <FiCheckCircle className="w-4 h-4" />;
    if (activity.action.includes("failed"))
      return <FiAlertCircle className="w-4 h-4" />;
    return <FiActivity className="w-4 h-4" />;
  };

  const getActivityColor = () => {
    if (
      activity.action.includes("success") ||
      activity.action.includes("completed")
    )
      return "bg-green-500/10 text-green-500";
    if (activity.action.includes("failed") || activity.action.includes("error"))
      return "bg-red-500/10 text-red-500";
    return "bg-muted";
  };

  return (
    <div className="flex gap-3 items-start">
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          getActivityColor()
        )}
      >
        {getActivityIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{activity.action}</p>
        {activity.details && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {activity.details}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {activity.relativeTime} • {activity.userId}
        </p>
      </div>
    </div>
  );
}

// System Status Component
function SystemStatus({ stats }: { stats: DashboardStats | null }) {
  if (!stats) return null;

  return (
    <div className="bg-card border rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">System Status</h3>

      <div className="space-y-4">
        {/* Webhook Status */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                stats.sync.webhookActive ? "bg-green-500" : "bg-red-500"
              )}
            >
              <div
                className={cn(
                  "w-2 h-2 rounded-full animate-ping",
                  stats.sync.webhookActive ? "bg-green-500" : "bg-red-500"
                )}
              />
            </div>
            <div>
              <p className="text-sm font-medium">YouTube Webhook</p>
              <p className="text-xs text-muted-foreground">
                {stats.sync.webhookActive ? "Active" : "Inactive"}
              </p>
            </div>
          </div>
          {stats.sync.webhookExpiry && (
            <span className="text-xs text-muted-foreground">
              Expires{" "}
              {formatDistanceToNow(new Date(stats.sync.webhookExpiry), {
                addSuffix: true,
              })}
            </span>
          )}
        </div>

        {/* Last Sync */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            <FiClock className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Last Sync</p>
              <p className="text-xs text-muted-foreground">
                {stats.sync.lastSync
                  ? formatDistanceToNow(new Date(stats.sync.lastSync), {
                      addSuffix: true,
                    })
                  : "Never"}
              </p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {stats.sync.totalSyncs || 0} total
          </span>
        </div>

        {/* Cache Usage */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            <FiDatabase className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Cache Usage</p>
              <p className="text-xs text-muted-foreground">
                {stats.cache.formattedSize} / {stats.cache.formattedMaxSize}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${stats.cache.lruUsage || 0}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {stats.cache.lruUsage || 0}%
            </span>
          </div>
        </div>

        {/* CDN Hit Rate */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            <FiZap className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">CDN Hit Rate</p>
              <p className="text-xs text-muted-foreground">
                Performance metric
              </p>
            </div>
          </div>
          <span
            className={cn(
              "text-lg font-semibold",
              stats.cache.cdnHitRate >= 90
                ? "text-green-500"
                : stats.cache.cdnHitRate >= 70
                  ? "text-yellow-500"
                  : "text-red-500"
            )}
          >
            {stats.cache.cdnHitRate || 0}%
          </span>
        </div>
      </div>
    </div>
  );
}

// Main Dashboard Component
export default function VideoDashboard({ requiresAuth, traceId }: PageProps) {
  const { data: currentSession } = useSession();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isUserActive, setIsUserActive] = useState(true);

  const retryCountRef = useRef(0);
  const [retryCountView, setRetryCountView] = useState(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const refreshIntervalRef = useRef<NodeJS.Timeout>();
  const abortRef = useRef<AbortController>();

  // Auto-refresh interval
  const autoRefreshInterval = useMemo(() => {
    return isUserActive
      ? REFRESH_CONFIG.ACTIVE_INTERVAL
      : REFRESH_CONFIG.INACTIVE_INTERVAL;
  }, [isUserActive]);

  // Load dashboard stats
  const loadDashboardStats = useCallback(
    async (silent = false, isRetry = false) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        if (!silent) {
          setLoading(true);
          setError(null);
        } else {
          setRefreshing(true);
        }

        // Check cached data
        if (!silent && !isRetry) {
          const cachedData = sessionStorage.getItem("video-admin-dashboard");
          if (cachedData) {
            try {
              const parsed = JSON.parse(cachedData);
              if (
                parsed.timestamp &&
                Date.now() - parsed.timestamp < CACHE_CONFIG.SESSION_CACHE_TTL
              ) {
                setStats(parsed.data);
                setLastUpdated(new Date(parsed.timestamp));
              }
            } catch (e) {
              console.error("Failed to parse cached data:", e);
            }
          }
        }

        const response = await videoApiJson<DashboardResponse>(
          "/api/video-admin/dashboard/stats",
          { signal: controller.signal }
        );

        if (response?.data) {
          setStats(response.data);
          setLastUpdated(new Date());
          setError(null);
          retryCountRef.current = 0;
          setRetryCountView(0);
          setIsOffline(false);

          // Cache the data
          sessionStorage.setItem(
            "video-admin-dashboard",
            JSON.stringify({
              data: response.data,
              timestamp: Date.now(),
            })
          );
        }
      } catch (error: any) {
        if (error.name === "AbortError") return;

        console.error("Failed to load dashboard stats:", error);

        if (!navigator.onLine || error?.message?.includes("fetch")) {
          setIsOffline(true);
          setError(
            "You appear to be offline. Data will refresh when connection is restored."
          );
        } else {
          setError("Failed to load dashboard statistics. Retrying...");

          // Retry logic
          if (
            !isRetry &&
            retryCountRef.current < REFRESH_CONFIG.RETRY_MAX_ATTEMPTS
          ) {
            retryCountRef.current++;
            setRetryCountView(retryCountRef.current);

            retryTimeoutRef.current = setTimeout(() => {
              loadDashboardStats(silent, true);
            }, REFRESH_CONFIG.RETRY_BASE_DELAY * retryCountRef.current);
          }
        }
      } finally {
        if (!silent) setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // Manual refresh
  const handleManualRefresh = useCallback(async () => {
    await loadDashboardStats(true);
  }, [loadDashboardStats]);

  // Initial load
  useEffect(() => {
    loadDashboardStats();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!isUserActive) return;

    refreshIntervalRef.current = setInterval(() => {
      loadDashboardStats(true);
    }, autoRefreshInterval);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefreshInterval, isUserActive, loadDashboardStats]);

  // User activity tracking
  useEffect(() => {
    const handleActivity = () => setIsUserActive(true);
    const handleInactivity = () => setIsUserActive(false);

    let inactivityTimer: NodeJS.Timeout;

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      handleActivity();
      inactivityTimer = setTimeout(
        handleInactivity,
        REFRESH_CONFIG.INACTIVITY_TIMEOUT
      );
    };

    window.addEventListener("mousemove", resetInactivityTimer);
    window.addEventListener("keydown", resetInactivityTimer);
    window.addEventListener("click", resetInactivityTimer);
    window.addEventListener("scroll", resetInactivityTimer);
    window.addEventListener("touchstart", resetInactivityTimer);

    resetInactivityTimer();

    return () => {
      clearTimeout(inactivityTimer);
      window.removeEventListener("mousemove", resetInactivityTimer);
      window.removeEventListener("keydown", resetInactivityTimer);
      window.removeEventListener("click", resetInactivityTimer);
      window.removeEventListener("scroll", resetInactivityTimer);
      window.removeEventListener("touchstart", resetInactivityTimer);
    };
  }, []);

  // Network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (error) {
        loadDashboardStats();
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [error, loadDashboardStats]);

  // Cleanup
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  if (requiresAuth && !currentSession) {
    return null;
  }

  return (
    <AdminLayout title="Dashboard">
      <Head>
        <title>Video Admin Dashboard</title>
      </Head>

      <LazyMotion features={loadFeatures}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Video content management analytics
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Network Status */}
              {isOffline && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-full text-sm">
                  <FiWifiOff className="w-4 h-4" />
                  <span>Offline</span>
                </div>
              )}

              {/* Sync Status */}
              {stats?.sync.status === "syncing" && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-full text-sm">
                  <FiRefreshCw className="w-4 h-4 animate-spin" />
                  <span>Syncing...</span>
                </div>
              )}

              {/* Last Updated */}
              {lastUpdated && (
                <div className="text-sm text-muted-foreground">
                  Updated{" "}
                  {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                </div>
              )}

              {/* Refresh Button */}
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
              <h3 className="text-lg font-semibold mb-6">Engagement Metrics</h3>
              <EngagementChart
                data={stats?.engagementData || []}
                performanceMetrics={stats?.performance || undefined}
                loading={loading && !stats}
              />
            </div>
          </div>

          {/* Advanced Metrics Row 
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TrendingVideosCard
              videos={stats?.videos.trendingList || []}
              loading={loading && !stats}
            />

            <PerformanceMetricsCard
              metrics={stats?.performance || null}
              loading={loading && !stats}
            />

            <ContentSuggestionsCard
              suggestions={stats?.suggestions || null}
              loading={loading && !stats}
              onRefresh={handleManualRefresh}
            />
          </div>
          */}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ContentSuggestionsCard
                suggestions={stats?.suggestions || null}
                loading={loading && !stats}
                onRefresh={handleManualRefresh}
              />
            </div>
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
          {/* Content Insights Full Width */}
          <ContentInsightsCard
            insights={stats?.insights || null}
            loading={loading && !stats}
          />
        </div>
      </LazyMotion>
    </AdminLayout>
  );
}

// Server-side props
export const getServerSideProps: GetServerSideProps = withAdminPageSSR();
