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

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-sm mb-1">
          {payload[0]?.payload?.fullDate}
        </p>
        <div className="space-y-1">
          <p className="text-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-primary rounded-full" />
            This week: {payload[0]?.value} videos
          </p>
          <p className="text-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-muted-foreground rounded-full" />
            Last week: {payload[1]?.value} videos
          </p>
        </div>
      </div>
    );
  }
  return null;
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

  // Find max value for Y-axis
  const maxValue = Math.max(
    ...data.flatMap((d) => [d.videos, d.lastWeek]),
    5 // Minimum max value
  );

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="day" tick={{ fontSize: 12 }} tickLine={false} />
        <YAxis
          domain={[0, maxValue]}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
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
