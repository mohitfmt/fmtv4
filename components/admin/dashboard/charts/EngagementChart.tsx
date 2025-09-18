// components/admin/dashboard/charts/EngagementChart.tsx
import React from "react";
import {
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { PERFORMANCE_THRESHOLDS } from "@/lib/dashboard/constants";

interface EngagementData {
  date: string;
  views: number;
  likes: number;
  comments: number;
  engagement: number;
}

interface EngagementChartProps {
  data?: EngagementData[];
  performanceMetrics?: {
    averageEngagement: number;
    averageViews: number;
    averageLikes: number;
  };
  loading?: boolean;
}

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-sm mb-2">{label}</p>
        <div className="space-y-1 text-sm">
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full" />
            Views: {payload[0]?.value?.toLocaleString()}
          </p>
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Likes: {payload[1]?.value?.toLocaleString()}
          </p>
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full" />
            Comments: {payload[2]?.value?.toLocaleString()}
          </p>
          <p className="flex items-center gap-2 mt-2 pt-2 border-t">
            <span className="w-2 h-2 bg-orange-500 rounded-full" />
            Engagement: {payload[3]?.value?.toFixed(2)}%
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function EngagementChart({
  data,
  performanceMetrics,
  loading,
}: EngagementChartProps) {
  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading metrics...</p>
        </div>
      </div>
    );
  }

  const chartData = data || [];

  const excellentThreshold =
    PERFORMANCE_THRESHOLDS.ENGAGEMENT_RATE.EXCELLENT * 100;
  const goodThreshold = PERFORMANCE_THRESHOLDS.ENGAGEMENT_RATE.GOOD * 100;
  const avgEngagement = performanceMetrics?.averageEngagement || 5;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {performanceMetrics && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Avg Views</p>
            <p className="text-lg font-semibold">
              {performanceMetrics.averageViews.toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Avg Likes</p>
            <p className="text-lg font-semibold">
              {performanceMetrics.averageLikes.toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Avg Engagement</p>
            <p className="text-lg font-semibold">
              {performanceMetrics.averageEngagement.toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      {/* Area Chart */}
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 20]}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: "12px" }} iconType="circle" />

          {/* Reference lines for engagement thresholds */}
          <ReferenceLine
            yAxisId="right"
            y={excellentThreshold}
            stroke="#10b981"
            strokeDasharray="5 5"
            label={{ value: "Excellent", fontSize: 10 }}
          />
          <ReferenceLine
            yAxisId="right"
            y={goodThreshold}
            stroke="#f59e0b"
            strokeDasharray="5 5"
            label={{ value: "Good", fontSize: 10 }}
          />
          <ReferenceLine
            yAxisId="right"
            y={avgEngagement}
            stroke="#8b5cf6"
            strokeDasharray="3 3"
            label={{ value: "Average", fontSize: 10 }}
          />

          <Area
            yAxisId="left"
            type="monotone"
            dataKey="views"
            name="Views"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorViews)"
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="likes"
            name="Likes"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorLikes)"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="comments"
            name="Comments"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="engagement"
            name="Engagement %"
            stroke="#f97316"
            strokeWidth={3}
            dot={{ r: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Generate mock data for demonstration
function generateMockData(): EngagementData[] {
  const data: EngagementData[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const views = Math.floor(Math.random() * 10000) + 5000;
    const likes = Math.floor(views * (Math.random() * 0.1 + 0.05));
    const comments = Math.floor(views * (Math.random() * 0.02 + 0.01));
    const engagement = ((likes + comments) / views) * 100;

    data.push({
      date: date.toLocaleDateString("en", { month: "short", day: "numeric" }),
      views,
      likes,
      comments,
      engagement: Number(engagement.toFixed(2)),
    });
  }

  return data;
}
