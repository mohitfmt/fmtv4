// components/admin/dashboard/cards/ContentInsightsCard.tsx
import React from "react";
import { LazyMotion, m } from "framer-motion";
import {
  FiTag,
  FiPieChart,
  FiGrid,
  FiInfo,
  FiTrendingUp,
} from "react-icons/fi";
import { cn } from "@/lib/utils";
import type {
  ContentInsights,
  TagInsight,
} from "@/lib/dashboard/queries/content-insights";
import { SimpleCategoryPie } from "../charts/CategoryPieChart";
import { UploadHeatmap } from "../charts/UploadHeatmap";

const loadFeatures = () =>
  import("@/lib/framer-features").then((res) => res.default);

interface ContentInsightsCardProps {
  insights: ContentInsights | null;
  loading?: boolean;
}

export function ContentInsightsCard({
  insights,
  loading,
}: ContentInsightsCardProps) {
  const [activeView, setActiveView] = React.useState<
    "tags" | "categories" | "heatmap"
  >("tags");

  if (loading || !insights) {
    return (
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Content Insights</h3>
          <FiPieChart className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="h-64 bg-muted/50 rounded-lg animate-pulse" />
      </div>
    );
  }

  const views = [
    { id: "tags" as const, label: "Tag Cloud", icon: FiTag },
    { id: "categories" as const, label: "Categories", icon: FiPieChart },
    { id: "heatmap" as const, label: "Upload Times", icon: FiGrid },
  ];

  return (
    <LazyMotion features={loadFeatures}>
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Content Insights</h3>

          {/* View Switcher */}
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
            {views.map((view) => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={cn(
                  "p-2 rounded-md transition-all",
                  activeView === view.id
                    ? "bg-background shadow-sm"
                    : "hover:bg-background/50"
                )}
                title={view.label}
              >
                <view.icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Content Types Summary */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">Regular Videos</p>
            <p className="text-lg font-semibold">
              {insights.contentTypes.regular}
            </p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">Shorts</p>
            <p className="text-lg font-semibold">
              {insights.contentTypes.shorts}
            </p>
            <p className="text-xs text-muted-foreground">
              {insights.contentTypes.shortsPercentage}%
            </p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">Best Time</p>
            <p className="text-sm font-semibold">
              {insights.optimalUploadTime.day}
            </p>
            <p className="text-xs text-muted-foreground">
              {insights.optimalUploadTime.hour}:00
            </p>
          </div>
        </div>

        {/* Active View Content */}
        <m.div
          key={activeView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeView === "tags" && <TagCloud tags={insights.topTags} />}

          {activeView === "categories" && (
            <SimpleCategoryPie
              data={insights.categoryDistribution}
              loading={false}
            />
          )}

          {activeView === "heatmap" && (
            <div className="space-y-4">
              <UploadHeatmap data={insights.uploadHeatmap} loading={false} />

              {/* Optimal Time Card */}
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                    <FiInfo className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      Best Upload Time: {insights.optimalUploadTime.day} at{" "}
                      {insights.optimalUploadTime.hour}:00
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {insights.optimalUploadTime.reason}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </m.div>
      </div>
    </LazyMotion>
  );
}

// Tag Cloud Component
function TagCloud({ tags }: { tags: TagInsight[] }) {
  if (tags.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <FiTag className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No tags found</p>
        </div>
      </div>
    );
  }

  // Calculate font sizes based on count
  const maxCount = Math.max(...tags.map((t) => t.count));
  const minCount = Math.min(...tags.map((t) => t.count));
  const range = maxCount - minCount || 1;

  const getFontSize = (count: number) => {
    const normalized = (count - minCount) / range;
    const minSize = 12;
    const maxSize = 32;
    return Math.round(minSize + (maxSize - minSize) * normalized);
  };

  const getTagColor = (tag: TagInsight) => {
    if (tag.trending) return "text-primary hover:text-primary/80";
    if (tag.avgViews > 10000) return "text-green-500 hover:text-green-400";
    if (tag.avgViews > 5000) return "text-blue-500 hover:text-blue-400";
    return "text-muted-foreground hover:text-foreground";
  };

  return (
    <div className="min-h-[240px] flex flex-wrap gap-2 items-center justify-center p-4">
      {tags.map((tag, index) => (
        <m.button
          key={tag.tag}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.02 }}
          className={cn(
            "inline-flex items-center gap-1 px-3 py-1.5 rounded-full transition-all hover:bg-muted",
            getTagColor(tag)
          )}
          style={{ fontSize: `${getFontSize(tag.count)}px` }}
          title={`${tag.count} videos, ${tag.avgViews.toLocaleString()} avg views`}
        >
          {tag.trending && <FiTrendingUp className="w-3 h-3" />}
          <span className="font-medium">{tag.tag}</span>
          <span className="text-xs opacity-60">({tag.count})</span>
        </m.button>
      ))}
    </div>
  );
}
