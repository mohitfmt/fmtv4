import { GetServerSideProps } from "next";
import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import AdminLayout from "@/components/admin/AdminLayout";
import { withAdminPageSSR } from "@/lib/adminAuth";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Zap,
  PauseCircle,
  PlayCircle,
  AlertCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
  Calendar,
  Loader2,
  Bell,
  Shield,
  BarChart3,
  Settings,
} from "lucide-react";
import { videoApiJson } from "@/lib/videoApi";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

interface WebSubStatus {
  isActive: boolean;
  status: "active" | "pending" | "expired" | "failed";
  lastRenewal: string | null;
  expiresAt: string | null;
  renewalCount: number;
  webhookUrl: string;
  channelId: string;
  expiresInHours: number;
  expiresInDays: number;
  needsRenewal: boolean;
}

interface SyncQueueItem {
  id: string;
  playlistId: string;
  playlistName: string;
  status: "queued" | "syncing" | "completed" | "failed";
  position: number;
  addedAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

interface SyncHistoryItem {
  id: string;
  playlistId: string;
  playlistName: string;
  status: "success" | "failed" | "partial";
  videosAdded: number;
  videosUpdated: number;
  videosRemoved: number;
  duration: number;
  timestamp: string;
  error?: string;
}

interface WebhookActivity {
  id: string;
  timestamp: string;
  type: "video_update" | "channel_update" | "subscription_verify";
  videoId?: string;
  videoTitle?: string;
  action?: string;
  responseTime: number;
  status: "success" | "failed";
}

interface SyncStats {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageDuration: number;
  totalVideosProcessed: number;
  lastSyncTime: string | null;
  nextScheduledSync: string | null;
  syncHealthScore: number;
}

interface SyncControlData {
  websub: WebSubStatus;
  currentSync: {
    isActive: boolean;
    playlistId: string | null;
    playlistName: string | null;
    progress: number;
    startedAt: string | null;
  };
  queue: SyncQueueItem[];
  recentHistory: SyncHistoryItem[];
  webhookActivity: WebhookActivity[];
  stats: SyncStats;
}

export default function SyncControlPage() {
  // State Management
  const [data, setData] = useState<SyncControlData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // UI State
  const [activeTab, setActiveTab] = useState<
    "overview" | "history" | "webhooks" | "settings"
  >("overview");
  const [historyFilter, setHistoryFilter] = useState<
    "all" | "success" | "failed"
  >("all");
  const [dateRange, setDateRange] = useState<"24h" | "7d" | "30d">("7d");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Operations State
  const [renewingWebhook, setRenewingWebhook] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [stoppingSync, setStoppingSync] = useState(false);

  // Load sync control data
  const loadSyncData = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }

      const response = await videoApiJson<{ data: SyncControlData }>(
        "/api/video-admin/sync/control"
      );

      if (response?.data) {
        setData(response.data);
      }
    } catch (error) {
      console.error("Failed to load sync data:", error);
      if (!silent) {
        setError("Failed to load sync control data");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and auto-refresh
  useEffect(() => {
    loadSyncData();
  }, [loadSyncData]);

  // Auto-refresh when active
  useEffect(() => {
    if (autoRefresh && data?.currentSync?.isActive) {
      const interval = setInterval(() => {
        loadSyncData(true);
      }, 3000); // Every 3 seconds when syncing
      return () => clearInterval(interval);
    } else if (autoRefresh) {
      const interval = setInterval(() => {
        loadSyncData(true);
      }, 30000); // Every 30 seconds normally
      return () => clearInterval(interval);
    }
  }, [autoRefresh, data?.currentSync?.isActive, loadSyncData]);

  // Renew webhook subscription
  const renewWebhook = async () => {
    setRenewingWebhook(true);
    setError(null);

    try {
      const response = await videoApiJson(
        "/api/video-admin/sync/websub/renew",
        { method: "POST" }
      );

      if (response?.success) {
        setSuccessMessage("Webhook subscription renewed successfully");
        await loadSyncData(true);
      }
    } catch (error) {
      setError("Failed to renew webhook subscription");
    } finally {
      setRenewingWebhook(false);
      setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 5000);
    }
  };

  // Sync all playlists
  const syncAllPlaylists = async () => {
    setSyncingAll(true);
    setError(null);

    try {
      const response = await videoApiJson("/api/video-admin/sync/all", {
        method: "POST",
      });

      if (response?.success) {
        setSuccessMessage("Started syncing all playlists");
        await loadSyncData(true);
      }
    } catch (error) {
      setError("Failed to start sync all operation");
    } finally {
      setSyncingAll(false);
      setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 5000);
    }
  };

  // Stop current sync
  const stopCurrentSync = async () => {
    if (!data?.currentSync?.playlistId) return;

    setStoppingSync(true);
    setError(null);

    try {
      const response = await videoApiJson("/api/video-admin/sync/stop", {
        method: "POST",
      });

      if (response?.success) {
        setSuccessMessage("Sync operation stopped");
        await loadSyncData(true);
      }
    } catch (error) {
      setError("Failed to stop sync operation");
    } finally {
      setStoppingSync(false);
      setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 5000);
    }
  };

  // Calculate health status
  const getHealthStatus = () => {
    if (!data)
      return { status: "unknown", color: "gray", message: "Loading..." };

    const { websub, stats } = data;

    if (!websub.isActive || websub.status === "expired") {
      return {
        status: "critical",
        color: "red",
        message: "Webhook subscription expired",
      };
    }

    if (websub.expiresInHours < 24) {
      return {
        status: "warning",
        color: "yellow",
        message: `Webhook expires in ${Math.round(websub.expiresInHours)} hours`,
      };
    }

    if (stats.syncHealthScore < 50) {
      return {
        status: "warning",
        color: "yellow",
        message: "Sync health degraded",
      };
    }

    return {
      status: "healthy",
      color: "green",
      message: "All systems operational",
    };
  };

  // Filter sync history
  const filteredHistory =
    data?.recentHistory.filter((item) => {
      if (historyFilter === "all") return true;
      if (historyFilter === "success") return item.status === "success";
      if (historyFilter === "failed") return item.status === "failed";
      return true;
    }) || [];

  // Render loading state
  if (loading && !data) {
    return (
      <AdminLayout
        title="Sync Control"
        description="Manage video synchronization"
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const health = getHealthStatus();

  return (
    <>
      <Head>
        <title>Sync Control - Video Admin</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </Head>

      <AdminLayout
        title="Sync Control"
        description="Manage YouTube video synchronization"
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

        {/* Health Status Bar */}
        <div
          className={cn(
            "mb-6 p-4 rounded-lg border-2 transition-colors",
            health.color === "green" &&
              "bg-green-50 dark:bg-green-950/20 border-green-500",
            health.color === "yellow" &&
              "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500",
            health.color === "red" &&
              "bg-red-50 dark:bg-red-950/20 border-red-500",
            health.color === "gray" &&
              "bg-gray-50 dark:bg-gray-950/20 border-gray-500"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {health.status === "healthy" && (
                <Shield className="w-6 h-6 text-green-600" />
              )}
              {health.status === "warning" && (
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              )}
              {health.status === "critical" && (
                <AlertCircle className="w-6 h-6 text-red-600" />
              )}
              {health.status === "unknown" && (
                <Info className="w-6 h-6 text-gray-600" />
              )}

              <div>
                <p className="font-semibold text-foreground">
                  System Status:{" "}
                  {health.status.charAt(0).toUpperCase() +
                    health.status.slice(1)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {health.message}
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
                onClick={() => loadSyncData()}
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

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* WebSub Status */}
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              {data?.websub.isActive ? (
                <Wifi className="w-8 h-8 text-green-500" />
              ) : (
                <WifiOff className="w-8 h-8 text-red-500" />
              )}
              <span
                className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium",
                  data?.websub.isActive
                    ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                )}
              >
                {data?.websub.status || "Unknown"}
              </span>
            </div>
            <h3 className="font-semibold text-foreground mb-1">
              WebSub Status
            </h3>
            {data?.websub.expiresAt && (
              <p className="text-sm text-muted-foreground">
                Expires in {data.websub.expiresInHours.toFixed(0)} hours
              </p>
            )}
            {data?.websub.needsRenewal && (
              <Button
                onClick={renewWebhook}
                disabled={renewingWebhook}
                size="sm"
                variant="outline"
                className="mt-2 w-full text-yellow-600 border-yellow-600"
              >
                {renewingWebhook ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Renew Now
              </Button>
            )}
          </div>

          {/* Current Sync */}
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              {data?.currentSync.isActive ? (
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
              ) : (
                <RefreshCw className="w-8 h-8 text-gray-400" />
              )}
              {data?.currentSync.isActive && (
                <span className="text-sm font-medium text-blue-600">
                  {data.currentSync.progress || 0}%
                </span>
              )}
            </div>
            <h3 className="font-semibold text-foreground mb-1">Current Sync</h3>
            {data?.currentSync.isActive ? (
              <div>
                <p className="text-sm text-muted-foreground truncate">
                  {data.currentSync.playlistName || "Unknown playlist"}
                </p>
                {data.currentSync.startedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Started{" "}
                    {formatDistanceToNow(new Date(data.currentSync.startedAt), {
                      addSuffix: true,
                    })}
                  </p>
                )}
                <Button
                  onClick={stopCurrentSync}
                  disabled={stoppingSync}
                  size="sm"
                  variant="destructive"
                  className="mt-2 w-full"
                >
                  {stoppingSync ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <PauseCircle className="w-4 h-4 mr-2" />
                  )}
                  Stop Sync
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active sync</p>
            )}
          </div>

          {/* Sync Queue */}
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <Clock className="w-8 h-8 text-purple-500" />
              <span className="text-2xl font-bold text-foreground">
                {data?.queue.filter((q) => q.status === "queued").length || 0}
              </span>
            </div>
            <h3 className="font-semibold text-foreground mb-1">Queue Size</h3>
            <p className="text-sm text-muted-foreground">
              {data?.queue.length
                ? `${data.queue.length} total items`
                : "Queue empty"}
            </p>
          </div>

          {/* Sync Health */}
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <BarChart3 className="w-8 h-8 text-orange-500" />
              <span
                className={cn(
                  "text-2xl font-bold",
                  data && data.stats.syncHealthScore >= 80 && "text-green-600",
                  data &&
                    data.stats.syncHealthScore >= 50 &&
                    data.stats.syncHealthScore < 80 &&
                    "text-yellow-600",
                  data && data.stats.syncHealthScore < 50 && "text-red-600"
                )}
              >
                {data?.stats.syncHealthScore || 0}%
              </span>
            </div>
            <h3 className="font-semibold text-foreground mb-1">Sync Health</h3>
            <p className="text-sm text-muted-foreground">
              {data?.stats.successfulSyncs || 0}/{data?.stats.totalSyncs || 0}{" "}
              successful
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6 p-4 bg-card rounded-lg border border-border">
          <h3 className="font-semibold text-foreground mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={syncAllPlaylists}
              disabled={syncingAll || data?.currentSync.isActive}
              variant="outline"
              className="text-blue-600 border-blue-600"
            >
              {syncingAll ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <PlayCircle className="w-4 h-4 mr-2" />
              )}
              Sync All Playlists
            </Button>

            <Button
              onClick={renewWebhook}
              disabled={
                renewingWebhook ||
                (data?.websub.isActive && !data?.websub.needsRenewal)
              }
              variant="outline"
            >
              <Bell className="w-4 h-4 mr-2" />
              Renew Webhook
            </Button>

            <Button
              onClick={() => window.open(data?.websub.webhookUrl, "_blank")}
              variant="outline"
            >
              <Zap className="w-4 h-4 mr-2" />
              Test Webhook
            </Button>

            <Button onClick={() => setActiveTab("history")} variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              View History
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-card rounded-lg border border-border">
          <div className="border-b border-border">
            <nav className="flex">
              {[
                { id: "overview", label: "Overview", icon: Activity },
                { id: "history", label: "Sync History", icon: Clock },
                { id: "webhooks", label: "Webhook Activity", icon: Bell },
                { id: "settings", label: "Settings", icon: Settings },
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
                {/* Sync Statistics */}
                <div>
                  <h4 className="font-semibold text-foreground mb-4">
                    Sync Statistics
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Total Syncs
                      </p>
                      <p className="text-2xl font-bold">
                        {data?.stats.totalSyncs || 0}
                      </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Success Rate
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        {data?.stats.totalSyncs
                          ? Math.round(
                              (data.stats.successfulSyncs /
                                data.stats.totalSyncs) *
                                100
                            )
                          : 0}
                        %
                      </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Avg Duration
                      </p>
                      <p className="text-2xl font-bold">
                        {Math.round((data?.stats.averageDuration || 0) / 60)}m
                      </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Videos Processed
                      </p>
                      <p className="text-2xl font-bold">
                        {data?.stats.totalVideosProcessed?.toLocaleString() ||
                          0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recent Activity Timeline */}
                <div>
                  <h4 className="font-semibold text-foreground mb-4">
                    Recent Sync Activity
                  </h4>
                  <div className="space-y-3">
                    {data?.recentHistory.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                      >
                        {item.status === "success" ? (
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : item.status === "partial" ? (
                          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {item.playlistName}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span>+{item.videosAdded} added</span>
                            <span>{item.videosUpdated} updated</span>
                            <span>{item.videosRemoved} removed</span>
                            <span>
                              {Math.round(item.duration / 60)}m duration
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.timestamp), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === "history" && (
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    {["all", "success", "failed"].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setHistoryFilter(filter as any)}
                        className={cn(
                          "px-3 py-1.5 text-sm transition-colors capitalize",
                          historyFilter === filter
                            ? "bg-primary text-primary-foreground"
                            : "bg-card hover:bg-accent"
                        )}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>

                  <div className="flex rounded-lg border border-border overflow-hidden ml-auto">
                    {["24h", "7d", "30d"].map((range) => (
                      <button
                        key={range}
                        onClick={() => setDateRange(range as any)}
                        className={cn(
                          "px-3 py-1.5 text-sm transition-colors",
                          dateRange === range
                            ? "bg-primary text-primary-foreground"
                            : "bg-card hover:bg-accent"
                        )}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>

                {/* History List */}
                <div className="space-y-2">
                  {filteredHistory.length > 0 ? (
                    filteredHistory.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        {item.status === "success" ? (
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : item.status === "partial" ? (
                          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        )}

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{item.playlistName}</p>
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-xs",
                                item.status === "success" &&
                                  "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
                                item.status === "failed" &&
                                  "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
                                item.status === "partial" &&
                                  "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400"
                              )}
                            >
                              {item.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />+
                              {item.videosAdded}
                            </span>
                            <span className="flex items-center gap-1">
                              <RefreshCw className="w-3 h-3" />
                              {item.videosUpdated}
                            </span>
                            {item.videosRemoved > 0 && (
                              <span className="flex items-center gap-1">
                                <TrendingDown className="w-3 h-3" />-
                                {item.videosRemoved}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {Math.round(item.duration / 60)}m
                            </span>
                          </div>

                          {item.error && (
                            <p className="text-xs text-red-600 mt-1">
                              {item.error}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(item.timestamp), "MMM dd, HH:mm")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(item.timestamp), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p>No sync history found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Webhooks Tab */}
            {activeTab === "webhooks" && (
              <div className="space-y-4">
                {/* Webhook Info */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">
                    Webhook Configuration
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Webhook URL:
                      </span>
                      <code className="px-2 py-1 bg-card rounded text-xs">
                        {data?.websub.webhookUrl}
                      </code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Channel ID:</span>
                      <code className="px-2 py-1 bg-card rounded text-xs">
                        {data?.websub.channelId}
                      </code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Last Renewal:
                      </span>
                      <span>
                        {data?.websub.lastRenewal
                          ? formatDistanceToNow(
                              new Date(data.websub.lastRenewal),
                              { addSuffix: true }
                            )
                          : "Never"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Renewals:</span>
                      <span>{data?.websub.renewalCount || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Recent Webhook Activity */}
                <div>
                  <h4 className="font-semibold text-foreground mb-3">
                    Recent Webhook Activity
                  </h4>
                  <div className="space-y-2">
                    {data?.webhookActivity &&
                    data.webhookActivity.length > 0 ? (
                      data.webhookActivity.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg"
                        >
                          {activity.status === "success" ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {activity.type === "video_update" &&
                                  "Video Update"}
                                {activity.type === "channel_update" &&
                                  "Channel Update"}
                                {activity.type === "subscription_verify" &&
                                  "Subscription Verify"}
                              </span>
                              {activity.videoTitle && (
                                <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                                  {activity.videoTitle}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span>{activity.responseTime}ms</span>
                              {activity.videoId && (
                                <span>ID: {activity.videoId}</span>
                              )}
                            </div>
                          </div>

                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.timestamp), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Bell className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>No recent webhook activity</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-foreground mb-4">
                    Sync Configuration
                  </h4>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">Auto-sync</p>
                        <p className="text-sm text-muted-foreground">
                          Automatically sync playlists on webhook events
                        </p>
                      </div>
                      <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary">
                        <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-6" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">Sync Strategy</p>
                        <p className="text-sm text-muted-foreground">
                          Choose between full or incremental sync
                        </p>
                      </div>
                      <select className="px-3 py-1 bg-card border border-border rounded-lg">
                        <option>Incremental</option>
                        <option>Full</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">Max Concurrent Syncs</p>
                        <p className="text-sm text-muted-foreground">
                          Number of playlists to sync simultaneously
                        </p>
                      </div>
                      <select className="px-3 py-1 bg-card border border-border rounded-lg">
                        <option>1</option>
                        <option>2</option>
                        <option>3</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">Rate Limiting</p>
                        <p className="text-sm text-muted-foreground">
                          Delay between API requests (milliseconds)
                        </p>
                      </div>
                      <input
                        type="number"
                        defaultValue={100}
                        min={0}
                        max={5000}
                        step={100}
                        className="w-20 px-2 py-1 bg-card border border-border rounded-lg text-right"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <Button variant="outline" className="mr-2">
                    Export Sync Logs
                  </Button>
                  <Button variant="outline">Clear History</Button>
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
