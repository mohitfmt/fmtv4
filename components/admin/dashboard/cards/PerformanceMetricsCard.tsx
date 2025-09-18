// components/admin/dashboard/cards/PerformanceMetricsCard.tsx
import React from "react";
import { LazyMotion, m } from "framer-motion";
import {
  FiActivity,
  FiEye,
  FiThumbsUp,
  FiMessageCircle,
  FiZap,
  FiClock,
  FiAward,
} from "react-icons/fi";
import { cn } from "@/lib/utils";
import type { PerformanceMetrics } from "@/lib/dashboard/queries/performance-metrics";
import { PERFORMANCE_THRESHOLDS } from "@/lib/dashboard/constants";

const loadFeatures = () =>
  import("@/lib/framer-features").then((res) => res.default);

interface PerformanceMetricsCardProps {
  metrics: PerformanceMetrics | null;
  loading?: boolean;
}

export function PerformanceMetricsCard({
  metrics,
  loading,
}: PerformanceMetricsCardProps) {
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

  const getEngagementColor = (rate: number) => {
    if (rate >= PERFORMANCE_THRESHOLDS.ENGAGEMENT_RATE.EXCELLENT * 100)
      return "text-green-500";
    if (rate >= PERFORMANCE_THRESHOLDS.ENGAGEMENT_RATE.GOOD * 100)
      return "text-yellow-500";
    if (rate >= PERFORMANCE_THRESHOLDS.ENGAGEMENT_RATE.AVERAGE * 100)
      return "text-orange-500";
    return "text-red-500";
  };

  const getPerformanceIcon = (score: number) => {
    if (score >= 80) return "🏆";
    if (score >= 60) return "⭐";
    if (score >= 40) return "📈";
    return "📊";
  };

  return (
    <LazyMotion features={loadFeatures}>
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Performance Metrics</h3>
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {getPerformanceIcon(metrics.performanceScore)}
            </span>
            <span className="text-sm font-semibold">
              {metrics.performanceScore}/100
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Engagement Overview */}
          <m.div
            className="p-4 bg-muted/30 rounded-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Average Engagement</span>
              <span
                className={cn(
                  "text-lg font-bold",
                  getEngagementColor(metrics.averageEngagement)
                )}
              >
                {metrics.averageEngagement.toFixed(2)}%
              </span>
            </div>

            {/* Engagement Breakdown */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <FiEye className="w-3 h-3 text-blue-500" />
                <span>{formatNumber(metrics.averageViews)}</span>
              </div>
              <div className="flex items-center gap-1">
                <FiThumbsUp className="w-3 h-3 text-green-500" />
                <span>{formatNumber(metrics.averageLikes)}</span>
              </div>
              <div className="flex items-center gap-1">
                <FiMessageCircle className="w-3 h-3 text-purple-500" />
                <span>
                  {Math.round(
                    metrics.averageViews * (metrics.averageEngagement / 100) -
                      metrics.averageLikes
                  )}
                </span>
              </div>
            </div>

            {/* Trend Indicator */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
              <span className="text-xs text-muted-foreground">Trend:</span>
              <span
                className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full",
                  metrics.engagementTrend === "up"
                    ? "bg-green-500/10 text-green-500"
                    : metrics.engagementTrend === "down"
                      ? "bg-red-500/10 text-red-500"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {metrics.engagementTrend === "up"
                  ? "↑ Rising"
                  : metrics.engagementTrend === "down"
                    ? "↓ Falling"
                    : "→ Stable"}
              </span>
            </div>
          </m.div>

          {/* Viral & Watch Time */}
          <div className="grid grid-cols-2 gap-3">
            <m.div
              className="p-3 bg-muted/30 rounded-lg"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <FiZap className="w-4 h-4 text-yellow-500" />
                <span className="text-xs text-muted-foreground">
                  Viral Videos
                </span>
              </div>
              <p className="text-xl font-bold">{metrics.viralVideos}</p>
              <p className="text-xs text-muted-foreground">High velocity</p>
            </m.div>

            <m.div
              className="p-3 bg-muted/30 rounded-lg"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <FiClock className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">
                  Watch Time
                </span>
              </div>
              <p className="text-xl font-bold">
                {formatWatchTime(metrics.watchTimeEstimate)}
              </p>
              <p className="text-xs text-muted-foreground">Est. minutes</p>
            </m.div>
          </div>

          {/* Top Categories */}
          {metrics.topCategories.length > 0 && (
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h4 className="text-sm font-medium mb-2">Top Categories</h4>
              <div className="space-y-2">
                {metrics.topCategories.slice(0, 3).map((category, index) => (
                  <div
                    key={category.category}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="text-sm">{category.category}</span>
                      <span className="text-xs text-muted-foreground">
                        ({category.count} videos)
                      </span>
                    </div>
                    <span className="text-sm font-medium">
                      {formatNumber(category.avgViews)} views
                    </span>
                  </div>
                ))}
              </div>
            </m.div>
          )}

          {/* Performance Score Breakdown */}
          <m.div
            className="p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Performance Score</span>
              <FiAward className="w-4 h-4 text-primary" />
            </div>

            {/* Score Bar */}
            <div className="relative h-4 bg-muted rounded-full overflow-hidden">
              <m.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/70"
                initial={{ width: 0 }}
                animate={{ width: `${metrics.performanceScore}%` }}
                transition={{ duration: 1, delay: 0.6 }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-semibold text-foreground/70">
                  {metrics.performanceScore}/100
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              {metrics.performanceScore >= 80
                ? "Excellent performance! Keep it up!"
                : metrics.performanceScore >= 60
                  ? "Good performance with room to grow"
                  : metrics.performanceScore >= 40
                    ? "Average performance - focus on engagement"
                    : "Needs improvement - consider content strategy"}
            </p>
          </m.div>
        </div>
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
