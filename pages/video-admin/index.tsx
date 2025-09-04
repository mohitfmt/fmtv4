import { GetServerSideProps } from "next";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Head from "next/head";

import { withAdminPageSSR } from "@/lib/adminAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  AlertCircle,
  ChevronRight,
  Settings,
  List,
  RefreshCw,
  Database,
  Activity,
  Video,
  TrendingUp,
  Clock,
  User,
} from "lucide-react";
import { useRouter } from "next/router";
import { formatDistanceToNow } from "date-fns";
import { videoApiJson } from "@/lib/videoApi";

interface PageProps {
  requiresAuth?: boolean;
  unauthorized?: boolean;
  userEmail?: string;
  traceId?: string;
  enableOneTap?: boolean;
  session?: any;
}

interface DashboardStats {
  videos: {
    total: number;
    lastAdded: string | null;
    trending: number;
    newToday: number;
  };
  playlists: {
    total: number;
    active: number;
    inactive: number;
  };
  sync: {
    status: "active" | "inactive" | "syncing";
    lastSync: string | null;
    nextSync: string | null;
    currentlySyncing: boolean;
    currentPlaylist: string | null;
  };
  cache: {
    cdnHitRate: number;
    lruUsage: number;
    lastCleared: string | null;
    totalCacheSize: number;
    maxCacheSize: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    userId: string;
    timestamp: string;
  }>;
}

interface DashboardResponse {
  data: DashboardStats;
  traceId: string;
  timestamp: string;
}

export default function VideoAdminDashboard({
  requiresAuth,
  unauthorized,
  userEmail,
  session: serverSession,
}: PageProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const currentSession = session || serverSession;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (currentSession) {
      loadDashboardStats();

      // Auto-refresh every 30 seconds
      const interval = setInterval(() => {
        loadDashboardStats(true);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [currentSession]);

  const loadDashboardStats = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      } else {
        setRefreshing(true);
      }

      const response = await videoApiJson<DashboardResponse>(
        "/api/video-admin/dashboard/stats"
      );

      if (response?.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error("Failed to load dashboard stats:", error);
      setError("Failed to load dashboard statistics. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardStats();
  };

  // Handle authentication states
  if (requiresAuth && !currentSession) {
    return null;
  }

  if (unauthorized) {
    return (
      <>
        <Head>
          <title>Access Denied - Video Admin</title>
          <meta name="robots" content="noindex,nofollow,noarchive" />
        </Head>

        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-card rounded-lg shadow-lg border border-border p-8">
              <div className="text-center mb-6">
                <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-foreground">
                  Access Denied
                </h1>
                <p className="text-muted-foreground mt-2">
                  Your account ({userEmail}) is not authorized
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (loading && !stats) {
    return (
      <AdminLayout
        title="Dashboard"
        description="Video content management overview"
      >
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-card rounded-lg border border-border h-32"
              />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-card rounded-lg border border-border h-32"
              />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error && !stats) {
    return (
      <AdminLayout
        title="Dashboard"
        description="Video content management overview"
      >
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-red-800 dark:text-red-200">{error}</p>
            <button
              onClick={handleRefresh}
              className="ml-auto text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              Try Again
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Main dashboard with AdminLayout
  return (
    <>
      <Head>
        <title>Video Admin Dashboard - FMT</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </Head>

      <AdminLayout
        title="Dashboard"
        description="Video content management overview"
      >
        {/* Refresh button in top right */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-card hover:bg-accent rounded-lg border border-border transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <Video className="w-8 h-8 text-blue-500" />
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {stats?.videos.total.toLocaleString() || "—"}
            </div>
            <p className="text-sm text-muted-foreground">Total Videos</p>
            {stats?.videos.lastAdded && (
              <p className="text-xs text-muted-foreground mt-1">
                Last added{" "}
                {formatDistanceToNow(new Date(stats.videos.lastAdded), {
                  addSuffix: true,
                })}
              </p>
            )}
            {stats && stats?.videos.newToday > 0 && (
              <p className="text-xs text-green-600 mt-0.5">
                +{stats.videos.newToday} today
              </p>
            )}
          </div>

          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <List className="w-8 h-8 text-green-500" />
              <span className="text-sm font-medium text-green-500">
                {stats?.playlists.active || 0} active
              </span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {stats?.playlists.total || "—"}
            </div>
            <p className="text-sm text-muted-foreground">Total Playlists</p>
            {stats && stats?.playlists.inactive > 0 && (
              <p className="text-xs text-yellow-600 mt-1">
                {stats.playlists.inactive} inactive
              </p>
            )}
          </div>

          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <RefreshCw
                className={`w-8 h-8 ${
                  stats?.sync.status === "syncing"
                    ? "text-blue-500 animate-spin"
                    : stats?.sync.status === "active"
                      ? "text-green-500"
                      : "text-gray-500"
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  stats?.sync.status === "active"
                    ? "text-green-500"
                    : stats?.sync.status === "syncing"
                      ? "text-blue-500"
                      : "text-gray-500"
                }`}
              >
                {stats?.sync.status || "—"}
              </span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              Sync Status
            </div>
            <p className="text-sm text-muted-foreground">
              {stats?.sync.lastSync
                ? `Last: ${formatDistanceToNow(new Date(stats.sync.lastSync), { addSuffix: true })}`
                : "No recent sync"}
            </p>
            {stats?.sync.currentlySyncing && stats.sync.currentPlaylist && (
              <p className="text-xs text-blue-600 mt-1">
                Syncing: {stats.sync.currentPlaylist}
              </p>
            )}
            {/* {stats && stats?.sync.webhookExpiry !== null &&
              stats.sync.webhookExpiry < 48 && (
                <p className="text-xs text-amber-600 mt-0.5">
                  Webhook expires in {stats.sync.webhookExpiry}h
                </p>
              )} */}
          </div>

          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <Database className="w-8 h-8 text-purple-500" />
              <span className="text-sm font-medium text-blue-500">
                {stats?.cache.cdnHitRate || 0}%
              </span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              Cache Health
            </div>
            <p className="text-sm text-muted-foreground">CDN Hit Rate</p>
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all"
                style={{ width: `${stats?.cache.cdnHitRate || 0}%` }}
              />
            </div>
            {stats?.cache.lruUsage !== undefined && (
              <p className="text-xs text-muted-foreground mt-1">
                LRU: {stats.cache.lruUsage}% used
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => router.push("/video-admin/configuration")}
            className="bg-card hover:bg-accent rounded-lg border border-border p-4 text-left transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <Settings className="w-8 h-8 text-blue-500" />
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <h3 className="font-semibold text-foreground">
              Video Configuration
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Set homepage & page layouts
            </p>
          </button>

          <button
            onClick={() => router.push("/video-admin/playlists")}
            className="bg-card hover:bg-accent rounded-lg border border-border p-4 text-left transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <List className="w-8 h-8 text-green-500" />
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <h3 className="font-semibold text-foreground">
              Playlist Management
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {stats?.playlists.total || 0} playlists available
            </p>
          </button>

          <button
            onClick={() => router.push("/video-admin/sync")}
            className="bg-card hover:bg-accent rounded-lg border border-border p-4 text-left transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <RefreshCw className="w-8 h-8 text-purple-500" />
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <h3 className="font-semibold text-foreground">Sync Control</h3>
            <p className="text-sm text-muted-foreground mt-1">
              YouTube webhook{" "}
              {stats?.sync.status === "active" ? "active" : "inactive"}
            </p>
          </button>

          <button
            onClick={() => router.push("/video-admin/cache")}
            className="bg-card hover:bg-accent rounded-lg border border-border p-4 text-left transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <Database className="w-8 h-8 text-orange-500" />
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <h3 className="font-semibold text-foreground">Cache Management</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {/* {stats?.cache.cacheCount || 0} caches active • CDN{" "} */}
              {stats?.cache.totalCacheSize || 0} caches active • CDN{" "}
              {stats?.cache.cdnHitRate || 0}% hit rate
            </p>
          </button>
        </div>

        {/* Recent Activity */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>

          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {stats.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {activity.action}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {activity.userId}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(activity.timestamp), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>No recent activity</p>
            </div>
          )}
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
