// components/admin/dashboard/charts/UploadHeatmap.tsx
import React from "react";
// import { Tooltip } from "@/components/ui/tooltip";

interface HeatmapData {
  hour: number;
  dayOfWeek: number;
  count: number;
  avgViews: number;
  heatValue: number; // 0-100
}

interface UploadHeatmapProps {
  data: HeatmapData[];
  loading?: boolean;
}

// Get color based on heat value
function getHeatColor(value: number): string {
  if (value === 0) return "bg-muted";
  if (value < 20) return "bg-blue-200 dark:bg-blue-900/50";
  if (value < 40) return "bg-blue-300 dark:bg-blue-800/50";
  if (value < 60) return "bg-blue-400 dark:bg-blue-700/50";
  if (value < 80) return "bg-blue-500 dark:bg-blue-600/50";
  return "bg-blue-600 dark:bg-blue-500/50";
}

export function UploadHeatmap({ data, loading }: UploadHeatmapProps) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm">Analyzing upload patterns...</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-muted-foreground">
          No upload pattern data available
        </p>
      </div>
    );
  }

  // Create a map for quick lookup
  const heatmapMap = new Map<string, HeatmapData>();
  data.forEach((item) => {
    heatmapMap.set(`${item.dayOfWeek}-${item.hour}`, item);
  });

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour labels */}
          <div className="flex items-center gap-1 mb-2 ml-12">
            {hours.map((hour) => (
              <div
                key={hour}
                className="w-6 text-center text-xs text-muted-foreground"
              >
                {hour === 0
                  ? "12a"
                  : hour < 12
                    ? `${hour}`
                    : hour === 12
                      ? "12p"
                      : `${hour - 12}`}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          {days.map((day, dayIndex) => (
            <div key={day} className="flex items-center gap-1 mb-1">
              {/* Day label */}
              <div className="w-12 text-right text-xs font-medium text-muted-foreground pr-2">
                {day}
              </div>

              {/* Hour cells */}
              {hours.map((hour) => {
                const key = `${dayIndex}-${hour}`;
                const cellData = heatmapMap.get(key) || {
                  hour,
                  dayOfWeek: dayIndex,
                  count: 0,
                  avgViews: 0,
                  heatValue: 0,
                };

                return (
                  <HeatmapCell
                    key={key}
                    data={cellData}
                    day={day}
                    hour={hour}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4">
        <span className="text-xs text-muted-foreground">Less</span>
        <div className="flex gap-1">
          {[0, 20, 40, 60, 80, 100].map((value) => (
            <div
              key={value}
              className={`w-4 h-4 rounded-sm ${getHeatColor(value)}`}
              title={`${value}% activity`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">More</span>
      </div>

      {/* Best time indicator */}
      <BestTimeIndicator data={data} />
    </div>
  );
}

// Individual heatmap cell component
function HeatmapCell({
  data,
  day,
  hour,
}: {
  data: HeatmapData;
  day: string;
  hour: number;
}) {
  const [showTooltip, setShowTooltip] = React.useState(false);

  const formatHour = (h: number) => {
    if (h === 0) return "12:00 AM";
    if (h < 12) return `${h}:00 AM`;
    if (h === 12) return "12:00 PM";
    return `${h - 12}:00 PM`;
  };

  return (
    <div className="relative">
      <div
        className={`w-6 h-6 rounded-sm cursor-pointer transition-all ${getHeatColor(data.heatValue)} hover:ring-2 hover:ring-primary/50`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      />

      {showTooltip && data.count > 0 && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <div className="bg-popover border rounded-lg p-2 shadow-lg text-xs whitespace-nowrap">
            <p className="font-semibold">
              {day} {formatHour(hour)}
            </p>
            <p>Videos: {data.count}</p>
            <p>Avg Views: {data.avgViews.toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Best time indicator component
function BestTimeIndicator({ data }: { data: HeatmapData[] }) {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  // Find the best slot
  const bestSlot = data
    .filter((slot) => slot.count > 0)
    .sort((a, b) => b.avgViews - a.avgViews)[0];

  if (!bestSlot) {
    return null;
  }

  const formatHour = (h: number) => {
    if (h === 0) return "12:00 AM";
    if (h < 12) return `${h}:00 AM`;
    if (h === 12) return "12:00 PM";
    return `${h - 12}:00 PM`;
  };

  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
          <span className="text-lg">🎯</span>
        </div>
        <div>
          <p className="text-sm font-semibold">Optimal Upload Time</p>
          <p className="text-xs text-muted-foreground">
            {days[bestSlot.dayOfWeek]} at {formatHour(bestSlot.hour)} - Average{" "}
            {bestSlot.avgViews.toLocaleString()} views
          </p>
        </div>
      </div>
    </div>
  );
}
