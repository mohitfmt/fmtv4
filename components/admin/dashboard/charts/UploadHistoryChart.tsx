// components/admin/dashboard/charts/UploadHistoryChart.tsx
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface UploadData {
  date: string;
  day: string;
  fullDate: string;
  videos: number;
  lastWeek: number;
  isToday: boolean;
}

interface UploadHistoryChartProps {
  data: UploadData[];
  loading?: boolean;
}

// Custom tooltip component with zero-brain-needed clarity
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const currentWeekCount = payload[0]?.value || 0;
    const lastWeekCount = payload[1]?.value || 0;
    const difference = currentWeekCount - lastWeekCount;
    const percentageChange =
      lastWeekCount > 0
        ? Math.round((difference / lastWeekCount) * 100)
        : currentWeekCount > 0
          ? 100
          : 0;

    // Get day name and dates
    const dayName = payload[0]?.payload?.day;
    const dateStr = payload[0]?.payload?.date; // yyyy-MM-dd format

    // Calculate last week's date (7 days ago)
    const currentDate = new Date(dateStr);
    const lastWeekDate = new Date(currentDate);
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);

    // Format dates as "15 Oct" format
    const formatShortDate = (date: Date) => {
      const day = date.getDate();
      const month = date.toLocaleDateString("en-US", { month: "short" });
      return `${day} ${month}`;
    };

    const thisWeekDateStr = formatShortDate(currentDate);
    const lastWeekDateStr = formatShortDate(lastWeekDate);

    return (
      <div className="bg-popover border rounded-lg p-3 shadow-lg min-w-[220px]">
        <p className="font-semibold text-sm mb-2">
          Compare with Last {dayName}
        </p>
        <div className="space-y-1.5">
          <p className="text-sm flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>This week ({thisWeekDateStr}):</span>
            </span>
            <span className="font-semibold">{currentWeekCount} videos</span>
          </p>
          <p className="text-sm flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-muted-foreground rounded-full" />
              <span>Last week ({lastWeekDateStr}):</span>
            </span>
            <span className="font-medium text-muted-foreground">
              {lastWeekCount} videos
            </span>
          </p>
          {/* Show difference with trend indicator */}
          {difference !== 0 && (
            <div className="pt-1.5 mt-1.5 border-t border-border">
              <p
                className={`text-sm font-medium flex items-center justify-between gap-2 ${
                  difference > 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                <span className="flex items-center gap-1">
                  {difference > 0 ? "↑" : "↓"}
                  <span>
                    {Math.abs(difference)} video
                    {Math.abs(difference) !== 1 ? "s" : ""}
                  </span>
                </span>
                <span>
                  ({percentageChange > 0 ? "+" : ""}
                  {percentageChange}%)
                </span>
              </p>
            </div>
          )}
          {difference === 0 && lastWeekCount > 0 && (
            <div className="pt-1.5 mt-1.5 border-t border-border">
              <p className="text-sm font-medium text-muted-foreground">
                No change from last week
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

// Custom X-axis tick to show date + day (e.g., "15 Mon", "16 Tue")
const CustomXAxisTick = ({ x, y, payload }: any) => {
  if (!payload || !payload.value) return null;

  // Extract day name and date number from the data
  const dataPoint = payload.value;

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={8}
        textAnchor="middle"
        fill="currentColor"
        className="text-xs"
      >
        {dataPoint}
      </text>
    </g>
  );
};

export default function UploadHistoryChart({
  data,
  loading,
}: UploadHistoryChartProps) {
  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading chart...</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-muted-foreground">No upload data available</p>
      </div>
    );
  }

  // Transform data to include formatted X-axis labels
  const chartData = data.map((item) => ({
    ...item,
    xLabel: `${item.fullDate.split(" ")[1]} ${item.day}`, // "15 Mon", "16 Tue", etc.
  }));

  // Find max value for Y-axis
  const maxValue = Math.max(
    ...data.flatMap((d) => [d.videos, d.lastWeek]),
    5 // Minimum max value
  );

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="xLabel" tick={{ fontSize: 12 }} tickLine={false} />
        <YAxis
          domain={[0, maxValue]}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
        />
        <Legend wrapperStyle={{ fontSize: "12px" }} iconType="circle" />
        <Bar
          dataKey="videos"
          name="This Week"
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.isToday ? "#2563eb" : "#3b82f6"}
            />
          ))}
        </Bar>
        <Bar
          dataKey="lastWeek"
          name="Last Week"
          fill="#9ca3af"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
