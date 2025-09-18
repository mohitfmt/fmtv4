// lib/dashboard/google-trends.ts - Version 2 with all critical fixes
import { prisma } from "@/lib/prisma";
import Parser from "rss-parser";
import { youtube } from "@/lib/youtube-client";
import { cache } from "./cache";
import { subDays } from "date-fns";

// Types
export interface RegionalTrendData {
  keyword: string;
  approximateTraffic: string;
  relatedNews: {
    title: string;
    snippet: string;
    source: string;
    url: string;
  }[];
  publishedAt: Date;
  region: string;
}

export interface YouTubeTrendingVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  viewCount: number;
  likeCount: number;
  publishedAt: Date;
  thumbnail: string;
  tags: string[];
  region: string;
}

export interface TrendingSuggestion {
  title: string;
  searchVolume: string;
  trend: "up" | "down" | "stable" | "explosive";
  trendPercentage: number;
  category: string;
  relatedQueries: string[];
  regions: {
    MY: { trending: boolean; volume?: string; rank?: number };
    SG: { trending: boolean; volume?: string; rank?: number };
    ID: { trending: boolean; volume?: string; rank?: number };
    TH: { trending: boolean; volume?: string; rank?: number };
  };
  movement: "spreading" | "declining" | "stable" | "regional-only";
  ourCoverage: {
    hasVideo: boolean;
    videoId?: string;
    videoTitle?: string;
    videoViews?: number;
    daysAgo?: number;
  };
  score: number;
  source: "google_trends" | "youtube" | "mixed";
  firstSeenAt?: Date;
  platformGap?: boolean;
}

export interface ContentSuggestions {
  trending: TrendingSuggestion[];
  seasonal: TrendingSuggestion[];
  contentGaps: string[];
  regional: {
    MY: TrendingSuggestion[];
    SG: TrendingSuggestion[];
    ID: TrendingSuggestion[];
    TH: TrendingSuggestion[];
  };
  youtube: YouTubeTrendingVideo[];
  lastUpdated: string;
  source: "google" | "youtube" | "mixed";
  nextUpdate: string;
  error?: string;
}

// Constants
const REGIONS = ["MY", "SG", "ID", "TH"] as const;
const RSS_BASE_URL = "https://trends.google.com/trending/rss";
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours
const parser = new Parser({
  customFields: {
    item: [
      ["ht:approx_traffic", "traffic"],
      ["ht:news_item", "newsItems", { keepArray: true }],
      ["ht:picture", "picture"],
      ["pubDate", "publishedAt"],
    ],
  },
});

// Normalize strings for fuzzy matching
function normalizeString(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Robust RSS fetching with User-Agent and retry
async function fetchGoogleTrendsRSS(
  region: string
): Promise<RegionalTrendData[]> {
  const url = `${RSS_BASE_URL}?geo=${region}`;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      attempts++;

      // First fetch the XML with proper User-Agent
      const response = await fetch(url, {
        headers: {
          "User-Agent": "FMT-Content-Intel/1.0 (Compatible; Node.js)",
          Accept: "application/rss+xml, application/xml, text/xml",
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      const feed = await parser.parseString(xmlText);

      return feed.items.map((item) => {
        const newsItems = item.newsItems || [];
        const relatedNews = newsItems.map((news: any) => ({
          title: news["ht:news_item_title"] || "",
          snippet: news["ht:news_item_snippet"] || "",
          source: news["ht:news_item_source"] || "",
          url: news["ht:news_item_url"] || "",
        }));

        return {
          keyword: item.title || "",
          approximateTraffic: item.traffic || "10K+",
          relatedNews,
          publishedAt: new Date(item.publishedAt || Date.now()),
          region,
        };
      });
    } catch (error) {
      console.error(`Attempt ${attempts} failed for ${region}:`, error);
      if (attempts >= maxAttempts) {
        console.error(
          `Failed to fetch Google Trends for ${region} after ${maxAttempts} attempts`
        );
        return [];
      }
      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
    }
  }

  return [];
}

// Fetch YouTube trending videos for a region
async function fetchYouTubeTrending(
  region: string
): Promise<YouTubeTrendingVideo[]> {
  try {
    const response = await youtube.videos.list({
      part: ["snippet", "statistics"],
      chart: "mostPopular",
      regionCode: region,
      maxResults: 10,
      fields:
        "items(id,snippet(title,channelTitle,publishedAt,thumbnails,tags),statistics(viewCount,likeCount))",
    });

    return (response.data.items || []).map((video) => ({
      videoId: video.id as string,
      title: video.snippet?.title || "",
      channelTitle: video.snippet?.channelTitle || "",
      viewCount: parseInt(video.statistics?.viewCount || "0"),
      likeCount: parseInt(video.statistics?.likeCount || "0"),
      publishedAt: new Date(video.snippet?.publishedAt || Date.now()),
      thumbnail: video.snippet?.thumbnails?.high?.url || "",
      tags: video.snippet?.tags || [],
      region,
    }));
  } catch (error) {
    console.error(`Failed to fetch YouTube trending for ${region}:`, error);
    return [];
  }
}

// Batch fetch all videos for matching (fixes N+1 problem)
async function fetchOurVideos() {
  try {
    const videos = await prisma.videos.findMany({
      where: {
        isActive: true,
        publishedAt: { gte: subDays(new Date(), 90) }, // Last 90 days
      },
      select: {
        videoId: true,
        title: true,
        tags: true,
        statistics: true,
        publishedAt: true,
        searchableText: true,
      },
      orderBy: { publishedAt: "desc" },
    });

    return videos;
  } catch (error) {
    console.error("Failed to fetch our videos:", error);
    return [];
  }
}

// Match trend with our videos (in-memory, no DB calls)
function matchWithOurVideos(keyword: string, ourVideos: any[]) {
  const normalizedKeyword = normalizeString(keyword);
  const keywords = normalizedKeyword.split(" ");

  // Find best matching video
  const matchedVideo = ourVideos.find((video) => {
    const normalizedTitle = normalizeString(video.title);
    const normalizedTags = (video.tags || []).map((t: string) =>
      normalizeString(t)
    );
    const normalizedSearchable = normalizeString(video.searchableText || "");

    // Check if title contains the keyword
    if (normalizedTitle.includes(normalizedKeyword)) return true;

    // Check if all keyword parts are in title
    if (keywords.every((kw) => normalizedTitle.includes(kw))) return true;

    // Check tags
    if (normalizedTags.some((tag: string) => tag.includes(normalizedKeyword)))
      return true;
    if (
      normalizedTags.some((tag: string) =>
        keywords.every((kw) => tag.includes(kw))
      )
    )
      return true;

    // Check searchable text
    if (normalizedSearchable.includes(normalizedKeyword)) return true;

    return false;
  });

  if (matchedVideo) {
    const viewCount =
      typeof matchedVideo.statistics === "object"
        ? Number((matchedVideo.statistics as any).viewCount || 0)
        : 0;

    const daysAgo = Math.floor(
      (Date.now() - new Date(matchedVideo.publishedAt).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return {
      hasVideo: true,
      videoId: matchedVideo.videoId,
      videoTitle: matchedVideo.title,
      videoViews: viewCount,
      daysAgo,
    };
  }

  return { hasVideo: false };
}

// Calculate opportunity score
function calculateOpportunityScore(
  suggestion: Partial<TrendingSuggestion>,
  hasYouTubeTrend: boolean
): number {
  let score = 50; // Base score

  // Regional spread bonus (up to 30 points)
  const regionCount = Object.values(suggestion.regions || {}).filter(
    (r) => r.trending
  ).length;
  score += regionCount * 7.5;

  // Movement bonus
  if (suggestion.movement === "spreading") score += 15;
  if (suggestion.movement === "regional-only") score += 5;

  // Coverage penalty/bonus
  if (!suggestion.ourCoverage?.hasVideo) {
    score += 20; // Opportunity bonus
  } else if (
    suggestion.ourCoverage.daysAgo &&
    suggestion.ourCoverage.daysAgo > 30
  ) {
    score += 10; // Refresh opportunity
  }

  // Platform gap bonus
  if (!hasYouTubeTrend && suggestion.source === "google_trends") {
    score += 15; // Video opportunity
  }

  // Volume impact
  const volumeStr = suggestion.searchVolume || "0";
  const volume = parseInt(volumeStr.replace(/[^0-9]/g, ""));
  if (volume > 100000) score += 15;
  else if (volume > 50000) score += 10;
  else if (volume > 20000) score += 5;

  return Math.min(100, Math.round(score));
}

// Determine category from keywords and related news
function determineCategory(keyword: string, relatedNews: any[] = []): string {
  const lower = keyword.toLowerCase();
  const newsBlob = relatedNews
    .map((n) => n.title)
    .join(" ")
    .toLowerCase();
  const combined = lower + " " + newsBlob;

  if (
    combined.includes("budget") ||
    combined.includes("tax") ||
    combined.includes("subsidy")
  )
    return "Finance";
  if (
    combined.includes("iphone") ||
    combined.includes("samsung") ||
    combined.includes("tech") ||
    combined.includes("gadget")
  )
    return "Technology";
  if (
    combined.includes("recipe") ||
    combined.includes("food") ||
    combined.includes("restaurant") ||
    combined.includes("makan")
  )
    return "Food";
  if (
    combined.includes("football") ||
    combined.includes("sports") ||
    combined.includes("match") ||
    combined.includes("league")
  )
    return "Sports";
  if (
    combined.includes("sale") ||
    combined.includes("shopping") ||
    combined.includes("deals") ||
    combined.includes("discount")
  )
    return "Shopping";
  if (
    combined.includes("movie") ||
    combined.includes("drama") ||
    combined.includes("netflix") ||
    combined.includes("series")
  )
    return "Entertainment";
  if (
    combined.includes("travel") ||
    combined.includes("holiday") ||
    combined.includes("tourism") ||
    combined.includes("visit")
  )
    return "Travel";
  if (
    combined.includes("malaysia") ||
    combined.includes("merdeka") ||
    combined.includes("government") ||
    combined.includes("election")
  )
    return "National";
  if (
    combined.includes("health") ||
    combined.includes("covid") ||
    combined.includes("vaccine") ||
    combined.includes("doctor")
  )
    return "Health";

  return "General";
}

// Get seasonal trends based on current date
async function getSeasonalTrends(
  ourVideos: any[]
): Promise<TrendingSuggestion[]> {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();
  const seasonal: TrendingSuggestion[] = [];

  // Malaysian seasonal events
  const seasonalEvents = [
    {
      month: 0,
      day: 1,
      keyword: "New Year Resolution Malaysia",
      category: "Lifestyle",
    },
    { month: 0, day: 26, keyword: "CNY Preparation", category: "Culture" },
    {
      month: 1,
      day: 14,
      keyword: "Valentine's Day Ideas",
      category: "Lifestyle",
    },
    { month: 2, day: 20, keyword: "Ramadan Preparation", category: "Religion" },
    { month: 3, day: 10, keyword: "Hari Raya Shopping", category: "Culture" },
    { month: 7, day: 31, keyword: "Merdeka Celebration", category: "National" },
    { month: 8, day: 16, keyword: "Malaysia Day", category: "National" },
    {
      month: 9,
      day: 15,
      keyword: "Deepavali Preparation",
      category: "Culture",
    },
    {
      month: 10,
      day: 11,
      keyword: "11.11 Sale Malaysia",
      category: "Shopping",
    },
    { month: 11, day: 12, keyword: "12.12 Sale", category: "Shopping" },
    {
      month: 11,
      day: 25,
      keyword: "Christmas Shopping Malaysia",
      category: "Shopping",
    },
  ];

  // Find relevant seasonal events (within 14 days)
  for (const event of seasonalEvents) {
    const eventDate = new Date(now.getFullYear(), event.month, event.day);
    const daysUntil = Math.ceil(
      (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (Math.abs(daysUntil) <= 14) {
      const coverage = matchWithOurVideos(event.keyword, ourVideos);

      seasonal.push({
        title: event.keyword,
        searchVolume: "50K+ (est)",
        trend: daysUntil > 0 ? "up" : "down",
        trendPercentage: daysUntil > 0 ? 100 : -50,
        category: event.category,
        relatedQueries: [],
        regions: {
          MY: { trending: true, volume: "50K+" },
          SG: { trending: false },
          ID: { trending: false },
          TH: { trending: false },
        },
        movement: "regional-only",
        ourCoverage: coverage,
        score: calculateOpportunityScore(
          {
            searchVolume: "50K+",
            movement: "regional-only",
            ourCoverage: coverage,
            regions: {
              MY: { trending: true },
              SG: { trending: false },
              ID: { trending: false },
              TH: { trending: false },
            },
          },
          false
        ),
        source: "google_trends",
      });
    }
  }

  return seasonal;
}

// Main function to get content suggestions
export async function getContentSuggestions(): Promise<ContentSuggestions> {
  const cacheKey = "content-suggestions-v2";
  const cached = cache.get<ContentSuggestions>(cacheKey);

  if (cached && process.env.NODE_ENV === "production") {
    return cached;
  }

  try {
    // First, batch fetch our videos (no N+1!)
    const ourVideos = await fetchOurVideos();

    // Fetch previous trending data for rank comparison
    const previousTrends = await prisma.trendingTopic.findMany({
      where: {
        source: "google_trends",
        lastSeen: { gte: subDays(new Date(), 7) },
      },
      select: {
        keyword: true,
        regions: true,
      },
    });

    // Create lookup for previous ranks
    const prevRankLookup = new Map<string, any>();
    previousTrends.forEach((trend: any) => {
      prevRankLookup.set(normalizeString(trend.keyword), trend.regions);
    });

    // Fetch data from all regions in parallel
    const [googleTrendsData, youtubeData] = await Promise.all([
      Promise.all(REGIONS.map((region) => fetchGoogleTrendsRSS(region))),
      Promise.all(REGIONS.map((region) => fetchYouTubeTrending(region))),
    ]);

    // Create region maps
    const googleTrendsByRegion = new Map<string, RegionalTrendData[]>();
    const youtubeTrendsByRegion = new Map<string, YouTubeTrendingVideo[]>();

    REGIONS.forEach((region, index) => {
      googleTrendsByRegion.set(region, googleTrendsData[index]);
      youtubeTrendsByRegion.set(region, youtubeData[index]);
    });

    // Create YouTube title/tag index for fuzzy platform gap detection
    const youtubeIndex = youtubeData.flat().map((v) => ({
      title: normalizeString(v.title),
      tags: (v.tags || []).map(normalizeString),
    }));

    // Aggregate trends across regions with proper per-trend tracking
    const aggregatedTrends = new Map<
      string,
      TrendingSuggestion & { _regionsHit?: Set<string> }
    >();

    for (const [region, trends] of googleTrendsByRegion) {
      for (const trend of trends) {
        const key = normalizeString(trend.keyword);

        if (!aggregatedTrends.has(key)) {
          const coverage = matchWithOurVideos(trend.keyword, ourVideos);

          aggregatedTrends.set(key, {
            title: trend.keyword,
            searchVolume: trend.approximateTraffic,
            trend: "stable", // Will be updated based on rank delta
            trendPercentage: 0, // Will be calculated
            category: determineCategory(trend.keyword, trend.relatedNews),
            relatedQueries: trend.relatedNews.map((n) => n.title).slice(0, 5),
            regions: {
              MY: { trending: false },
              SG: { trending: false },
              ID: { trending: false },
              TH: { trending: false },
            },
            movement: "stable",
            ourCoverage: coverage,
            score: 0,
            source: "google_trends",
            firstSeenAt: trend.publishedAt,
            _regionsHit: new Set<string>(),
          });
        }

        const existing = aggregatedTrends.get(key)!;
        existing._regionsHit?.add(region);
        existing.regions[region as keyof typeof existing.regions] = {
          trending: true,
          volume: trend.approximateTraffic,
          rank: trends.indexOf(trend) + 1,
        };
      }
    }

    // Calculate per-trend movement and platform gap
    aggregatedTrends.forEach((trend, key) => {
      // Movement based on regions where THIS trend appears
      const regionCount = trend._regionsHit?.size || 0;
      if (regionCount >= 3) trend.movement = "spreading";
      else if (regionCount === 1) trend.movement = "regional-only";
      else trend.movement = "stable";

      // Platform gap with fuzzy matching
      const trendNorm = normalizeString(trend.title);
      const hasYouTubeTrend = youtubeIndex.some(
        (yt) =>
          yt.title.includes(trendNorm) ||
          trendNorm.split(" ").some((word) => yt.title.includes(word)) ||
          yt.tags.some((tag) => tag.includes(trendNorm))
      );
      trend.platformGap = !hasYouTubeTrend;

      // Calculate trend percentage based on rank delta
      const prevRanks = prevRankLookup.get(key);
      if (prevRanks && typeof prevRanks === "object") {
        const deltas = [];

        for (const region of REGIONS) {
          const currRank = trend.regions[region].rank;
          const prevRank = prevRanks[region]?.rank;

          if (currRank && prevRank) {
            if (prevRank > currRank) {
              deltas.push(50); // Improved rank
            } else if (prevRank < currRank) {
              deltas.push(-30); // Declined rank
            } else {
              deltas.push(0); // Same rank
            }
          }
        }

        trend.trendPercentage = deltas.length > 0 ? Math.max(...deltas) : 0;
      } else {
        // New trend
        trend.trendPercentage = 100;
      }

      // Set trend direction
      if (trend.trendPercentage >= 50) trend.trend = "explosive";
      else if (trend.trendPercentage > 0) trend.trend = "up";
      else if (trend.trendPercentage < 0) trend.trend = "down";
      else trend.trend = "stable";

      // Calculate final score
      trend.score = calculateOpportunityScore(trend, !trend.platformGap);

      // Clean up internal tracking
      delete (trend as any)._regionsHit;
    });

    // Convert to array and sort by score
    const trendingArray = Array.from(aggregatedTrends.values()).sort(
      (a, b) => b.score - a.score
    );

    // Get seasonal trends
    const seasonal = await getSeasonalTrends(ourVideos);

    // Identify content gaps
    const contentGaps = trendingArray
      .filter((t) => !t.ourCoverage.hasVideo && t.score > 70)
      .map((t) => `Create video about: ${t.title}`)
      .slice(0, 10);

    // Organize by region
    const regional = {
      MY: trendingArray.filter((t) => t.regions.MY.trending).slice(0, 10),
      SG: trendingArray.filter((t) => t.regions.SG.trending).slice(0, 10),
      ID: trendingArray.filter((t) => t.regions.ID.trending).slice(0, 10),
      TH: trendingArray.filter((t) => t.regions.TH.trending).slice(0, 10),
    };

    const suggestions: ContentSuggestions = {
      trending: trendingArray.slice(0, 15),
      seasonal,
      contentGaps,
      regional,
      youtube: youtubeData.flat().slice(0, 20),
      lastUpdated: new Date().toISOString(),
      source: "mixed",
      nextUpdate: new Date(Date.now() + CACHE_TTL).toISOString(),
    };

    // Cache for 2 hours
    cache.set(cacheKey, suggestions, CACHE_TTL);

    // Store in database for historical tracking (in background)
    storeTrendingTopics(trendingArray).catch(console.error);

    return suggestions;
  } catch (error) {
    console.error("Failed to fetch content suggestions:", error);

    // Return cached version if available, even if expired
    if (cached) {
      return { ...cached, error: "Using cached data due to fetch error" };
    }

    // Return empty suggestions with error state
    return {
      trending: [],
      seasonal: [],
      contentGaps: [],
      regional: { MY: [], SG: [], ID: [], TH: [] },
      youtube: [],
      lastUpdated: new Date().toISOString(),
      source: "google",
      nextUpdate: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      error: "Failed to fetch trends. Check connectivity and try again.",
    };
  }
}

// Store trending topics for historical tracking (async, non-blocking)
async function storeTrendingTopics(trends: TrendingSuggestion[]) {
  try {
    const operations = trends.slice(0, 20).map((trend) => ({
      where: {
        keyword_source: {
          keyword: trend.title,
          source: "google_trends",
        },
      },
      update: {
        volume: parseInt(trend.searchVolume.replace(/[^0-9]/g, "")) || 0,
        velocity: trend.trendPercentage,
        lastSeen: new Date(),
        regions: trend.regions,
        ourVideos: trend.ourCoverage.videoId ? [trend.ourCoverage.videoId] : [],
        category: trend.category,
      },
      create: {
        keyword: trend.title,
        source: "google_trends",
        volume: parseInt(trend.searchVolume.replace(/[^0-9]/g, "")) || 0,
        velocity: trend.trendPercentage,
        firstSeen: new Date(),
        lastSeen: new Date(),
        region: "MY",
        regions: trend.regions,
        ourVideos: trend.ourCoverage.videoId ? [trend.ourCoverage.videoId] : [],
        category: trend.category,
      },
    }));

    await prisma.$transaction(
      operations.map((op) => prisma.trendingTopic.upsert(op))
    );
  } catch (error) {
    console.error("Failed to store trending topics:", error);
  }
}

// Export helper to get recommendation score
export function getRecommendationScore(suggestion: TrendingSuggestion): number {
  return suggestion.score;
}
