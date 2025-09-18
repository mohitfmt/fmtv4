// components/admin/dashboard/charts/CategoryPieChart.tsx
import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Sector,
} from "recharts";

interface CategoryData {
  category: string;
  videoCount: number;
  percentage: number;
  totalViews: number;
}

interface CategoryPieChartProps {
  data: CategoryData[];
  loading?: boolean;
}

// Color palette for categories
const COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#f97316", // orange
  "#6366f1", // indigo
];

// Custom active shape for hover effect
const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const {
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value,
  } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? "start" : "end";

  return (
    <g>
      <text
        x={cx}
        y={cy}
        dy={8}
        textAnchor="middle"
        fill={fill}
        className="text-sm font-semibold"
      >
        {payload.category}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={fill}
        fill="none"
      />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey}
        textAnchor={textAnchor}
        fill="currentColor"
        className="text-xs"
      >
        {`${value} videos`}
      </text>
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey}
        dy={18}
        textAnchor={textAnchor}
        fill="currentColor"
        className="text-xs opacity-70"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    </g>
  );
};

// Custom tooltip
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-sm mb-1">{data.category}</p>
        <div className="space-y-1 text-xs">
          <p>Videos: {data.videoCount}</p>
          <p>Percentage: {data.percentage}%</p>
          <p>Total Views: {data.totalViews.toLocaleString()}</p>
        </div>
      </div>
    );
  }
  return null;
};

export function CategoryPieChart({ data, loading }: CategoryPieChartProps) {
  const [activeIndex, setActiveIndex] = React.useState(-1);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(-1);
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading categories...</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-muted-foreground">No category data available</p>
      </div>
    );
  }

  // Take top 10 categories for cleaner visualization
  const chartData = data.slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          activeShape={
            activeIndex !== -1
              ? (props: any) =>
                  renderActiveShape({ ...props, ...chartData[activeIndex] })
              : undefined
          }
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          fill="#8884d8"
          dataKey="videoCount"
          onMouseEnter={onPieEnter}
          onMouseLeave={onPieLeave}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Simple version without hover effects
export function SimpleCategoryPie({ data, loading }: CategoryPieChartProps) {
  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading categories...</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-muted-foreground">No category data available</p>
      </div>
    );
  }

  const chartData = data.slice(0, 8);

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ percentage }: any) => `${percentage}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="videoCount"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {chartData.map((item, index) => (
          <div key={item.category} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="truncate">{item.category}</span>
            <span className="text-muted-foreground ml-auto">
              {item.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
