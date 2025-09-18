// components/admin/dashboard/cards/ContentSuggestionsCard.tsx - Version 2 with fixes
import React from "react";
import { LazyMotion, m, AnimatePresence } from "framer-motion";
import {
  FiZap,
  FiAlertCircle,
  FiChevronRight,
  FiRefreshCw,
  FiGlobe,
  FiYoutube,
  FiCheckCircle,
  FiPlayCircle,
  FiActivity,
  FiMapPin,
  FiWifiOff,
} from "react-icons/fi";
import { cn } from "@/lib/utils";
import type {
  ContentSuggestions,
  TrendingSuggestion,
  YouTubeTrendingVideo,
} from "@/lib/dashboard/google-trends";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

const loadFeatures = () =>
  import("@/lib/framer-features").then((res) => res.default);

interface ContentSuggestionsCardProps {
  suggestions: ContentSuggestions | null;
  loading?: boolean;
  onRefresh?: () => void;
}

// Region flags mapping
const REGION_FLAGS = {
  MY: "🇲🇾",
  SG: "🇸🇬",
  ID: "🇮🇩",
  TH: "🇹🇭",
};

const REGION_NAMES = {
  MY: "Malaysia",
  SG: "Singapore",
  ID: "Indonesia",
  TH: "Thailand",
};

export function ContentSuggestionsCard({
  suggestions,
  loading,
  onRefresh,
}: ContentSuggestionsCardProps) {
  const [activeTab, setActiveTab] = React.useState<
    "all" | "MY" | "SG" | "ID" | "TH" | "youtube" | "opportunities"
  >("all");
  const [expandedItem, setExpandedItem] = React.useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Handle refresh with loading state
  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setTimeout(() => setIsRefreshing(false), 1000);
      }
    }
  };

  // Loading state
  if (loading || !suggestions) {
    return (
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Content Suggestions</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground animate-pulse">
              Loading real-time data...
            </span>
            <FiActivity className="w-5 h-5 text-yellow-500 animate-spin" />
          </div>
        </div>
        <div className="space-y-3">
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

  // Error state - empty data
  const hasNoData =
    suggestions.trending.length === 0 &&
    suggestions.youtube.length === 0 &&
    suggestions.seasonal.length === 0;

  if (hasNoData && !suggestions.error) {
    return (
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Content Suggestions</h3>
          <button
            onClick={handleRefresh}
            className={cn(
              "p-2 hover:bg-muted rounded-lg transition-colors",
              isRefreshing && "animate-spin"
            )}
            title="Refresh data"
            disabled={isRefreshing}
          >
            <FiRefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center py-12">
          <FiWifiOff className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">No Data Available</p>
          <p className="text-sm text-muted-foreground mb-4">
            Unable to fetch trends data. Check RSS/YouTube connectivity.
          </p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            disabled={isRefreshing}
          >
            {isRefreshing ? "Retrying..." : "Retry Now"}
          </button>
        </div>
      </div>
    );
  }

  // Enhanced tabs with region intelligence
  const tabs = [
    {
      id: "all" as const,
      label: "All Regions",
      icon: FiGlobe,
      count: suggestions.trending.length,
      badge: suggestions.error ? "CACHED" : "LIVE",
    },
    ...Object.entries(REGION_FLAGS).map(([region, flag]) => ({
      id: region as "MY" | "SG" | "ID" | "TH",
      label: `${flag} ${region}`,
      icon: FiMapPin,
      count:
        suggestions.regional[region as keyof typeof suggestions.regional]
          .length,
      badge: undefined,
    })),
    {
      id: "youtube" as const,
      label: "YouTube",
      icon: FiYoutube,
      count: suggestions.youtube.length,
      badge: suggestions.youtube.length > 0 ? "HOT" : null,
    },
    {
      id: "opportunities" as const,
      label: "Opportunities",
      icon: FiZap,
      count: suggestions.contentGaps.length,
      badge: null,
    },
  ];

  // Get active content based on tab
  const getActiveContent = () => {
    switch (activeTab) {
      case "all":
        return suggestions.trending;
      case "MY":
      case "SG":
      case "ID":
      case "TH":
        return suggestions.regional[activeTab];
      case "youtube":
        return null; // YouTube has special rendering
      case "opportunities":
        return suggestions.contentGaps.map((gap, index) => ({
          title: gap.replace("Create video about: ", ""),
          searchVolume: "High potential",
          trend: "up" as const,
          trendPercentage: 100,
          category: "Opportunity",
          relatedQueries: [],
          regions: {
            MY: { trending: true },
            SG: { trending: false },
            ID: { trending: false },
            TH: { trending: false },
          },
          movement: "stable" as const,
          ourCoverage: { hasVideo: false },
          score: 90 - index * 5,
          source: "google_trends" as const,
        }));
      default:
        return [];
    }
  };

  return (
    <LazyMotion features={loadFeatures}>
      <div className="bg-card border rounded-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Content Intelligence</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Updated:{" "}
              {formatDistanceToNow(new Date(suggestions.lastUpdated), {
                addSuffix: true,
              })}
              {" • "}Next:{" "}
              {formatDistanceToNow(new Date(suggestions.nextUpdate), {
                addSuffix: true,
              })}
            </p>
            {suggestions.error && (
              <p className="text-xs text-yellow-600 mt-1">
                ⚠️ {suggestions.error}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-xs px-2 py-1 rounded-full",
                suggestions.error
                  ? "bg-yellow-500/10 text-yellow-500"
                  : "bg-green-500/10 text-green-500"
              )}
            >
              {suggestions.error ? "Cached Data" : "Real-Time Data"}
            </span>
            <button
              onClick={handleRefresh}
              className={cn(
                "p-2 hover:bg-muted rounded-lg transition-colors",
                isRefreshing && "animate-spin"
              )}
              title="Refresh data"
              disabled={isRefreshing}
            >
              <FiRefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Enhanced Tab Navigation */}
        <div className="mb-4 overflow-x-auto">
          <div className="flex gap-1 p-1 bg-muted/30 rounded-lg min-w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3 py-2 rounded-md transition-all flex items-center gap-2 whitespace-nowrap relative",
                  activeTab === tab.id
                    ? "bg-background shadow-sm text-primary"
                    : "hover:bg-background/50 text-muted-foreground"
                )}
              >
                {tab.icon && <tab.icon className="w-4 h-4" />}
                <span className="text-sm font-medium">{tab.label}</span>
                {tab.count > 0 && (
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span
                    className={cn(
                      "absolute -top-1 -right-1 text-[10px] px-1 rounded",
                      tab.badge === "CACHED"
                        ? "bg-yellow-500 text-white"
                        : "bg-red-500 text-white"
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <m.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-2 max-h-[600px] overflow-y-auto" // Increased from 500px
          >
            {activeTab === "youtube" ? (
              <YouTubeSection videos={suggestions.youtube} />
            ) : activeTab === "all" && suggestions.trending.length > 5 ? (
              // Two-column layout for "All" tab when space is available
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {getActiveContent()?.map((item, index) => (
                  <TrendItem
                    key={`${item.title}-${index}`}
                    suggestion={item}
                    index={index}
                    isExpanded={expandedItem === item.title}
                    onToggle={() =>
                      setExpandedItem(
                        expandedItem === item.title ? null : item.title
                      )
                    }
                    isOpportunity={false}
                  />
                ))}
              </div>
            ) : (
              <TrendsSection
                items={getActiveContent() || []}
                expandedItem={expandedItem}
                setExpandedItem={setExpandedItem}
                isOpportunities={activeTab === "opportunities"}
              />
            )}
          </m.div>
        </AnimatePresence>

        {/* Regional Intelligence Footer */}
        {activeTab === "all" && suggestions.trending.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <RegionalInsights trends={suggestions.trending.slice(0, 3)} />
          </div>
        )}

        {/* Seasonal Notice */}
        {suggestions.seasonal.length > 0 && activeTab === "all" && (
          <div className="mt-4 p-3 bg-blue-500/10 rounded-lg">
            <p className="text-xs text-blue-600 font-medium">
              📅 {suggestions.seasonal.length} seasonal event
              {suggestions.seasonal.length > 1 ? "s" : ""} detected
            </p>
          </div>
        )}
      </div>
    </LazyMotion>
  );
}

// Trends Section Component
function TrendsSection({
  items,
  expandedItem,
  setExpandedItem,
  isOpportunities,
}: {
  items: TrendingSuggestion[];
  expandedItem: string | null;
  setExpandedItem: (id: string | null) => void;
  isOpportunities: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FiAlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p>No trending topics found</p>
        {!isOpportunities && (
          <p className="text-xs mt-2">Check back later for updates</p>
        )}
      </div>
    );
  }

  return (
    <>
      {items.map((item, index) => (
        <TrendItem
          key={`${item.title}-${index}`}
          suggestion={item}
          index={index}
          isExpanded={expandedItem === item.title}
          onToggle={() =>
            setExpandedItem(expandedItem === item.title ? null : item.title)
          }
          isOpportunity={isOpportunities}
        />
      ))}
    </>
  );
}

// Individual Trend Item Component
function TrendItem({
  suggestion,
  index,
  isExpanded,
  onToggle,
  isOpportunity,
}: {
  suggestion: TrendingSuggestion;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  isOpportunity: boolean;
}) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500/10 text-green-500";
    if (score >= 60) return "bg-yellow-500/10 text-yellow-500";
    return "bg-muted text-muted-foreground";
  };

  const getMovementIcon = () => {
    switch (suggestion.movement) {
      case "spreading":
        return "🔥";
      case "regional-only":
        return "📍";
      case "declining":
        return "📉";
      default:
        return "📊";
    }
  };

  const getTrendIcon = () => {
    switch (suggestion.trend) {
      case "explosive":
        return "🚀";
      case "up":
        return "📈";
      case "down":
        return "📉";
      default:
        return "➡️";
    }
  };

  return (
    <m.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "p-3 rounded-lg border transition-all cursor-pointer",
        isExpanded
          ? "bg-muted/30 border-primary"
          : "hover:bg-muted/20 border-transparent"
      )}
      onClick={onToggle}
    >
      {/* Main Content */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getMovementIcon()}</span>
            <h4 className="font-medium flex items-center gap-2">
              {suggestion.title}
              {suggestion.ourCoverage.hasVideo && (
                <span
                  className="text-green-500"
                  title="We have a video on this topic"
                >
                  <FiCheckCircle className="w-4 h-4" />
                </span>
              )}
              {suggestion.platformGap && (
                <span
                  className="text-yellow-500"
                  title="Trending on Google but not YouTube"
                >
                  <FiZap className="w-4 h-4" />
                </span>
              )}
            </h4>
          </div>

          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {suggestion.searchVolume}
            </span>
            {suggestion.trendPercentage !== 0 && (
              <span
                className={cn(
                  "font-medium flex items-center gap-1",
                  suggestion.trend === "explosive"
                    ? "text-red-500"
                    : suggestion.trend === "up"
                      ? "text-green-500"
                      : suggestion.trend === "down"
                        ? "text-orange-500"
                        : "text-yellow-500"
                )}
              >
                <span>{getTrendIcon()}</span>
                {suggestion.trendPercentage > 0 ? "+" : ""}
                {suggestion.trendPercentage}%
              </span>
            )}
            <span>{suggestion.category}</span>

            {/* Regional badges */}
            <div className="flex gap-1">
              {Object.entries(suggestion.regions).map(([region, data]) => {
                if (!data.trending) return null;
                return (
                  <span
                    key={region}
                    className="text-[10px] bg-primary/10 text-primary px-1 rounded"
                    title={`Trending in ${REGION_NAMES[region as keyof typeof REGION_NAMES]}`}
                  >
                    {REGION_FLAGS[region as keyof typeof REGION_FLAGS]}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Score Badge */}
          <div
            className={cn(
              "px-2 py-1 rounded-full text-xs font-medium",
              getScoreColor(suggestion.score)
            )}
          >
            {suggestion.score}
          </div>

          <FiChevronRight
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              isExpanded && "rotate-90"
            )}
          />
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 pt-3 border-t space-y-3"
          >
            {/* Coverage Status */}
            {suggestion.ourCoverage.hasVideo ? (
              <div className="p-3 bg-green-500/10 rounded-lg">
                <p className="text-sm font-medium text-green-600 mb-1">
                  ✅ We have coverage!
                </p>
                <p className="text-xs text-muted-foreground">
                  Video: {suggestion.ourCoverage.videoTitle}
                </p>
                {suggestion.ourCoverage.videoViews != null &&
                  suggestion.ourCoverage.daysAgo != null && (
                    <p className="text-xs text-muted-foreground">
                      Views:{" "}
                      {suggestion.ourCoverage.videoViews.toLocaleString()} •{" "}
                      Posted {suggestion.ourCoverage.daysAgo} days ago
                    </p>
                  )}
                {suggestion.ourCoverage.daysAgo != null &&
                  suggestion.ourCoverage.daysAgo > 30 && (
                    <p className="text-xs text-yellow-600 mt-1">
                      ⚠️ Consider refreshing this content
                    </p>
                  )}
              </div>
            ) : (
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <p className="text-sm font-medium text-yellow-600">
                  💡 Content opportunity detected!
                </p>
                <p className="text-xs text-muted-foreground">
                  No existing video on this trending topic
                </p>
                {suggestion.platformGap && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚡ Platform gap: Trending on Google but not on YouTube!
                  </p>
                )}
              </div>
            )}

            {/* Related Queries */}
            {suggestion.relatedQueries.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Related searches:
                </p>
                <div className="flex flex-wrap gap-1">
                  {suggestion.relatedQueries.map((query, idx) => (
                    <span
                      key={`${query}-${idx}`}
                      className="px-2 py-1 bg-muted text-xs rounded-full"
                    >
                      {query}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Regional Performance */}
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(suggestion.regions).map(([region, data]) => (
                <div
                  key={region}
                  className={cn(
                    "p-2 rounded text-center",
                    data.trending ? "bg-primary/10" : "bg-muted/30"
                  )}
                >
                  <div className="text-lg">
                    {REGION_FLAGS[region as keyof typeof REGION_FLAGS]}
                  </div>
                  <div className="text-xs">
                    {data.trending ? (
                      <>
                        <span className="text-primary font-medium">
                          #{data.rank}
                        </span>
                        <br />
                        <span className="text-muted-foreground">
                          {data.volume}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button className="flex-1 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
                Create Video
              </button>
              <button className="flex-1 px-3 py-2 bg-muted text-sm font-medium rounded-lg hover:bg-muted/70 transition-colors">
                Research Topic
              </button>
              {suggestion.ourCoverage.hasVideo && (
                <button className="flex-1 px-3 py-2 bg-muted text-sm font-medium rounded-lg hover:bg-muted/70 transition-colors">
                  View Our Video
                </button>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
}

// YouTube Section Component
function YouTubeSection({ videos }: { videos: YouTubeTrendingVideo[] }) {
  if (videos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FiYoutube className="w-8 h-8 mx-auto mb-2" />
        <p>No YouTube trending data available</p>
        <p className="text-xs mt-2">
          YouTube API may be temporarily unavailable
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {videos.slice(0, 10).map((video, index) => (
        <m.div
          key={`${video.videoId}-${index}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/20 transition-colors"
        >
          {/* Thumbnail */}
          {video.thumbnail && (
            <Image
              src={video.thumbnail}
              alt={video.title}
              className="w-20 h-12 object-cover rounded"
              loading="lazy"
              width={80}
              height={48}
              unoptimized
            />
          )}

          {/* Content */}
          <div className="flex-1">
            <h4 className="font-medium text-sm line-clamp-1">{video.title}</h4>
            <p className="text-xs text-muted-foreground">
              {video.channelTitle}
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FiPlayCircle className="w-3 h-3" />
                {video.viewCount.toLocaleString()} views
              </span>
              <span>
                {REGION_FLAGS[video.region as keyof typeof REGION_FLAGS]}
              </span>
            </div>
          </div>

          {/* Rank */}
          <div className="text-2xl font-bold text-muted-foreground/50">
            #{index + 1}
          </div>
        </m.div>
      ))}
    </div>
  );
}

// Regional Insights Component
function RegionalInsights({ trends }: { trends: TrendingSuggestion[] }) {
  const getRegionalPattern = (trend: TrendingSuggestion) => {
    const regions = Object.entries(trend.regions)
      .filter(([_, data]) => data.trending)
      .map(([region]) => region);

    if (regions.length >= 3) {
      return { type: "viral", message: "Going viral across Southeast Asia!" };
    } else if (regions.includes("SG") && !regions.includes("MY")) {
      return {
        type: "incoming",
        message: "Trending in Singapore - likely coming to Malaysia soon",
      };
    } else if (regions.includes("ID") && !regions.includes("MY")) {
      return {
        type: "incoming",
        message: "Popular in Indonesia - potential crossover opportunity",
      };
    } else if (regions.length === 1) {
      return {
        type: "local",
        message: "Locally trending - potential first-mover advantage",
      };
    }
    return { type: "emerging", message: "Emerging trend to watch" };
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <FiActivity className="w-4 h-4" />
        Regional Intelligence
      </h4>
      <div className="grid gap-2">
        {trends.map((trend) => {
          const pattern = getRegionalPattern(trend);
          return (
            <div
              key={trend.title}
              className="p-2 bg-muted/30 rounded-lg text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{trend.title}</span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full",
                    pattern.type === "viral"
                      ? "bg-red-500/10 text-red-500"
                      : pattern.type === "incoming"
                        ? "bg-yellow-500/10 text-yellow-500"
                        : pattern.type === "local"
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-muted text-muted-foreground"
                  )}
                >
                  {pattern.type}
                </span>
              </div>
              <p className="text-muted-foreground mt-1">{pattern.message}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
