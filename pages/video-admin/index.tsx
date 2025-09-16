// pages/video-admin/index.tsx
import { GetServerSideProps } from "next";
import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { formatDistanceToNow, subDays, format } from "date-fns";
import {
  Variants,
  MotionConfig,
  useReducedMotion,
  LazyMotion,
  domAnimation,
  m,
} from "framer-motion";
import CountUp from "react-countup";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

import { withAdminPageSSR } from "@/lib/adminAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import { videoApiJson } from "@/lib/videoApi";

// React Icons imports
import { AiOutlineWarning } from "react-icons/ai";
import {
  MdRefresh,
  MdStorage,
  MdList,
  MdSettings,
  MdTrendingUp,
  MdTrendingDown,
} from "react-icons/md";
import {
  FiActivity,
  FiVideo,
  FiClock,
  FiWifiOff,
  FiZap,
  FiAlertCircle,
  FiTrendingUp as FiTrending,
} from "react-icons/fi";

// TypeScript interfaces
interface PageProps {
  requiresAuth?: boolean;
  unauthorized?: boolean;
  userEmail?: string;
  traceId?: string;
  enableOneTap?: boolean;
  session?: any;
}

interface VideoUploadData {
  date: string;
  day: string;
  videos: number;
  lastWeek: number;
}

interface DashboardStats {
  videos: {
    total: number;
    lastAdded: string | null;
    trending: number;
    newToday: number;
    thisWeek?: number;
    lastWeek?: number;
    uploadHistory?: VideoUploadData[];
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

// Animation Variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const cardVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

// Custom Tooltip for Chart
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium">{label}</p>
        <div className="space-y-1 mt-2">
          <p className="text-sm">
            <span className="text-muted-foreground">This Week:</span>{" "}
            <span className="font-semibold text-primary">
              {payload[0].value} videos
            </span>
          </p>
          {payload[1] && (
            <p className="text-sm">
              <span className="text-muted-foreground">Last Week:</span>{" "}
              <span className="font-medium">{payload[1].value} videos</span>
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

// Week Comparison Component
function WeekComparison({
  thisWeek = 0,
  lastWeek = 0,
}: {
  thisWeek: number;
  lastWeek: number;
}) {
  const percentChange =
    lastWeek > 0
      ? ((thisWeek - lastWeek) / lastWeek) * 100
      : thisWeek > 0
        ? 100
        : 0;
  const isIncrease = thisWeek >= lastWeek;
  const shouldReduceMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-lg border border-border p-4"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Weekly Comparison
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">This Week</span>
                <span className="text-lg font-semibold">{thisWeek}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Week</span>
                <span className="text-sm font-medium">{lastWeek}</span>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "flex flex-col items-center justify-center ml-4 px-3 py-2 rounded-lg",
              isIncrease ? "bg-green-500/10" : "bg-red-500/10"
            )}
          >
            {isIncrease ? (
              <MdTrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            ) : (
              <MdTrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
            )}
            <span
              className={cn(
                "text-sm font-bold mt-1",
                isIncrease
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {percentChange > 0 ? "+" : ""}
              {percentChange.toFixed(0)}%
            </span>
          </div>
        </div>
      </m.div>
    </LazyMotion>
  );
}

// Video Upload Graph Component
function VideoUploadGraph({ data }: { data: VideoUploadData[] }) {
  const shouldReduceMotion = useReducedMotion();
  const [chartType, setChartType] = useState<"area" | "bar">("area");

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-lg border border-border p-4"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold">
              Video Uploads - Last 7 Days
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Daily upload activity
            </p>
          </div>
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setChartType("area")}
              className={cn(
                "px-2 py-1 text-xs rounded transition-colors",
                chartType === "area"
                  ? "bg-background shadow-sm"
                  : "hover:bg-background/50"
              )}
            >
              Area
            </button>
            <button
              onClick={() => setChartType("bar")}
              className={cn(
                "px-2 py-1 text-xs rounded transition-colors",
                chartType === "bar"
                  ? "bg-background shadow-sm"
                  : "hover:bg-background/50"
              )}
            >
              Bar
            </button>
          </div>
        </div>

        <div className="h-48 md:h-64 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "area" ? (
              <AreaChart
                data={data}
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
                <defs>
                  <linearGradient
                    id="colorThisWeek"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="colorLastWeek"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="lastWeek"
                  stroke="#94a3b8"
                  fill="url(#colorLastWeek)"
                  strokeWidth={1.5}
                  name="Last Week"
                />
                <Area
                  type="monotone"
                  dataKey="videos"
                  stroke="#3b82f6"
                  fill="url(#colorThisWeek)"
                  strokeWidth={2}
                  name="This Week"
                />
              </AreaChart>
            ) : (
              <BarChart
                data={data}
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="lastWeek" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="videos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-center gap-4 mt-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span className="text-xs text-muted-foreground">This Week</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-slate-400 rounded-full" />
            <span className="text-xs text-muted-foreground">Last Week</span>
          </div>
        </div>
      </m.div>
    </LazyMotion>
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
  const [lastManualRefreshAt, setLastManualRefreshAt] = useState<Date | null>(
    null
  );

  // For retry display
  const retryCountRef = useRef(0);
  const [retryCountView, setRetryCountView] = useState(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const refreshIntervalRef = useRef<NodeJS.Timeout>();
  const abortRef = useRef<AbortController>();

  // Generate upload data from API response
  const uploadData = useMemo(() => {
    // Use real data from API
    if (stats?.videos?.uploadHistory && stats.videos.uploadHistory.length > 0) {
      return stats.videos.uploadHistory;
    }

    // Return empty array if no data yet (during loading)
    return [];
  }, [stats]);

  // Calculate auto-refresh interval
  const autoRefreshInterval = useMemo(() => {
    return isUserActive ? 2 * 60 * 1000 : 5 * 60 * 1000;
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
                Date.now() - parsed.timestamp < 10 * 60 * 1000
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
          // Log the API response in development
          if (process.env.NODE_ENV === "development") {
            console.log("Dashboard API Response:", {
              thisWeek: response.data.videos.thisWeek,
              lastWeek: response.data.videos.lastWeek,
              uploadHistory: response.data.videos.uploadHistory,
              trending: response.data.videos.trending,
              newToday: response.data.videos.newToday,
            });
          }

          // Set stats directly from API - NO MOCKING!
          setStats(response.data);
          setLastUpdated(new Date());
          setError(null);
          retryCountRef.current = 0;
          setRetryCountView(0);
          setIsOffline(false);

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
          setError(
            `Failed to load dashboard statistics. Retry attempt: ${retryCountRef.current + 1}/3`
          );

          if (retryCountRef.current < 3) {
            const retryDelay = Math.min(
              1000 * Math.pow(2, retryCountRef.current),
              10000
            );
            retryTimeoutRef.current = setTimeout(() => {
              retryCountRef.current++;
              setRetryCountView(retryCountRef.current);
              loadDashboardStats(true, true);
            }, retryDelay);
          } else {
            setError(
              "Failed to load dashboard statistics. Please refresh the page or contact support."
            );
          }
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // Manual refresh handler
  const handleRefresh = useCallback(() => {
    setLastManualRefreshAt(new Date());
    retryCountRef.current = 0;
    setRetryCountView(0);
    loadDashboardStats(true);
  }, [loadDashboardStats]);

  // Initial load
  useEffect(() => {
    loadDashboardStats();
  }, []);

  // Auto refresh setup
  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      loadDashboardStats(true);
    }, autoRefreshInterval);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefreshInterval, loadDashboardStats]);

  // User activity detection
  useEffect(() => {
    let activityTimeout: NodeJS.Timeout;

    const handleActivity = () => {
      setIsUserActive(true);
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(
        () => {
          setIsUserActive(false);
        },
        10 * 60 * 1000
      );
    };

    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    handleActivity();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      clearTimeout(activityTimeout);
    };
  }, []);

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (error?.includes("offline")) {
        loadDashboardStats(true);
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

  // Require auth check
  if (requiresAuth && !currentSession) {
    return null;
  }

  // Loading state
  if (loading && !stats) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Error state
  if (error && !stats) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            <FiAlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Unable to load dashboard</p>
            <p className="text-muted-foreground mb-4">{error}</p>
            {retryCountView > 0 && retryCountView < 3 && (
              <p className="text-sm text-muted-foreground mb-4">
                Retry attempt: {retryCountView}/3
              </p>
            )}
            <button
              onClick={handleRefresh}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-2 py-1 mx-auto"
              aria-busy={refreshing}
              aria-live="polite"
            >
              <MdRefresh className="w-3 h-3" />
              Try Again
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Main dashboard view
  return (
    <>
      <Head>
        <title>Dashboard - Video Admin</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </Head>

      <AdminLayout
        title="Dashboard"
        description="Video management overview"
        isRefreshing={refreshing}
        onRefresh={handleRefresh}
      >
        <LazyMotion features={domAnimation}>
          <MotionConfig reducedMotion="user">
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4 md:space-y-6"
            >
              {/* Status bar - Mobile optimized */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div className="flex items-center gap-3 overflow-x-auto pb-2 sm:pb-0">
                  {lastUpdated && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full whitespace-nowrap">
                      <FiClock className="w-3 h-3" />
                      Updated{" "}
                      {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                    </div>
                  )}

                  {isUserActive ? (
                    <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full whitespace-nowrap">
                      <FiZap className="w-3 h-3" />
                      Active Mode
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full whitespace-nowrap">
                      <FiActivity className="w-3 h-3" />
                      Idle Mode
                    </div>
                  )}

                  {isOffline && (
                    <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-500/10 px-3 py-1.5 rounded-full whitespace-nowrap">
                      <FiWifiOff className="w-3 h-3" />
                      Offline
                    </div>
                  )}
                </div>
              </div>

              {/* Error Alert */}
              {error && stats && (
                <m.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3"
                >
                  <div className="flex items-start gap-2">
                    <AiOutlineWarning className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-amber-900 dark:text-amber-200">
                        {error}
                      </p>
                      {retryCountView > 0 && retryCountView < 3 && (
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                          Retry attempt: {retryCountView}/3
                        </p>
                      )}
                    </div>
                  </div>
                </m.div>
              )}

              {/* 7-Day Graph and Week Comparison with Hot/New metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  {uploadData.length > 0 ? (
                    <VideoUploadGraph data={uploadData} />
                  ) : (
                    <div className="bg-card rounded-lg border border-border p-8 flex items-center justify-center h-64">
                      <p className="text-muted-foreground">
                        No upload data available
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <WeekComparison
                    thisWeek={stats?.videos?.thisWeek || 0}
                    lastWeek={stats?.videos?.lastWeek || 0}
                  />

                  {/* Hot/Trending and New Today Cards - Using Real API Data */}
                  <div className="grid grid-cols-2 gap-3">
                    <m.div
                      initial={
                        shouldReduceMotion ? {} : { opacity: 0, scale: 0.95 }
                      }
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <FiTrending className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                          HOT
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        <CountUp
                          end={stats?.videos.trending || 0}
                          duration={shouldReduceMotion ? 0 : 1.5}
                        />
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Trending
                      </p>
                    </m.div>

                    <m.div
                      initial={
                        shouldReduceMotion ? {} : { opacity: 0, scale: 0.95 }
                      }
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <FiZap className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-medium text-green-700 dark:text-green-300">
                          NEW
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        <CountUp
                          end={stats?.videos.newToday || 0}
                          duration={shouldReduceMotion ? 0 : 1.5}
                        />
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Today
                      </p>
                    </m.div>
                  </div>
                </div>
              </div>

              {/* Key Metrics - Responsive grid */}
              <m.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              >
                {/* Total Videos */}
                <m.div
                  variants={shouldReduceMotion ? {} : cardVariants}
                  className="bg-card rounded-lg border border-border p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Videos
                    </p>
                    <FiVideo className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">
                    <CountUp
                      end={stats?.videos.total || 0}
                      duration={shouldReduceMotion ? 0 : 1.5}
                      separator=","
                    />
                  </p>
                  {stats?.videos.newToday !== undefined && (
                    <p className="text-xs text-muted-foreground mt-2">
                      +{stats.videos.newToday} today
                    </p>
                  )}
                </m.div>

                {/* Active Playlists */}
                <m.div
                  variants={shouldReduceMotion ? {} : cardVariants}
                  className="bg-card rounded-lg border border-border p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Active Playlists
                    </p>
                    <MdList className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">
                    <CountUp
                      end={stats?.playlists.active || 0}
                      duration={shouldReduceMotion ? 0 : 1.5}
                    />
                    <span className="text-lg text-muted-foreground">
                      /{stats?.playlists.total || 0}
                    </span>
                  </p>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <m.div
                      className="h-full bg-green-600"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${
                          stats?.playlists.total
                            ? (stats.playlists.active / stats.playlists.total) *
                              100
                            : 0
                        }%`,
                      }}
                      transition={
                        shouldReduceMotion ? {} : { duration: 1, delay: 0.5 }
                      }
                    />
                  </div>
                </m.div>

                {/* Sync Status */}
                <m.div
                  variants={shouldReduceMotion ? {} : cardVariants}
                  className="bg-card rounded-lg border border-border p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Sync Status
                    </p>
                    <FiActivity className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p
                    className={cn(
                      "text-lg font-semibold",
                      stats?.sync.currentlySyncing &&
                        "text-blue-600 dark:text-blue-400"
                    )}
                  >
                    {stats?.sync.currentlySyncing
                      ? "Syncing"
                      : stats?.sync.status || "Unknown"}
                  </p>
                  {stats?.sync.lastSync && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(stats.sync.lastSync), {
                        addSuffix: true,
                      })}
                    </p>
                  )}
                </m.div>

                {/* CDN Hit Rate */}
                <m.div
                  variants={shouldReduceMotion ? {} : cardVariants}
                  className="bg-card rounded-lg border border-border p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      CDN Hit Rate
                    </p>
                    <MdStorage className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">
                    {stats?.cache.cdnHitRate || 0}%
                  </p>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <m.div
                      className={cn(
                        "h-full",
                        (stats?.cache.cdnHitRate || 0) >= 80
                          ? "bg-green-600"
                          : (stats?.cache.cdnHitRate || 0) >= 60
                            ? "bg-amber-600"
                            : "bg-red-600"
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${stats?.cache.cdnHitRate || 0}%` }}
                      transition={
                        shouldReduceMotion ? {} : { duration: 1, delay: 0.5 }
                      }
                    />
                  </div>
                </m.div>
              </m.div>

              {/* Quick Actions - Mobile optimized 2x2 grid on small screens */}
              <div>
                <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    {
                      href: "/video-admin/configuration",
                      icon: MdSettings,
                      label: "Settings",
                      color: "text-blue-600",
                    },
                    {
                      href: "/video-admin/playlists",
                      icon: MdList,
                      label: "Playlists",
                      color: "text-green-600",
                    },
                    {
                      href: "/video-admin/sync",
                      icon: MdRefresh,
                      label: "Sync",
                      color: "text-purple-600",
                    },
                    {
                      href: "/video-admin/cache",
                      icon: MdStorage,
                      label: "Cache",
                      color: "text-amber-600",
                    },
                  ].map((action) => {
                    const Icon = action.icon;
                    return (
                      <Link
                        key={action.href}
                        href={action.href}
                        className={cn(
                          "group flex flex-col items-center justify-center p-4 rounded-lg border border-border",
                          "hover:bg-muted/50 hover:border-primary/50 transition-all",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        )}
                      >
                        <Icon className={cn("w-8 h-8 mb-2", action.color)} />
                        <span className="text-sm font-medium">
                          {action.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Recent Activity - Mobile optimized */}
              {stats?.recentActivity && stats.recentActivity.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3">
                    Recent Activity
                  </h2>
                  <div className="bg-card rounded-lg border border-border">
                    <div className="divide-y divide-border">
                      {stats.recentActivity
                        .slice(0, 5)
                        .map((activity, index) => (
                          <m.div
                            key={activity.id}
                            initial={
                              shouldReduceMotion ? {} : { opacity: 0, x: -20 }
                            }
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-3 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {activity.action}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {activity.entityType} • {activity.userId}
                                </p>
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatDistanceToNow(
                                  new Date(activity.timestamp),
                                  {
                                    addSuffix: true,
                                  }
                                )}
                              </span>
                            </div>
                          </m.div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </m.div>
          </MotionConfig>
        </LazyMotion>
      </AdminLayout>
    </>
  );
}

// Server-side props
export const getServerSideProps: GetServerSideProps = withAdminPageSSR(
  async (context) => {
    return {
      props: {
        requiresAuth: true,
        traceId: context.query.traceId || null,
      },
    };
  }
);
