// lib/dashboard/google-trends.ts
import { TRENDS_CONFIG } from "./constants";

export interface TrendingSuggestion {
  title: string;
  searchVolume: string;
  trend: "rising" | "breakout" | "stable";
  trendPercentage: number;
  category: string;
  relatedQueries: string[];
  contentGap: boolean; // True if you haven't covered this topic
}

export interface ContentSuggestions {
  trending: TrendingSuggestion[];
  seasonal: TrendingSuggestion[];
  evergreen: TrendingSuggestion[];
  contentGaps: string[];
  lastUpdated: string;
}

/**
 * Mock Google Trends data for Malaysia
 * In production, you'd use google-trends-api package or scraping
 */
async function fetchTrendingTopics(): Promise<TrendingSuggestion[]> {
  // Simulated trending topics for Malaysia
  // In production, use: npm install google-trends-api

  const mockTrends: TrendingSuggestion[] = [
    {
      title: "Budget 2025 Malaysia",
      searchVolume: "100K+",
      trend: "breakout",
      trendPercentage: 250,
      category: "News & Politics",
      relatedQueries: ["income tax 2025", "subsidy rahmah", "epf withdrawal"],
      contentGap: true,
    },
    {
      title: "iPhone 16 Review",
      searchVolume: "50K+",
      trend: "rising",
      trendPercentage: 180,
      category: "Technology",
      relatedQueries: [
        "iPhone 16 vs 15",
        "iPhone 16 price Malaysia",
        "iPhone 16 camera test",
      ],
      contentGap: true,
    },
    {
      title: "Deepavali 2025",
      searchVolume: "75K+",
      trend: "rising",
      trendPercentage: 120,
      category: "Culture",
      relatedQueries: [
        "Deepavali recipes",
        "Deepavali decoration",
        "Deepavali wishes",
      ],
      contentGap: false,
    },
    {
      title: "AI Tools Malaysia",
      searchVolume: "30K+",
      trend: "rising",
      trendPercentage: 95,
      category: "Technology",
      relatedQueries: [
        "ChatGPT Malaysia",
        "AI for business",
        "AI courses Malaysia",
      ],
      contentGap: true,
    },
    {
      title: "Property Market 2025",
      searchVolume: "40K+",
      trend: "stable",
      trendPercentage: 15,
      category: "Finance",
      relatedQueries: [
        "house price Malaysia",
        "property investment",
        "first time buyer",
      ],
      contentGap: true,
    },
  ];

  return mockTrends;
}

/**
 * Get seasonal trends based on time of year
 */
async function getSeasonalTrends(): Promise<TrendingSuggestion[]> {
  const month = new Date().getMonth();
  const seasonalTopics: { [key: number]: TrendingSuggestion[] } = {
    0: [
      // January
      {
        title: "New Year Resolutions",
        searchVolume: "80K+",
        trend: "rising",
        trendPercentage: 150,
        category: "Lifestyle",
        relatedQueries: ["fitness goals", "career planning", "savings plan"],
        contentGap: true,
      },
    ],
    1: [
      // February
      {
        title: "Chinese New Year 2025",
        searchVolume: "200K+",
        trend: "breakout",
        trendPercentage: 300,
        category: "Culture",
        relatedQueries: ["ang pow rate", "CNY recipes", "lion dance"],
        contentGap: false,
      },
    ],
    3: [
      // April
      {
        title: "Ramadan Preparation",
        searchVolume: "150K+",
        trend: "rising",
        trendPercentage: 200,
        category: "Culture",
        relatedQueries: ["sahur recipes", "bazar ramadan", "tarawih prayers"],
        contentGap: false,
      },
    ],
    9: [
      // October
      {
        title: "Deepavali Shopping",
        searchVolume: "90K+",
        trend: "rising",
        trendPercentage: 175,
        category: "Culture",
        relatedQueries: ["saree trends", "deepavali offers", "kolam designs"],
        contentGap: true,
      },
    ],
    11: [
      // December
      {
        title: "Year End Sale Malaysia",
        searchVolume: "120K+",
        trend: "breakout",
        trendPercentage: 250,
        category: "Shopping",
        relatedQueries: ["best deals", "online shopping", "warehouse sale"],
        contentGap: true,
      },
    ],
  };

  return seasonalTopics[month] || [];
}

/**
 * Get evergreen content suggestions
 */
function getEvergreenTopics(): TrendingSuggestion[] {
  return [
    {
      title: "How to Start a Business in Malaysia",
      searchVolume: "25K+",
      trend: "stable",
      trendPercentage: 0,
      category: "Business",
      relatedQueries: ["SSM registration", "business loan", "startup grants"],
      contentGap: true,
    },
    {
      title: "Malaysian Food Tour",
      searchVolume: "35K+",
      trend: "stable",
      trendPercentage: 5,
      category: "Food & Travel",
      relatedQueries: ["best nasi lemak", "street food KL", "penang food"],
      contentGap: false,
    },
    {
      title: "Learn Bahasa Malaysia",
      searchVolume: "20K+",
      trend: "stable",
      trendPercentage: 10,
      category: "Education",
      relatedQueries: ["BM for beginners", "Malay phrases", "BM online course"],
      contentGap: true,
    },
  ];
}

/**
 * Analyze content gaps based on existing videos
 */
export async function analyzeContentGaps(
  existingVideoTitles: string[]
): Promise<string[]> {
  const trends = await fetchTrendingTopics();
  const gaps: string[] = [];

  // Simple keyword matching - in production, use NLP
  trends.forEach((trend) => {
    const keywords = trend.title.toLowerCase().split(" ");
    const covered = existingVideoTitles.some((title) => {
      const titleLower = title.toLowerCase();
      return keywords.some((keyword) => titleLower.includes(keyword));
    });

    if (!covered && trend.trendPercentage > 50) {
      gaps.push(trend.title);
    }
  });

  // Add some strategic gaps
  const strategicGaps = [
    "Live Streaming Setup Guide",
    "YouTube Shorts Strategy 2025",
    "Content Calendar Planning",
    "Video SEO Optimization",
    "Thumbnail Design Tips",
  ];

  return [...gaps, ...strategicGaps].slice(0, 10);
}

/**
 * Get content suggestions with AI insights
 */
export async function getContentSuggestions(
  existingVideoTitles: string[] = []
): Promise<ContentSuggestions> {
  try {
    const [trending, seasonal] = await Promise.all([
      fetchTrendingTopics(),
      getSeasonalTrends(),
    ]);

    const evergreen = getEvergreenTopics();
    const contentGaps = await analyzeContentGaps(existingVideoTitles);

    // Mark content gaps
    trending.forEach((item) => {
      item.contentGap = !existingVideoTitles.some((title) =>
        title.toLowerCase().includes(item.title.toLowerCase().split(" ")[0])
      );
    });

    return {
      trending: trending.slice(0, TRENDS_CONFIG.SUGGESTIONS_LIMIT),
      seasonal,
      evergreen: evergreen.slice(0, 3),
      contentGaps,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Failed to get content suggestions:", error);

    // Return fallback suggestions
    return {
      trending: [],
      seasonal: [],
      evergreen: getEvergreenTopics().slice(0, 3),
      contentGaps: [
        "Trending Topic Analysis",
        "Content Strategy Guide",
        "Audience Engagement Tips",
      ],
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Format suggestion for display
 */
export function formatSuggestion(suggestion: TrendingSuggestion): string {
  const trendIcon =
    suggestion.trend === "breakout"
      ? "🔥"
      : suggestion.trend === "rising"
        ? "📈"
        : "→";

  const changeText =
    suggestion.trendPercentage > 0
      ? `+${suggestion.trendPercentage}%`
      : `${suggestion.trendPercentage}%`;

  return `${trendIcon} ${suggestion.title} ${changeText}`;
}

/**
 * Get content recommendation score
 */
export function getRecommendationScore(suggestion: TrendingSuggestion): number {
  let score = 50; // Base score

  // Trend factor
  if (suggestion.trend === "breakout") score += 30;
  else if (suggestion.trend === "rising") score += 20;

  // Volume factor
  const volume = parseInt(suggestion.searchVolume.replace(/[^0-9]/g, ""));
  if (volume > 100000) score += 20;
  else if (volume > 50000) score += 10;

  // Content gap factor
  if (suggestion.contentGap) score += 15;

  return Math.min(100, score);
}
