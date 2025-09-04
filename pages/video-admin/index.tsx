import { GetServerSideProps } from "next";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Head from "next/head";

import { withAdminPageSSR } from "@/lib/adminAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Settings,
  List,
  RefreshCw,
  Database,
  Activity,
  Video,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/router";
import { formatDistanceToNow } from "date-fns";

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
    lastAdded: string;
    trending: number;
  };
  playlists: {
    total: number;
    active: number;
    inactive: number;
  };
  sync: {
    status: "active" | "inactive" | "syncing";
    lastSync: string;
    nextSync: string;
  };
  cache: {
    cdnHitRate: number;
    lruUsage: number;
    lastCleared: string;
  };
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

  useEffect(() => {
    if (currentSession) {
      loadDashboardStats();
    }
  }, [currentSession]);

  const loadDashboardStats = async () => {
    try {
      // Mock data for now - replace with actual API call
      setStats({
        videos: {
          total: 19999,
          lastAdded: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          trending: 42,
        },
        playlists: {
          total: 25,
          active: 23,
          inactive: 2,
        },
        sync: {
          status: "active",
          lastSync: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          nextSync: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        },
        cache: {
          cdnHitRate: 94,
          lruUsage: 67,
          lastCleared: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        },
      });
    } catch (error) {
      console.error("Failed to load dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle authentication states
  if (requiresAuth && !currentSession) {
    // This should be handled by withAdminPageSSR, but keeping for safety
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
                className="bg-blue-500 h-1.5 rounded-full"
                style={{ width: `${stats?.cache.cdnHitRate || 0}%` }}
              />
            </div>
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
              Clear CDN & LRU cache
            </p>
          </button>
        </div>

        {/* Recent Activity */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Recent Activity</h3>
            <Activity className="w-5 h-5 text-blue-500" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Playlist sync completed</p>
                <p className="text-xs text-muted-foreground">
                  2 hours ago • 15 new videos added
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
              <Database className="w-4 h-4 text-blue-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Cache cleared</p>
                <p className="text-xs text-muted-foreground">
                  5 hours ago • CDN cache purged
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
              <Settings className="w-4 h-4 text-purple-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Configuration updated</p>
                <p className="text-xs text-muted-foreground">
                  Yesterday • Homepage playlist changed
                </p>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = withAdminPageSSR();
