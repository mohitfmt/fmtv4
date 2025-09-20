// components/admin/dashboard/cards/StatsCard.tsx
import React from "react";
import { LazyMotion, m } from "framer-motion";
import { cn } from "@/lib/utils";
import { IconType } from "react-icons";
import { FiCalendar } from "react-icons/fi";

// Import features for lazy loading
const loadFeatures = () =>
  import("@/lib/framer-features").then((res) => res.default);

interface StatsCardProps {
  icon: IconType;
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  trendValue?: string | number;
  color?: "primary" | "success" | "warning" | "danger";
  loading?: boolean;
  className?: string;
  onClick?: () => void;
  // New props for Videos Today feature
  showTodayCount?: boolean;
  todayValue?: number;
  todayLoading?: boolean;
}

export function StatsCard({
  icon: Icon,
  label,
  value,
  trend,
  trendValue,
  color = "primary",
  loading = false,
  className,
  onClick,
  showTodayCount = false,
  todayValue = 0,
  todayLoading = false,
}: StatsCardProps) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-green-500/10 text-green-500",
    warning: "bg-yellow-500/10 text-yellow-500",
    danger: "bg-red-500/10 text-red-500",
  };

  const trendColors = {
    up: "bg-green-500/10 text-green-500",
    down: "bg-red-500/10 text-red-500",
    neutral: "bg-muted text-muted-foreground",
  };

  return (
    <LazyMotion features={loadFeatures}>
      <m.div
        className={cn(
          "bg-card border rounded-xl p-6 relative overflow-hidden",
          onClick && "cursor-pointer hover:shadow-lg transition-shadow",
          className
        )}
        onClick={onClick}
        whileHover={onClick ? { scale: 1.02 } : undefined}
        whileTap={onClick ? { scale: 0.98 } : undefined}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-gradient-to-br from-transparent to-muted/20" />

        {/* Videos Today Widget - Positioned at top-right */}
        {showTodayCount && (
          <m.div
            className="absolute top-3 right-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg px-3 py-2 border border-primary/20"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2">
              <FiCalendar className="w-3 h-3 text-primary/70" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Today
                </p>
                {todayLoading ? (
                  <div className="h-4 w-8 bg-muted animate-pulse rounded" />
                ) : (
                  <p className="text-sm font-bold text-primary">
                    {todayValue > 0 ? `+${todayValue}` : todayValue}
                  </p>
                )}
              </div>
            </div>
          </m.div>
        )}

        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <m.div
              className={cn("p-3 rounded-lg", colorClasses[color])}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <Icon className="w-5 h-5" />
            </m.div>

            {/* Trend indicator - only show if no Today widget or position differently */}
            {trend && trendValue && !showTodayCount && (
              <m.div
                className={cn(
                  "text-sm font-medium px-2 py-1 rounded-full",
                  trendColors[trend]
                )}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <span className="inline-flex items-center gap-1">
                  {trend === "up" && "↑"}
                  {trend === "down" && "↓"}
                  {trend === "neutral" && "→"}
                  {trendValue}
                </span>
              </m.div>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              <div className="h-8 bg-muted animate-pulse rounded-md w-20" />
              <div className="h-4 bg-muted animate-pulse rounded-md w-32" />
            </div>
          ) : (
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="text-3xl font-bold mb-1">
                {typeof value === "number" ? value.toLocaleString() : value}
              </div>
              <p className="text-sm text-muted-foreground">{label}</p>

              {/* Show trend below if we have Today widget */}
              {trend && trendValue && showTodayCount && (
                <m.div
                  className={cn(
                    "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mt-2",
                    trendColors[trend]
                  )}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {trend === "up" && "↑"}
                  {trend === "down" && "↓"}
                  {trend === "neutral" && "→"}
                  {trendValue} from last week
                </m.div>
              )}
            </m.div>
          )}
        </div>
      </m.div>
    </LazyMotion>
  );
}

// Mini stat card for compact displays
export function MiniStatCard({
  icon: Icon,
  label,
  value,
  color = "primary",
  loading = false,
}: {
  icon: IconType;
  label: string;
  value: string | number;
  color?: "primary" | "success" | "warning" | "danger";
  loading?: boolean;
}) {
  const colorClasses = {
    primary: "text-primary",
    success: "text-green-500",
    warning: "text-yellow-500",
    danger: "text-red-500",
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
      <Icon className={cn("w-5 h-5", colorClasses[color])} />
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {loading ? (
          <div className="h-5 bg-muted animate-pulse rounded-md w-16 mt-0.5" />
        ) : (
          <p className="text-sm font-semibold">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
        )}
      </div>
    </div>
  );
}
