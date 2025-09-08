import { GetServerSideProps } from "next";
import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { formatDistanceToNow } from "date-fns";
import {
  motion,
  AnimatePresence,
  Variants,
  MotionConfig,
  useReducedMotion,
  useInView,
} from "framer-motion";
import CountUp from "react-countup";
import { cn } from "@/lib/utils";

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
} from "react-icons/md";
import {
  FiActivity,
  FiVideo,
  FiClock,
  FiMail,
  FiWifiOff,
  FiInfo,
  FiChevronRight,
  FiZap,
  FiAlertCircle,
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

// Static configuration - moved outside component
const QUICK_ACTIONS = [
  {
    href: "/video-admin/configuration",
    icon: MdSettings,
    label: "Configuration",
    description: "Manage settings",
  },
  {
    href: "/video-admin/playlists",
    icon: MdList,
    label: "Playlists",
    description: "Organize videos",
  },
  {
    href: "/video-admin/sync",
    icon: MdRefresh,
    label: "Sync Control",
    description: "YouTube sync",
  },
  {
    href: "/video-admin/cache",
    icon: MdStorage,
    label: "Cache",
    description: "Optimize storage",
  },
];

// Animation Variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
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

const activityItemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 100,
    },
  },
};

// Safe progress bar color variants - no dynamic Tailwind classes
const PROGRESS_VARIANTS = {
  success: "bg-green-600",
  info: "bg-blue-600",
  warning: "bg-orange-600",
  danger: "bg-red-600",
} as const;

// Components

function AnimatedProgressBar({
  value,
  variant = "success",
  height = 4,
}: {
  value: number;
  variant?: keyof typeof PROGRESS_VARIANTS;
  height?: number;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className="w-full bg-muted rounded-full overflow-hidden"
      style={{ height }}
    >
      <motion.div
        className={cn("h-full", PROGRESS_VARIANTS[variant])}
        initial={{ width: shouldReduceMotion ? `${value}%` : 0 }}
        animate={{ width: `${value}%` }}
        transition={
          shouldReduceMotion
            ? {}
            : {
                duration: 1.2,
                ease: "easeOut",
                delay: 0.2,
              }
        }
      />
    </div>
  );
}

function AnimatedNumber({
  value,
  duration = 2,
  prefix = "",
  suffix = "",
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const shouldReduceMotion = useReducedMotion();

  return (
    <span ref={ref} className="text-2xl font-bold text-foreground">
      {prefix}
      {inView ? (
        <CountUp
          start={0}
          end={value}
          duration={shouldReduceMotion ? 0 : duration}
          separator=","
          decimals={0}
        />
      ) : (
        "0"
      )}
      {suffix}
    </span>
  );
}

function PulseDot({ status }: { status: "active" | "inactive" | "syncing" }) {
  const shouldReduceMotion = useReducedMotion();
  const colors = {
    active: "bg-green-500",
    inactive: "bg-gray-400",
    syncing: "bg-blue-500",
  };

  if (shouldReduceMotion) {
    return <div className={cn("w-2 h-2 rounded-full", colors[status])} />;
  }

  return (
    <div className="relative">
      <div className={cn("w-2 h-2 rounded-full", colors[status])} />
      {status === "active" && !shouldReduceMotion && (
        <div
          className={cn(
            "absolute inset-0 w-2 h-2 rounded-full animate-ping",
            colors[status]
          )}
        />
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
        <div className="h-10 w-32 bg-muted rounded-lg animate-pulse" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-card rounded-lg border border-border p-4 animate-pulse"
          >
            <div className="h-4 w-24 bg-muted rounded mb-2" />
            <div className="h-8 w-32 bg-muted rounded" />
            <div className="h-3 w-20 bg-muted rounded mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Custom hooks

function useActivityDetection(timeout = 5 * 60 * 1000) {
  const [isActive, setIsActive] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsActive(true);
    timeoutRef.current = setTimeout(() => {
      setIsActive(false);
    }, timeout);
  }, [timeout]);

  useEffect(() => {
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
    ];

    events.forEach((event) => {
      document.addEventListener(event, resetTimeout, true);
    });

    resetTimeout();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimeout, true);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetTimeout]);

  return isActive;
}

// Main component

export default function VideoAdminDashboard({
  requiresAuth,
  unauthorized,
  userEmail,
  session: serverSession,
}: PageProps) {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const currentSession = session || serverSession;
  const shouldReduceMotion = useReducedMotion();

  // State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [lastManualRefreshAt, setLastManualRefreshAt] = useState(0);
  const [refreshRotation, setRefreshRotation] = useState(0);

  // Refs
  const abortRef = useRef<AbortController | null>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const retryCountRef = useRef(0);

  // Hooks
  const isUserActive = useActivityDetection();

  // Calculate dynamic refresh interval
  const getRefreshInterval = useCallback(() => {
    // 30 seconds after manual refresh, then 2 min active / 5 min idle
    if (lastManualRefreshAt > 0 && Date.now() - lastManualRefreshAt < 30000) {
      return 30000;
    }
    return isUserActive ? 2 * 60 * 1000 : 5 * 60 * 1000;
  }, [isUserActive, lastManualRefreshAt]);

  // Load dashboard stats
  const loadDashboardStats = useCallback(
    async (silent = false, isRetry = false) => {
      // Cancel any in-flight requests
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
          setStats(response.data);
          setLastUpdated(new Date());
          setError(null);
          retryCountRef.current = 0;
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
          setError("Failed to load dashboard statistics. Retrying...");

          if (retryCountRef.current < 3) {
            const retryDelay = Math.min(
              1000 * Math.pow(2, retryCountRef.current),
              10000
            );
            retryTimeoutRef.current = setTimeout(() => {
              retryCountRef.current++;
              loadDashboardStats(true, true);
            }, retryDelay);
          } else {
            setError(
              "Failed to load dashboard statistics. Please refresh the page or contact support."
            );
          }
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // Handle manual refresh with 180° rotation
  const handleRefresh = useCallback(() => {
    setRefreshRotation((prev) => prev + 180);
    setLastManualRefreshAt(Date.now());
    loadDashboardStats();

    // Re-arm the interval with new timing
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Use 30 seconds for immediate interval after manual refresh
    refreshIntervalRef.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadDashboardStats(true);
      }
    }, 30000);
  }, [loadDashboardStats]);

  // Set up auto-refresh with visibility handling
  useEffect(() => {
    if (!currentSession) return;

    const setupRefresh = () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      if (document.visibilityState === "visible") {
        const interval = getRefreshInterval();
        refreshIntervalRef.current = setInterval(() => {
          if (document.visibilityState === "visible") {
            loadDashboardStats(true);
          }
        }, interval);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadDashboardStats(true);
        setupRefresh();
      } else {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      }
    };

    // Initial load
    loadDashboardStats();
    setupRefresh();

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      abortRef.current?.abort();
    };
  }, [
    currentSession,
    getRefreshInterval,
    loadDashboardStats,
    lastManualRefreshAt,
  ]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      loadDashboardStats(true);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setError(
        "Connection lost. Data will refresh when connection is restored."
      );
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loadDashboardStats]);

  // Handle authentication
  useEffect(() => {
    if (requiresAuth && sessionStatus === "loading") {
      return;
    }

    if (
      requiresAuth &&
      !currentSession &&
      sessionStatus === "unauthenticated"
    ) {
      router.replace("/video-admin/login");
    }
  }, [requiresAuth, currentSession, sessionStatus, router]);

  // Show nothing while redirecting
  if (requiresAuth && !currentSession) {
    return null;
  }

  // Unauthorized state
  if (
    unauthorized ||
    (currentSession?.user?.email &&
      !currentSession.user.email.endsWith("@freemalaysiatoday.com"))
  ) {
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
                <AiOutlineWarning className="w-16 h-16 text-red-600 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-foreground">
                  Access Denied
                </h1>
                <p className="text-muted-foreground mt-2 mb-4">
                  Your account{" "}
                  <span className="font-semibold">
                    ({userEmail || currentSession?.user?.email})
                  </span>{" "}
                  is not authorized to access this portal.
                </p>
                <div className="bg-muted/50 rounded-lg p-4 text-left">
                  <p className="text-sm font-medium mb-2">Requirements:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Must use @freemalaysiatoday.com email address</li>
                    <li>• Must be granted admin access</li>
                  </ul>
                </div>
              </div>

              <div className="border-t border-border pt-6 mt-6">
                <div className="text-center">
                  <p className="text-sm font-medium mb-3">Need Access?</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Contact the administrators:
                  </p>
                  <div className="space-y-2">
                    <a
                      href="mailto:mohit@freemalaysiatoday.com"
                      className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-2 py-1"
                    >
                      <FiMail className="w-3 h-3" />
                      mohit@freemalaysiatoday.com
                    </a>
                    <a
                      href="mailto:afiq@freemalaysiatoday.com"
                      className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-2 py-1"
                    >
                      <FiMail className="w-3 h-3" />
                      afiq@freemalaysiatoday.com
                    </a>
                    <p className="text-xs text-muted-foreground pt-2">
                      Or contact the Technical Department
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Loading state
  if (loading && !stats) {
    return (
      <AdminLayout title="Dashboard">
        <LoadingSkeleton />
      </AdminLayout>
    );
  }

  // Error state
  if (error && !stats) {
    return (
      <AdminLayout title="Dashboard">
        <div
          className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <AiOutlineWarning className="w-5 h-5 text-red-600" />
            <p className="text-sm font-medium text-red-900 dark:text-red-100">
              {error}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-2 py-1"
          >
            <MdRefresh className="w-3 h-3" />
            Try Again
          </button>
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

      <AdminLayout title="Dashboard">
        <MotionConfig reducedMotion="user">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Status bar */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                {lastUpdated && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                    <FiClock className="w-3 h-3" />
                    Updated{" "}
                    {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                  </div>
                )}

                {isUserActive ? (
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-3 py-1.5 rounded-full">
                    <FiZap className="w-3 h-3" />
                    <span>Active</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                    <FiInfo className="w-3 h-3" />
                    <span>Idle</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isOffline && (
                  <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 px-3 py-1 rounded-full">
                    <FiWifiOff className="w-3 h-3" />
                    Offline
                  </div>
                )}

                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Refresh dashboard data"
                >
                  <motion.span
                    animate={{ rotate: refreshRotation }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="inline-flex"
                  >
                    <MdRefresh className="w-4 h-4" />
                  </motion.span>
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>

            {/* Offline/Error Banner */}
            <AnimatePresence>
              {(isOffline || error) && stats && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 overflow-hidden"
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex items-center gap-2">
                    <FiAlertCircle className="w-4 h-4 text-yellow-600" />
                    <p className="text-sm text-yellow-900 dark:text-yellow-100">
                      {isOffline
                        ? "You're offline. Showing cached data."
                        : error}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Video Stats Cards */}
            <motion.div
              variants={shouldReduceMotion ? {} : containerVariants}
              initial={shouldReduceMotion ? undefined : "hidden"}
              animate={shouldReduceMotion ? undefined : "visible"}
              className="grid grid-cols-1 md:grid-cols-4 gap-4"
            >
              <motion.div
                variants={shouldReduceMotion ? {} : cardVariants}
                className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Videos
                  </p>
                  <FiVideo className="w-4 h-4 text-muted-foreground" />
                </div>
                <AnimatedNumber value={stats?.videos.total || 0} />
                {stats?.videos.lastAdded && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last:{" "}
                    {formatDistanceToNow(new Date(stats.videos.lastAdded), {
                      addSuffix: true,
                    })}
                  </p>
                )}
              </motion.div>

              <motion.div
                variants={shouldReduceMotion ? {} : cardVariants}
                className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    New Today
                  </p>
                  <FiClock className="w-4 h-4 text-muted-foreground" />
                </div>
                <AnimatedNumber value={stats?.videos.newToday || 0} />
                <div className="text-xs text-muted-foreground mt-1">
                  Last 24 hours
                </div>
              </motion.div>

              <motion.div
                variants={shouldReduceMotion ? {} : cardVariants}
                className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Trending
                  </p>
                  <MdTrendingUp className="w-4 h-4 text-red-500" />
                </div>
                <AnimatedNumber value={stats?.videos.trending || 0} />
                <div className="text-xs text-muted-foreground mt-1">
                  Hot & trending
                </div>
              </motion.div>

              <motion.div
                variants={shouldReduceMotion ? {} : cardVariants}
                className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Playlists
                  </p>
                  <MdList className="w-4 h-4 text-muted-foreground" />
                </div>
                <AnimatedNumber value={stats?.playlists.total || 0} />
                <div className="text-xs text-muted-foreground mt-1">
                  {stats?.playlists.active || 0} active
                </div>
              </motion.div>
            </motion.div>

            {/* System Status Cards */}
            <motion.div
              variants={shouldReduceMotion ? {} : containerVariants}
              initial={shouldReduceMotion ? undefined : "hidden"}
              animate={shouldReduceMotion ? undefined : "visible"}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              <motion.div
                variants={shouldReduceMotion ? {} : cardVariants}
                className="bg-card rounded-lg border border-border p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Sync Status
                  </p>
                  <div className="flex items-center gap-2">
                    <PulseDot status={stats?.sync.status || "inactive"} />
                    <MdRefresh
                      className={cn(
                        "w-4 h-4",
                        stats?.sync.currentlySyncing &&
                          !shouldReduceMotion &&
                          "animate-spin text-blue-600",
                        stats?.sync.status === "active" && "text-green-600",
                        stats?.sync.status === "inactive" && "text-gray-400"
                      )}
                    />
                  </div>
                </div>
                <p className="text-lg font-semibold capitalize">
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
              </motion.div>

              <motion.div
                variants={shouldReduceMotion ? {} : cardVariants}
                className="bg-card rounded-lg border border-border p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    CDN Hit Rate
                  </p>
                  <MdStorage className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-lg font-semibold">
                  {stats?.cache.cdnHitRate || 0}%
                </p>
                <div className="mt-2">
                  <AnimatedProgressBar
                    value={stats?.cache.cdnHitRate || 0}
                    variant="success"
                  />
                </div>
              </motion.div>

              <motion.div
                variants={shouldReduceMotion ? {} : cardVariants}
                className="bg-card rounded-lg border border-border p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    LRU Cache
                  </p>
                  <MdStorage className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-lg font-semibold">
                  {stats?.cache.lruUsage || 0}%
                </p>
                <div className="mt-2">
                  <AnimatedProgressBar
                    value={stats?.cache.lruUsage || 0}
                    variant={
                      (stats?.cache.lruUsage || 0) > 80 ? "warning" : "info"
                    }
                  />
                </div>
              </motion.div>

              <motion.div
                variants={shouldReduceMotion ? {} : cardVariants}
                className="bg-card rounded-lg border border-border p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Next Sync
                  </p>
                  <FiClock className="w-4 h-4 text-muted-foreground" />
                </div>
                {stats?.sync.nextSync ? (
                  <p className="text-sm">
                    {formatDistanceToNow(new Date(stats.sync.nextSync), {
                      addSuffix: true,
                    })}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Not scheduled</p>
                )}
              </motion.div>
            </motion.div>

            {/* Quick Actions - Using proper Link components */}
            <motion.div
              variants={shouldReduceMotion ? {} : containerVariants}
              initial={shouldReduceMotion ? undefined : "hidden"}
              animate={shouldReduceMotion ? undefined : "visible"}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              {QUICK_ACTIONS.map((item) => (
                <motion.div
                  key={item.href}
                  variants={shouldReduceMotion ? {} : cardVariants}
                  whileHover={shouldReduceMotion ? {} : { y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    href={item.href}
                    className="block bg-card rounded-lg border border-border p-4 transition-all text-left group hover:border-primary/20 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Navigate to ${item.label}`}
                    prefetch
                  >
                    <div className="flex items-start justify-between mb-2">
                      <item.icon className="w-6 h-6 text-primary/70 group-hover:text-primary transition-colors" />
                      <FiChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                      {item.label}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.description}
                    </p>
                  </Link>
                </motion.div>
              ))}
            </motion.div>

            {/* Recent Activity */}
            <AnimatePresence>
              {stats?.recentActivity && stats.recentActivity.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-card rounded-lg border border-border p-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <FiActivity className="w-5 h-5" />
                      Recent Activity
                    </h3>
                  </div>
                  <motion.div
                    className="space-y-3"
                    variants={shouldReduceMotion ? {} : containerVariants}
                    initial={shouldReduceMotion ? undefined : "hidden"}
                    animate={shouldReduceMotion ? undefined : "visible"}
                  >
                    {stats.recentActivity.map((activity, index) => {
                      // Determine status based on activity age
                      const activityAge =
                        Date.now() - new Date(activity.timestamp).getTime();
                      const activityStatus =
                        activityAge < 5 * 60 * 1000
                          ? "active"
                          : activityAge < 30 * 60 * 1000
                            ? "syncing"
                            : "inactive";

                      return (
                        <motion.div
                          key={activity.id}
                          variants={
                            shouldReduceMotion ? {} : activityItemVariants
                          }
                          custom={index}
                          className="flex items-center justify-between py-2 border-b border-border last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <PulseDot status={activityStatus} />
                            <div>
                              <p className="text-sm font-medium">
                                {activity.action}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {activity.entityType} • {activity.userId}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.timestamp), {
                              addSuffix: true,
                            })}
                          </p>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Auto-refresh status */}
            <div
              className="text-xs text-center text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              Auto-refresh:{" "}
              {isUserActive
                ? "Every 2 minutes (active)"
                : "Every 5 minutes (idle)"}
              {retryCountRef.current > 0 &&
                ` • Retry attempt: ${retryCountRef.current}/3`}
            </div>
          </motion.div>
        </MotionConfig>
      </AdminLayout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = withAdminPageSSR();
