// components/admin/dashboard/cards/PerformanceMetricsCardEnhanced.tsx
import React from "react";
import { LazyMotion, m, AnimatePresence } from "framer-motion";
import {
  FiActivity,
  FiZap,
  FiClock,
  FiAward,
  FiTrendingUp,
  FiTarget,
  FiStar,
} from "react-icons/fi";
import { cn } from "@/lib/utils";
import type { EnhancedPerformanceMetrics } from "@/lib/dashboard/queries/performance-metrics";

const loadFeatures = () =>
  import("@/lib/framer-features").then((res) => res.default);

interface PerformanceMetricsCardEnhancedProps {
  metrics: EnhancedPerformanceMetrics | null;
  loading?: boolean;
}

export function PerformanceMetricsCard({
  metrics,
  loading,
}: PerformanceMetricsCardEnhancedProps) {
  const [selectedTab, setSelectedTab] = React.useState<
    "overview" | "achievements" | "insights"
  >("overview");

  if (loading || !metrics) {
    return (
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Performance Metrics</h3>
          <FiActivity className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 bg-muted/50 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const getMomentumColor = (score: number) => {
    if (score >= 70) return "from-green-500 to-emerald-500";
    if (score >= 40) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-pink-500";
  };

  const getMomentumText = (score: number) => {
    if (score >= 80) return "🔥 Channel is On Fire!";
    if (score >= 60) return "📈 Great Momentum!";
    if (score >= 40) return "💪 Building Steadily";
    return "🎯 Time to Push Harder";
  };

  return (
    <LazyMotion features={loadFeatures}>
      <div className="bg-card border rounded-xl p-6">
        {/* Header with Momentum Score */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Performance Dashboard</h3>
          <div className="flex items-center gap-3">
            {/* Momentum Indicator */}
            <div className="flex items-center gap-2">
              <div className="relative w-12 h-12">
                <svg className="transform -rotate-90 w-12 h-12">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${(metrics.momentumScore / 100) * 126} 126`}
                    className="text-primary transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold">
                    {metrics.momentumScore}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Momentum</p>
                <p className="text-xs font-semibold">
                  {getMomentumText(metrics.momentumScore)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-4 p-1 bg-muted/30 rounded-lg">
          {(["overview", "achievements", "insights"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={cn(
                "flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-all",
                selectedTab === tab
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Overview Tab */}
          {selectedTab === "overview" && (
            <m.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Primary Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Engagement Card */}
                <m.div
                  className="p-3 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-lg"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">
                      Avg Engagement
                    </span>
                    <FiActivity className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold">
                    {metrics.averageEngagement.toFixed(1)}%
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={cn(
                        "text-xs font-medium",
                        metrics.engagementTrend === "up"
                          ? "text-green-500"
                          : metrics.engagementTrend === "down"
                            ? "text-red-500"
                            : "text-muted-foreground"
                      )}
                    >
                      {metrics.engagementTrend === "up"
                        ? "↑"
                        : metrics.engagementTrend === "down"
                          ? "↓"
                          : "→"}{" "}
                      {metrics.engagementTrend}
                    </span>
                  </div>
                </m.div>

                {/* Growth Card */}
                <m.div
                  className="p-3 bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-lg"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">
                      Week Growth
                    </span>
                    <FiTrendingUp className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold">
                    {metrics.weekOverWeekGrowth > 0 ? "+" : ""}
                    {metrics.weekOverWeekGrowth}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    vs last week
                  </p>
                </m.div>
              </div>

              {/* Viral & Rising Stars */}
              <div className="grid grid-cols-3 gap-3">
                <m.div
                  className="p-3 bg-muted/30 rounded-lg"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FiZap className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs text-muted-foreground">Viral</span>
                  </div>
                  <p className="text-xl font-bold">{metrics.viralVideos}</p>
                </m.div>

                <m.div
                  className="p-3 bg-muted/30 rounded-lg"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FiStar className="w-4 h-4 text-purple-500" />
                    <span className="text-xs text-muted-foreground">
                      Rising
                    </span>
                  </div>
                  <p className="text-xl font-bold">{metrics.risingStars}</p>
                </m.div>

                <m.div
                  className="p-3 bg-muted/30 rounded-lg"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FiClock className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground">Watch</span>
                  </div>
                  <p className="text-xl font-bold">
                    {formatWatchTime(metrics.watchTimeEstimate)}
                  </p>
                </m.div>
              </div>

              {/* Top Categories */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Top Categories</h4>
                {metrics.topCategories.slice(0, 3).map((category, index) => (
                  <div
                    key={category.category}
                    className="flex items-center justify-between p-2 bg-muted/20 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                          index === 0
                            ? "bg-yellow-500/20 text-yellow-500"
                            : index === 1
                              ? "bg-gray-500/20 text-gray-400"
                              : "bg-orange-500/20 text-orange-500"
                        )}
                      >
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium">
                        {category.category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({category.count})
                      </span>
                    </div>
                    <span className="text-sm font-semibold">
                      {formatNumber(category.avgViews)} views
                    </span>
                  </div>
                ))}
              </div>
            </m.div>
          )}

          {/* Achievements Tab */}
          {selectedTab === "achievements" && (
            <m.div
              key="achievements"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {metrics.achievements.map((achievement, index) => (
                <m.div
                  key={achievement.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    achievement.unlocked
                      ? "bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20"
                      : "bg-muted/20 border-muted/30 opacity-60"
                  )}
                  whileHover={{ scale: achievement.unlocked ? 1.02 : 1 }}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{achievement.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium text-sm">
                          {achievement.title}
                        </h5>
                        {achievement.unlocked && (
                          <span className="text-xs bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded-full">
                            Unlocked!
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {achievement.description}
                      </p>
                      {achievement.progress !== undefined && (
                        <div className="mt-2">
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <m.div
                              className={cn(
                                "h-full rounded-full",
                                achievement.unlocked
                                  ? "bg-gradient-to-r from-green-500 to-emerald-500"
                                  : "bg-muted-foreground/30"
                              )}
                              initial={{ width: 0 }}
                              animate={{ width: `${achievement.progress}%` }}
                              transition={{ duration: 1, delay: index * 0.1 }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {achievement.progress}% Complete
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </m.div>
              ))}
            </m.div>
          )}

          {/* Insights Tab */}
          {selectedTab === "insights" && (
            <m.div
              key="insights"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Best Time to Publish */}
              <div className="p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FiClock className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium">
                    Best Publishing Time
                  </span>
                </div>
                <p className="text-lg font-bold">
                  {metrics.bestPerformingHour}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on highest view velocity
                </p>
              </div>

              {/* Publishing Consistency */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    Publishing Consistency
                  </span>
                  <FiTarget className="w-4 h-4 text-blue-500" />
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <m.div
                    className={cn(
                      "h-full rounded-full",
                      metrics.publishingConsistency >= 66
                        ? "bg-gradient-to-r from-green-500 to-emerald-500"
                        : metrics.publishingConsistency >= 33
                          ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                          : "bg-gradient-to-r from-red-500 to-pink-500"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${metrics.publishingConsistency}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {metrics.publishingConsistency >= 66
                    ? "Great job maintaining schedule!"
                    : metrics.publishingConsistency >= 33
                      ? "Try to publish more regularly"
                      : "Consistency is key to growth"}
                </p>
              </div>

              {/* Top Performers */}
              {metrics.topPerformers.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <FiAward className="w-4 h-4 text-yellow-500" />
                    Top Performers
                  </h4>
                  {metrics.topPerformers.slice(0, 3).map((video, index) => (
                    <div
                      key={video.videoId}
                      className="p-2 bg-muted/20 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{video.badge || "⭐"}</span>
                          <div>
                            <p className="text-xs font-medium line-clamp-1">
                              {video.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {video.metric}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-primary">
                          {video.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Average Velocity */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Average Velocity</p>
                    <p className="text-xs text-muted-foreground">
                      Views per hour
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {metrics.averageVelocity}/hr
                  </p>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* Performance Score Bar */}
        <m.div
          className="mt-6 p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Performance</span>
            <span className="text-lg font-bold">
              {metrics.performanceScore}/100
            </span>
          </div>
          <div className="relative h-6 bg-muted rounded-full overflow-hidden">
            <m.div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full",
                "bg-gradient-to-r",
                metrics.performanceScore >= 80
                  ? "from-green-500 via-emerald-500 to-teal-500"
                  : metrics.performanceScore >= 60
                    ? "from-yellow-500 via-orange-500 to-amber-500"
                    : metrics.performanceScore >= 40
                      ? "from-blue-500 via-indigo-500 to-purple-500"
                      : "from-red-500 via-pink-500 to-rose-500"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${metrics.performanceScore}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-semibold text-foreground/70">
                {metrics.performanceScore >= 80
                  ? "🏆 Excellent!"
                  : metrics.performanceScore >= 60
                    ? "⭐ Good Progress"
                    : metrics.performanceScore >= 40
                      ? "💪 Keep Pushing"
                      : "🎯 Room to Grow"}
              </span>
            </div>
          </div>
        </m.div>
      </div>
    </LazyMotion>
  );
}

// Helper functions
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatWatchTime(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours.toLocaleString()}h`;
  }
  return `${Math.round(minutes).toLocaleString()}m`;
}
