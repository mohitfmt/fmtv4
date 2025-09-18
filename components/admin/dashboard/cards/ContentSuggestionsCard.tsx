// components/admin/dashboard/cards/ContentSuggestionsCard.tsx
import React from "react";
import { LazyMotion, m, AnimatePresence } from "framer-motion";
import {
  FiTrendingUp,
  FiZap,
  FiClock,
  FiAlertCircle,
  FiChevronRight,
  FiRefreshCw,
} from "react-icons/fi";
import { cn } from "@/lib/utils";
import type {
  ContentSuggestions,
  TrendingSuggestion,
} from "@/lib/dashboard/google-trends";
import { getRecommendationScore } from "@/lib/dashboard/google-trends";

const loadFeatures = () =>
  import("@/lib/framer-features").then((res) => res.default);

interface ContentSuggestionsCardProps {
  suggestions: ContentSuggestions | null;
  loading?: boolean;
  onRefresh?: () => void;
}

export function ContentSuggestionsCard({
  suggestions,
  loading,
  onRefresh,
}: ContentSuggestionsCardProps) {
  const [activeTab, setActiveTab] = React.useState<
    "trending" | "seasonal" | "gaps"
  >("trending");
  const [expandedItem, setExpandedItem] = React.useState<string | null>(null);

  if (loading || !suggestions) {
    return (
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Content Suggestions</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">AI Powered</span>
            <FiZap className="w-5 h-5 text-yellow-500" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-muted/50 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: "trending" as const,
      label: "Trending",
      icon: FiTrendingUp,
      count: suggestions.trending.length,
    },
    {
      id: "seasonal" as const,
      label: "Seasonal",
      icon: FiClock,
      count: suggestions.seasonal.length,
    },
    {
      id: "gaps" as const,
      label: "Content Gaps",
      icon: FiAlertCircle,
      count: suggestions.contentGaps.length,
    },
  ];

  const getActiveContent = () => {
    switch (activeTab) {
      case "trending":
        return suggestions.trending;
      case "seasonal":
        return suggestions.seasonal;
      case "gaps":
        return suggestions.contentGaps.map((gap) => ({
          title: gap,
          searchVolume: "Unknown",
          trend: "stable" as const,
          trendPercentage: 0,
          category: "Opportunity",
          relatedQueries: [],
          contentGap: true,
        }));
      default:
        return [];
    }
  };

  return (
    <LazyMotion features={loadFeatures}>
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Content Suggestions</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              title="Refresh suggestions"
            >
              <FiRefreshCw className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 rounded-full">
              <FiZap className="w-3 h-3 text-yellow-500" />
              <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                AI Powered
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-background shadow-sm"
                  : "hover:bg-background/50"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {getActiveContent().map((item, index) => (
              <SuggestionItem
                key={item.title}
                suggestion={item}
                index={index}
                isExpanded={expandedItem === item.title}
                onToggle={() =>
                  setExpandedItem(
                    expandedItem === item.title ? null : item.title
                  )
                }
                isGap={activeTab === "gaps"}
              />
            ))}
          </AnimatePresence>

          {getActiveContent().length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No suggestions available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Based on Google Trends for Malaysia</span>
            <span>
              Updated: {new Date(suggestions.lastUpdated).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </LazyMotion>
  );
}

// Individual suggestion item
function SuggestionItem({
  suggestion,
  index,
  isExpanded,
  onToggle,
  isGap,
}: {
  suggestion: TrendingSuggestion;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  isGap?: boolean;
}) {
  const score = getRecommendationScore(suggestion);

  const getTrendIcon = () => {
    if (suggestion.trend === "breakout") return "🔥";
    if (suggestion.trend === "rising") return "📈";
    return "→";
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500 bg-green-500/10";
    if (score >= 60) return "text-yellow-500 bg-yellow-500/10";
    if (score >= 40) return "text-blue-500 bg-blue-500/10";
    return "text-muted-foreground bg-muted";
  };

  return (
    <m.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "p-3 rounded-lg transition-all cursor-pointer",
        isExpanded
          ? "bg-primary/5 ring-1 ring-primary/20"
          : "bg-muted/30 hover:bg-muted/50",
        suggestion.contentGap && "border-l-2 border-yellow-500"
      )}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getTrendIcon()}</span>
            <h4 className="font-medium text-sm">{suggestion.title}</h4>
            {suggestion.contentGap && (
              <span className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs rounded-full">
                Gap
              </span>
            )}
          </div>

          {!isGap && (
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-muted-foreground">
                {suggestion.searchVolume} searches
              </span>
              {suggestion.trendPercentage !== 0 && (
                <span
                  className={cn(
                    "text-xs font-medium",
                    suggestion.trendPercentage > 0
                      ? "text-green-500"
                      : "text-red-500"
                  )}
                >
                  {suggestion.trendPercentage > 0 ? "+" : ""}
                  {suggestion.trendPercentage}%
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {suggestion.category}
              </span>
            </div>
          )}
        </div>

        {!isGap && (
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
                getScoreColor(score)
              )}
            >
              {score}
            </div>
            <FiChevronRight
              className={cn(
                "w-4 h-4 text-muted-foreground transition-transform",
                isExpanded && "rotate-90"
              )}
            />
          </div>
        )}
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && !isGap && suggestion.relatedQueries.length > 0 && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 pt-3 border-t"
          >
            <p className="text-xs text-muted-foreground mb-2">
              Related queries:
            </p>
            <div className="flex flex-wrap gap-1">
              {suggestion.relatedQueries.map((query) => (
                <span
                  key={query}
                  className="px-2 py-1 bg-muted text-xs rounded-full"
                >
                  {query}
                </span>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-3">
              <button className="flex-1 px-3 py-1.5 bg-primary/10 text-primary text-xs font-medium rounded-lg hover:bg-primary/20 transition-colors">
                Create Video Idea
              </button>
              <button className="flex-1 px-3 py-1.5 bg-muted text-xs font-medium rounded-lg hover:bg-muted/70 transition-colors">
                Research Topic
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
}
