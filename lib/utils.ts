import { DEFAULT_TAGS } from "@/constants/default-tags";
// import { OrgJsonLD } from "@/constants/jsonlds/org";
import siteConfig from "@/constants/site-config";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CategoryNode {
  name: string;
  id: string;
  slug?: string;
}

interface CategoryEdge {
  node: CategoryNode;
}

// Category display name mappings (CMS name → Frontend display name)
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  "Simple Stories": "Everyday Heroes",
  "simple-stories": "Everyday Heroes",
  // Add more mappings here if needed in future
};

export const getPreferredCategory = (
  categories?: CategoryEdge[]
): CategoryEdge => {
  // Default category
  const defaultCategory = {
    node: {
      name: "GENERAL",
      id: "default-category",
      slug: "general",
    },
  };

  // Return default if categories is undefined or empty
  if (!categories || categories.length === 0) {
    return defaultCategory;
  }

  const filteredCategories = categories.filter((category) => {
    const categoryName = category?.node?.name?.toLowerCase();
    return !(
      categoryName?.startsWith("top") ||
      categoryName?.includes("highlight") ||
      categoryName?.includes("super") ||
      categoryName?.includes("lifestyle")
    );
  });

  if (filteredCategories.length === 0) {
    return defaultCategory;
  }

  const sportCategory = filteredCategories.find(
    (category) =>
      category?.node?.name?.toLowerCase() !== "sports" &&
      category?.node?.slug !== "sports"
  );

  const selectedCategory =
    sportCategory ||
    filteredCategories.reduce((shortest, current) => {
      if (
        !shortest ||
        current?.node?.name?.length < shortest?.node?.name?.length
      ) {
        return current;
      }
      return shortest;
    }, defaultCategory);

  // Apply display name mapping
  const displayName =
    CATEGORY_DISPLAY_NAMES[selectedCategory.node.name] ||
    CATEGORY_DISPLAY_NAMES[selectedCategory.node.slug || ""] ||
    selectedCategory.node.name;

  return {
    ...selectedCategory,
    node: {
      ...selectedCategory.node,
      name: displayName,
    },
  };
};

export const generateCollectionPageJsonLD = ({
  heroPosts,
  highlightPosts,
  topNewsPosts,
  businessPosts,
  opinionPosts,
  worldPosts,
  leisurePosts,
  sportsPosts,
  beritaPosts,
  videoPosts,
  columnists,
}: any) => {
  const baseUrl = siteConfig.baseUrl;

  const createArticleLD = (posts: any[], categoryName: string) => {
    return posts?.map((post) => ({
      "@type": "NewsArticle",
      headline: post?.title || "Article Headline",
      section: categoryName,
      url: `${baseUrl}${post?.uri}`,
      datePublished: post?.dateGmt
        ? post?.dateGmt + "Z"
        : new Date().toISOString(),
      author: {
        "@type": "Person",
        name: post?.author?.node?.name || "FMT Reporter",
        url: post?.author?.node
          ? `${baseUrl}/category/authors/${post?.author?.node?.slug}`
          : `${baseUrl}/category/authors/fmt-reporters`,
      },
      image: post?.featuredImage?.node?.sourceUrl,
      imageObject: {
        "@context": "https://schema.org",
        "@type": "ImageObject",
        contentUrl: post?.featuredImage?.node?.sourceUrl,
        creditText: post?.featuredImage?.node?.altText || "Image Credit",
        width: 1600,
        height: 1000,
        copyrightNotice: "© Free Malaysia Today, since 2009",
        acquireLicensePage: `${baseUrl}/disclaimers-copyright`,
        creator: {
          "@type": "Organization",
          name: "Free Malaysia Today",
          url: baseUrl,
        },
        license: "https://creativecommons.org/licenses/by/4.0/",
      },
      articleSection:
        post?.categories?.nodes?.map((catName: any) => catName.name) || [],
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `${baseUrl}${post?.uri}`,
      },
    }));
  };

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Free Malaysia Today | Free and Independent News",
    url: baseUrl,
    description:
      "Explore 24/7 news on politics, economy, and more with Free Malaysia Today. Your source for unbiased Malaysian news in English & Malay since 2009.",
    mainEntityOfPage: {
      "@type": "CollectionPage",
      headline: "Free Malaysia Today | Homepage",
      description:
        "The homepage of FMT News featuring current articles on multiple categories such as Top News, Business, Sports, and more.",
      url: baseUrl,
      hasPart: [
        {
          "@type": "CollectionPage",
          headline: "Breaking News",
          about: "The latest breaking news in Malaysia.",
          hasPart: createArticleLD(heroPosts, "top-news"),
        },
        {
          "@type": "CollectionPage",
          headline: "Top highlights",
          about: "The latest highlights in Malaysia.",
          hasPart: createArticleLD(highlightPosts, "top-news"),
        },
        {
          "@type": "CollectionPage",
          headline: "Top News",
          about: "The latest top news in Malaysia.",
          hasPart: createArticleLD(topNewsPosts, "top-news"),
        },
        {
          "@type": "CollectionPage",
          headline: "Business News",
          about: "The latest business and finance news.",
          hasPart: createArticleLD(businessPosts, "business"),
        },
        {
          "@type": "CollectionPage",
          headline: "Opinion",
          about: "Opinion articles from various columnists.",
          hasPart: createArticleLD(opinionPosts, "opinion"),
        },
        {
          "@type": "CollectionPage",
          headline: "World News",
          about: "World news from various countries.",
          hasPart: createArticleLD(worldPosts, "world"),
        },
        {
          "@type": "CollectionPage",
          headline: "Leisure News",
          about: "Leisure and lifestyle news.",
          hasPart: createArticleLD(leisurePosts, "leisure"),
        },
        {
          "@type": "CollectionPage",
          headline: "Sports News",
          about: "Latest sports news.",
          hasPart: createArticleLD(sportsPosts, "sports"),
        },
        {
          "@type": "CollectionPage",
          headline: "Berita Utama",
          about: "The latest headlines in Bahasa Malaysia.",
          hasPart: createArticleLD(beritaPosts, "berita-utama"),
        },
        {
          "@type": "CollectionPage",
          headline: "Latest Videos",
          about: "Latest videos on FMT News.",
          hasPart: videoPosts?.map((video: any) => ({
            "@type": "VideoObject",
            "@id": `https://www.youtube.com/watch?v=${video?.id}`,
            headline: video?.title || "FMT Video",
            name: video?.title || "FMT Video",
            description:
              video?.description?.substring(0, 200) || video?.title || "",
            thumbnailUrl:
              video?.thumbnails?.high ||
              video?.thumbnails?.maxres ||
              `https://i.ytimg.com/vi/${video?.id}/default.jpg`,
            uploadDate: video?.publishedAt,
            contentUrl: `https://www.youtube.com/watch?v=${video?.videoId}`,
            embedUrl: `https://www.youtube.com/embed/${video?.videoId}`,
            duration: video?.duration || "PT0M1S",
            author: {
              "@type": "NewsMediaOrganization",
              name: "Free Malaysia Today",
              url: "https://www.freemalaysiatoday.com/",
            },
            interactionStatistic: {
              "@type": "InteractionCounter",
              interactionType: { "@type": "WatchAction" },
              userInteractionCount: parseInt(video?.viewCount || "0"),
            },
            publisher: {
              "@type": "NewsMediaOrganization",
              name: "Free Malaysia Today",
            },
            isFamilyFriendly: true,
            caption: video?.title,
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `${baseUrl}${video?.url}` || baseUrl,
            },
          })),
        },
        {
          "@type": "CollectionPage",
          headline: "Columnists",
          about: "Opinion articles written by FMT columnists.",
          hasPart: columnists?.map((columnist: any) => ({
            "@type": "Person",
            name: columnist?.name || "Columnist Name",
            url: `${baseUrl}/category/authors/{columnist?.slug}`,
            jobTitle: "Columnist",
            description: columnist?.description || "Columnist description",
          })),
        },
      ],
    },
    // publisher: OrgJsonLD,
  };
};

export const calculateCacheDuration = () => {
  const now = new Date();
  const noon = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
    0,
    0
  );
  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0
  );

  const nextUpdate = now.getHours() < 12 ? noon : midnight;
  const duration = Math.max(
    1,
    Math.floor((nextUpdate.getTime() - now.getTime()) / 1000)
  );

  return duration;
};

export const stripHTML = (html: string) => {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8217;/g, "'") // Apostrophe
    .replace(/&#8216;/g, "'") // Left single quote
    .replace(/&#8211;/g, "-") // En dash
    .replace(/&#8212;/g, "-") // Em dash
    .replace(/&#8230;/g, "...") // Ellipsis
    .replace(/&#8220;/g, '"') // Left double quote
    .replace(/&#8221;/g, '"') // Right double quote
    .replace(/&[a-z0-9#]+;/gi, (match) => {
      // Handle other HTML entities
      const entities: Record<string, string> = {
        "&apos;": "'",
        "&ndash;": "-",
        "&mdash;": "-",
        "&hellip;": "...",
        "&ldquo;": '"',
        "&rdquo;": '"',
        "&lsquo;": "'",
        "&rsquo;": "'",
      };
      return entities[match] || match;
    })
    .trim();
};

export const parseISO8601DurationToSeconds = (duration: string) => {
  try {
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = duration.match(regex);

    if (!matches) {
      throw new Error("Invalid ISO 8601 duration format");
    }

    const hours = matches[1] ? parseInt(matches[1], 10) : 0;
    const minutes = matches[2] ? parseInt(matches[2], 10) : 0;
    const seconds = matches[3] ? parseInt(matches[3], 10) : 0;

    return hours * 3600 + minutes * 60 + seconds;
  } catch (error) {
    console.error(`Error parsing ISO 8601 duration: ${error}`);
    return 0; // Default to 0 seconds if parsing fails
  }
};

// Helper function to safely get tags
export const getSafeTags = (post: any) => {
  if (!post?.tags || !post?.tags?.edges || !Array.isArray(post.tags.edges)) {
    return DEFAULT_TAGS;
  }
  // Remove duplicates based on slug and get valid tags
  const uniqueTags = post.tags.edges
    .filter((edge: any) => edge?.node?.name && edge?.node?.slug)
    .reduce((unique: any[], edge: any) => {
      const exists = unique.some((item) => item.node.slug === edge.node.slug);
      if (!exists) {
        unique.push(edge);
      }
      return unique;
    }, [])
    .map((edge: any) => ({
      name: edge.node.name,
      href: `/category/tag/${edge.node.slug}`,
    }));

  return uniqueTags.length > 0 ? uniqueTags : DEFAULT_TAGS;
};

export const removeFeaturedImage = (content: string): string => {
  if (!content) return "";
  let isFirstFigure = true;
  return content
    .replace(/<figure[^>]*>.*?<\/figure>/g, (match) => {
      if (isFirstFigure) {
        isFirstFigure = false;
        return "";
      }
      return match;
    })
    .trim();
};

export const getYouTubeVideoId = (url: string) => {
  const regex =
    /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);

  return match ? match[1] : "";
};

export const getFeedUrlAppend = (slugStart: string): string => {
  const slugMap: { [key: string]: string } = {
    bahasa: "berita",
    highlight: "headlines",
    leisure: "lifestyle",
    nation: "nation",
    business: "business",
    opinion: "opinion",
    sports: "sports",
    world: "world",
  };
  return slugMap[slugStart.toLowerCase()] || slugStart;
};

export const generateLanguageAlternates = (
  isMalay: boolean,
  fullUrl: string
): Array<{ hrefLang: string; href: string }> => {
  if (isMalay) {
    return [
      { hrefLang: "ms", href: fullUrl },
      { hrefLang: "ms-MY", href: fullUrl },
      { hrefLang: "id", href: fullUrl },
    ];
  }

  return [
    { hrefLang: "en", href: fullUrl },
    { hrefLang: "x-default", href: fullUrl },
  ];
};

export function apiErrorResponse({
  res,
  status,
  message,
  context,
  error,
}: {
  res: any;
  status: number;
  message: string;
  context: string;
  error?: any;
}) {
  const logMessage = `[API_ERROR] (${context}) ${message}`;
  if (error) {
    console.error(logMessage, error);
  } else {
    console.error(logMessage);
  }

  return res.status(status).json({
    error: logMessage,
    ...(error && {
      details: error instanceof Error ? error.message : String(error),
    }),
  });
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Operation timed out")),
      ms
    );
    promise
      .then((result) => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timeout);
        reject(err);
      });
  });
}

// Add these functions to your lib/utils.ts file

/**
 * Format view count to human readable format
 * Examples:
 * 1234 -> "1.2K"
 * 1234567 -> "1.2M"
 * 12345678 -> "12M"
 */
export function formatViewCount(count: string | number): string {
  const num = typeof count === "string" ? parseInt(count) : count;

  if (isNaN(num)) return "0";

  if (num < 1000) {
    return num.toString();
  } else if (num < 1_000_000) {
    const k = (num / 1000).toFixed(num < 10000 ? 1 : 0);
    return `${k}K`;
  } else if (num < 1_000_000_000) {
    const m = (num / 1_000_000).toFixed(num < 10_000_000 ? 1 : 0);
    return `${m}M`;
  } else {
    const b = (num / 1_000_000_000).toFixed(1);
    return `${b}B`;
  }
}

/**
 * Format ISO 8601 duration to human readable format
 * Examples:
 * PT4M13S -> "4:13"
 * PT1H2M10S -> "1:02:10"
 * PT15S -> "0:15"
 */
export function formatDuration(duration: string): string {
  if (!duration) return "0:00";

  // Parse ISO 8601 duration (PT#H#M#S)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  if (!match) return "0:00";

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  if (hours > 0) {
    // Format: H:MM:SS
    const formattedMinutes = minutes.toString().padStart(2, "0");
    const formattedSeconds = seconds.toString().padStart(2, "0");
    return `${hours}:${formattedMinutes}:${formattedSeconds}`;
  } else {
    // Format: M:SS
    const formattedSeconds = seconds.toString().padStart(2, "0");
    return `${minutes}:${formattedSeconds}`;
  }
}

/**
 * Parse ISO 8601 duration to seconds
 * Example: PT4M13S -> 253
 */
export function parseDurationToSeconds(duration: string): number {
  if (!duration) return 0;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  if (!match) return 0;

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Format number with commas
 * Example: 1234567 -> "1,234,567"
 */
export function formatNumber(num: string | number): string {
  const n = typeof num === "string" ? parseInt(num) : num;
  if (isNaN(n)) return "0";
  return n.toLocaleString();
}

/**
 * Get time ago string
 * Examples:
 * "2 minutes ago"
 * "3 hours ago"
 * "5 days ago"
 */
export function getTimeAgo(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  }
  if (seconds < 604800) {
    const days = Math.floor(seconds / 86400);
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  }
  if (seconds < 2592000) {
    const weeks = Math.floor(seconds / 604800);
    return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
  }
  if (seconds < 31536000) {
    const months = Math.floor(seconds / 2592000);
    return `${months} month${months !== 1 ? "s" : ""} ago`;
  }

  const years = Math.floor(seconds / 31536000);
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

/**
 * Check if a video is a YouTube Short based on duration
 */
export function isYouTubeShort(durationInSeconds: number): boolean {
  return durationInSeconds <= 60;
}

/**
 * Get video thumbnail URL in desired quality
 */
export function getVideoThumbnail(
  thumbnails: any,
  quality: "default" | "medium" | "high" | "standard" | "maxres" = "high"
): string {
  // Fallback chain: requested → high → medium → default
  return (
    thumbnails?.[quality]?.url ||
    thumbnails?.high?.url ||
    thumbnails?.medium?.url ||
    thumbnails?.default?.url ||
    "/images/video-placeholder.jpg"
  ); // Add a placeholder image
}

/**
 * Extract video ID from YouTube URL
 * Handles various YouTube URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  // Regular video URLs
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  // If it's already just the video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }

  return null;
}

/**
 * Generate YouTube embed URL
 */
export function getYouTubeEmbedUrl(videoId: string, autoplay = false): string {
  const params = new URLSearchParams({
    rel: "0", // Don't show related videos
    modestbranding: "1", // Minimal YouTube branding
    ...(autoplay && { autoplay: "1", mute: "1" }), // Autoplay requires mute
  });

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

/**
 * Generate YouTube watch URL
 */
export function getYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
