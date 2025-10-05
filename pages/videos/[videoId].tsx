// pages/videos/[videoId].tsx
// Enhanced individual video page with multiple recommendation sections and all fixes applied

import { GetStaticProps, GetStaticPaths } from "next";
import Head from "next/head";
import Script from "next/script";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  FaEye,
  FaCalendar,
  FaClock,
  FaChevronRight,
  FaHome,
  FaChevronDown,
  FaChevronUp,
  FaFire,
  FaThumbsUp,
  FaBolt,
} from "react-icons/fa";
import { prisma } from "@/lib/prisma";
import siteConfig from "@/constants/site-config";
import { formatViewCount, formatDuration, getTimeAgo } from "@/lib/utils";
import VideoFacade from "@/components/videos/VideoFacade";
import ShareComponents from "@/components/news-article/ShareComponents";
import { Button } from "@/components/ui/button";

// Fixed Video type definition with proper thumbnail structure
interface Thumbnail {
  url?: string;
  width?: number;
  height?: number;
}

interface VideoData {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnails: {
    default?: Thumbnail;
    medium?: Thumbnail;
    high?: Thumbnail;
    standard?: Thumbnail;
    maxres?: Thumbnail;
  };
  statistics: {
    viewCount: string;
    likeCount?: string;
    commentCount?: string;
  };
  contentDetails: {
    duration: string;
    durationSeconds: number;
  };
  tags?: string[];
  playlists?: string[];
  tier?: string;
  channelId?: string;
  channelTitle?: string;
  isShort?: boolean;
}

interface RelatedVideo {
  videoId: string;
  title: string;
  description?: string;
  thumbnails: {
    default?: Thumbnail;
    medium?: Thumbnail;
    high?: Thumbnail;
    standard?: Thumbnail;
    maxres?: Thumbnail;
  };
  statistics: {
    viewCount: string;
  };
  publishedAt: string;
  contentDetails: {
    duration: string;
  };
  isShort?: boolean;
  tier?: string;
}

interface VideoPageProps {
  video: VideoData | null;
  relatedVideos: RelatedVideo[];
  trendingVideos: RelatedVideo[];
  recommendedVideos: RelatedVideo[];
  playlistInfo?: {
    title: string;
    slug: string;
    videos: string[];
    currentIndex: number;
  } | null;
  error: string | null;
}

// Breadcrumb Component with proper typing
const Breadcrumb = ({
  video,
  playlistInfo,
}: {
  video: VideoData;
  playlistInfo?: { title: string; slug: string } | null;
}) => {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
        <li>
          <Link
            href="/"
            className="hover:text-primary transition-colors flex items-center gap-1"
          >
            <FaHome className="w-3 h-3" />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </li>
        <li>
          <FaChevronRight className="w-3 h-3" />
        </li>
        <li>
          <Link href="/videos" className="hover:text-primary transition-colors">
            Videos
          </Link>
        </li>
        {playlistInfo && (
          <>
            <li>
              <FaChevronRight className="w-3 h-3" />
            </li>
            <li>
              <Link
                href={`/videos/playlist/${playlistInfo.slug}`}
                className="hover:text-primary transition-colors truncate max-w-[150px]"
                title={playlistInfo.title}
              >
                {playlistInfo.title}
              </Link>
            </li>
          </>
        )}
        <li>
          <FaChevronRight className="w-3 h-3" />
        </li>
        <li
          className="text-foreground truncate max-w-[200px]"
          title={video.title}
        >
          {video.title}
        </li>
      </ol>
    </nav>
  );
};

// Enhanced Video Card Component for recommendation sections
const VideoCard = ({
  video,
  size = "medium",
}: {
  video: RelatedVideo;
  size?: "small" | "medium";
}) => {
  const thumbnailUrl =
    video.thumbnails?.high?.url ||
    video.thumbnails?.medium?.url ||
    `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;

  if (size === "small") {
    // Horizontal layout for sidebar
    return (
      <Link
        href={`/videos/${video.videoId}`}
        className="flex gap-3 group hover:bg-muted/50 p-2 rounded-lg transition-all duration-200"
      >
        <div className="relative flex-shrink-0 w-32 aspect-video rounded overflow-hidden">
          <Image
            src={thumbnailUrl}
            alt={video.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform"
            sizes="128px"
            loading="lazy"
          />
          {video.contentDetails?.duration && (
            <div className="absolute bottom-1 right-1 bg-black/90 text-white text-xs px-1 py-0.5 rounded">
              {formatDuration(video.contentDetails.duration)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {video.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span>
              {formatViewCount(parseInt(video.statistics.viewCount || "0"))}
            </span>
            <span>•</span>
            <span>{getTimeAgo(video.publishedAt)}</span>
          </div>
        </div>
      </Link>
    );
  }

  // Vertical layout for grid sections
  return (
    <Link
      href={`/videos/${video.videoId}`}
      className="group block bg-card rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
    >
      <div className="relative aspect-video">
        <Image
          src={thumbnailUrl}
          alt={video.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          loading="lazy"
        />
        {video.contentDetails?.duration && (
          <div className="absolute bottom-2 right-2 bg-black/90 text-white text-xs px-1.5 py-0.5 rounded">
            {formatDuration(video.contentDetails.duration)}
          </div>
        )}
        {video.tier === "hot" && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <FaFire className="w-3 h-3" />
            HOT
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors mb-1">
          {video.title}
        </h3>
        {video.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
            {video.description}
          </p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FaEye className="w-3 h-3" />
            {formatViewCount(parseInt(video.statistics.viewCount || "0"))}
          </span>
          <span>•</span>
          <span>{getTimeAgo(video.publishedAt)}</span>
        </div>
      </div>
    </Link>
  );
};

// Enhanced Main Video Component with proper play tracking
const VideoPlayer = ({
  video,
  onActualPlay,
}: {
  video: VideoData;
  onActualPlay: () => void;
}) => {
  const hasTrackedPlay = useRef(false);

  const getThumbnailUrl = () => {
    // Check if maxres exists and is valid before using
    if (video.thumbnails?.maxres?.url) {
      return video.thumbnails.maxres.url;
    }
    if (video.thumbnails?.high?.url) {
      return video.thumbnails.high.url;
    }
    if (video.thumbnails?.standard?.url) {
      return video.thumbnails.standard.url;
    }
    return `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;
  };

  // Handle when iframe actually loads (user clicked play)
  const handleIframeLoad = useCallback(() => {
    // Only track once per page load
    if (!hasTrackedPlay.current) {
      hasTrackedPlay.current = true;
      // Track after 3 seconds of actual playback
      setTimeout(() => {
        onActualPlay();
      }, 3000);
    }
  }, [onActualPlay]);

  return (
    <div className="relative w-full">
      <VideoFacade
        videoId={video.videoId}
        title={video.title}
        thumbnail={getThumbnailUrl()}
        aspectRatio={video.isShort ? "short" : "video"}
        size="large"
        priority={true}
        autoplay={true} // Auto-play when clicked
        className="rounded-lg overflow-hidden shadow-xl"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 900px"
        onLoad={handleIframeLoad}
      />
    </div>
  );
};

// Video Description Component
const VideoDescription = ({ description }: { description: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongDescription = description.length > 300;

  return (
    <div className="mt-4 p-4 bg-muted/30 rounded-lg">
      <h2 className="font-semibold mb-2">Description</h2>
      <div
        className={`whitespace-pre-wrap text-sm ${!isExpanded && isLongDescription ? "line-clamp-3" : ""}`}
      >
        {description}
      </div>
      {isLongDescription && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 p-0 h-auto font-medium"
        >
          {isExpanded ? (
            <>
              Show less <FaChevronUp className="ml-1 w-3 h-3" />
            </>
          ) : (
            <>
              Show more <FaChevronDown className="ml-1 w-3 h-3" />
            </>
          )}
        </Button>
      )}
    </div>
  );
};

// Video Section Component for recommendation groups
const VideoSection = ({
  title,
  icon,
  videos,
  viewAllLink,
}: {
  title: string;
  icon: React.ReactNode;
  videos: RelatedVideo[];
  viewAllLink?: string;
}) => {
  if (videos.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          {icon}
          {title}
        </h2>
        {viewAllLink && (
          <Link
            href={viewAllLink}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View All
            <FaChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      <div
        className={`grid grid-cols-2 ${videos.length === 6 ? "md:grid-cols-3" : "md:grid-cols-3 lg:grid-cols-4"} gap-4`}
      >
        {videos.map((video) => (
          <VideoCard key={video.videoId} video={video} size="medium" />
        ))}
      </div>
    </section>
  );
};

export default function VideoPage({
  video,
  relatedVideos,
  trendingVideos,
  recommendedVideos,
  playlistInfo,
  error,
}: VideoPageProps) {
  const [hasPlayed, setHasPlayed] = useState(false);

  // Track video view after actual play
  const handleActualPlay = useCallback(() => {
    if (video && !hasPlayed) {
      setHasPlayed(true);
      // Track view
      fetch(`/api/videos/${video.videoId}/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch((err) => {
        console.error("Failed to track view:", err);
        // Log telemetry for errors
        if (typeof window !== "undefined" && window.gtag) {
          window.gtag("event", "exception", {
            description: `View tracking failed for ${video.videoId}`,
            fatal: false,
          });
        }
      });
    }
  }, [video, hasPlayed]);

  // Log 404 telemetry
  useEffect(() => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "page_not_found", {
        page_path: `/videos/${video?.videoId || "unknown"}`,
        page_title: "Video Not Found",
      });
    }
  }, []);

  // Handle errors
  if (error || !video) {
    return (
      <>
        <Head>
          <title>Video Not Found | {siteConfig.siteName}</title>
          <meta name="robots" content="noindex,nofollow" />
        </Head>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Video Not Available</h1>
          <p className="text-muted-foreground mb-6">
            {error || "This video could not be found or may have been removed."}
          </p>
          <Link href="/videos">
            <Button>Browse All Videos</Button>
          </Link>
        </div>
      </>
    );
  }

  // SEO metadata
  const pageTitle = `${video.title} | ${siteConfig.siteName}`;
  const pageDescription =
    video.description?.substring(0, 160) ||
    `Watch ${video.title} on ${siteConfig.siteName}. Latest news and updates from Malaysia.`;
  const pageUrl = `${siteConfig.baseUrl}/videos/${video.videoId}`;

  // Safer thumbnail URL with validation
  const getThumbnailForMeta = () => {
    if (video.thumbnails?.maxres?.url) return video.thumbnails.maxres.url;
    if (video.thumbnails?.high?.url) return video.thumbnails.high.url;
    return `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;
  };
  const thumbnailUrl = getThumbnailForMeta();

  // Generate enhanced structured data
  const generateStructuredData = () => {
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "VideoObject",
          "@id": `${pageUrl}#video`,
          name: video.title,
          description: video.description || pageTitle,
          thumbnailUrl: [
            thumbnailUrl,
            `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
            `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`,
          ],
          uploadDate: video.publishedAt,
          duration: video.contentDetails?.duration,
          contentUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
          embedUrl: `https://www.youtube.com/embed/${video.videoId}`,
          interactionStatistic: {
            "@type": "InteractionCounter",
            interactionType: "https://schema.org/WatchAction",
            userInteractionCount: parseInt(video.statistics.viewCount || "0"),
          },
          publisher: {
            "@type": "Organization",
            name: siteConfig.siteName,
            logo: {
              "@type": "ImageObject",
              url: `${siteConfig.baseUrl}/images/logo.png`,
              width: 600,
              height: 60,
            },
          },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: siteConfig.baseUrl,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Videos",
              item: `${siteConfig.baseUrl}/videos`,
            },
            ...(playlistInfo
              ? [
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: playlistInfo.title,
                    item: `${siteConfig.baseUrl}/videos/playlist/${playlistInfo.slug}`,
                  },
                ]
              : []),
            {
              "@type": "ListItem",
              position: playlistInfo ? 4 : 3,
              name: video.title,
              item: pageUrl,
            },
          ],
        },
      ],
    };
  };

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={pageUrl} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="video.other" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={thumbnailUrl} />
        <meta property="og:image:width" content="1280" />
        <meta property="og:image:height" content="720" />
        <meta
          property="og:video:url"
          content={`https://www.youtube.com/embed/${video.videoId}`}
        />
        <meta
          property="og:video:secure_url"
          content={`https://www.youtube.com/embed/${video.videoId}`}
        />
        <meta property="og:video:type" content="text/html" />
        <meta property="og:video:width" content="1280" />
        <meta property="og:video:height" content="720" />
        <meta property="og:site_name" content={siteConfig.siteName} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fmtoday" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={thumbnailUrl} />

        {/* Additional Meta */}
        <meta property="article:published_time" content={video.publishedAt} />
        <meta
          property="video:duration"
          content={String(video.contentDetails?.durationSeconds || 0)}
        />
        {video.tags
          ?.slice(0, 5)
          .map((tag, i) => <meta key={i} property="video:tag" content={tag} />)}

        {/* Performance Hints */}
        <link
          rel="preconnect"
          href="https://www.youtube.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://i.ytimg.com"
          crossOrigin="anonymous"
        />
      </Head>

      {/* Structured Data */}
      <Script
        id="video-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateStructuredData()),
        }}
      />

      <div className="w-full">
        {/* Breadcrumb */}
        <Breadcrumb video={video} playlistInfo={playlistInfo} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-8">
            {/* Video Player */}
            <VideoPlayer video={video} onActualPlay={handleActualPlay} />

            {/* Video Info */}
            <div className="mt-4">
              <h1 className="text-2xl md:text-3xl font-bold mb-3">
                {video.title}
              </h1>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <FaEye className="w-4 h-4" />
                  <span>
                    {formatViewCount(
                      parseInt(video.statistics.viewCount || "0")
                    )}{" "}
                    views
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <FaCalendar className="w-4 h-4" />
                  <time dateTime={video.publishedAt}>
                    {new Date(video.publishedAt).toLocaleDateString("en-MY", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                </div>
                <div className="flex items-center gap-1">
                  <FaClock className="w-4 h-4" />
                  <span>
                    {formatDuration(video.contentDetails?.duration || "PT0S")}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pb-4 border-b">
                <ShareComponents
                  url={pageUrl}
                  title={video.title}
                  mediaUrl={thumbnailUrl}
                  hashs={video?.tags || []}
                />

                {/* Playlist Navigation - Fixed for -1 index */}
                {playlistInfo && playlistInfo.currentIndex >= 0 && (
                  <div className="ml-auto flex items-center gap-2">
                    {playlistInfo.currentIndex > 0 && (
                      <Link
                        href={`/videos/${playlistInfo.videos[playlistInfo.currentIndex - 1]}`}
                      >
                        <Button size="sm" variant="outline">
                          Previous
                        </Button>
                      </Link>
                    )}
                    {playlistInfo.currentIndex <
                      playlistInfo.videos.length - 1 && (
                      <Link
                        href={`/videos/${playlistInfo.videos[playlistInfo.currentIndex + 1]}`}
                      >
                        <Button size="sm">Next</Button>
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              {video.description && (
                <VideoDescription description={video.description} />
              )}

              {/* Tags */}
              {video.tags && video.tags.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2 text-sm">Topics</h3>
                  <div className="flex flex-wrap gap-2">
                    {video.tags.slice(0, 10).map((tag, index) => (
                      <Link
                        key={index}
                        href={`/search?q=${encodeURIComponent(tag)}&type=videos`}
                        className="px-3 py-1 bg-muted hover:bg-muted/80 rounded-full text-xs transition-colors"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Right Column with max-height for better UX */}
          <aside className="lg:col-span-4">
            <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
              <h2 className="font-bold text-lg mb-4">Up Next</h2>
              <div className="space-y-2">
                {relatedVideos.slice(0, 5).map((relatedVideo) => (
                  <VideoCard
                    key={relatedVideo.videoId}
                    video={relatedVideo}
                    size="small"
                  />
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* Enhanced Recommendation Sections */}
        <div className="mt-12 space-y-8">
          {/* Trending Videos Section */}
          {trendingVideos.length > 0 && (
            <VideoSection
              title="Trending Now"
              icon={<FaFire className="w-5 h-5 text-red-600" />}
              videos={trendingVideos}
              viewAllLink="/videos"
            />
          )}

          {/* You Might Like Section */}
          {recommendedVideos.length > 0 && (
            <VideoSection
              title="You Might Like"
              icon={<FaThumbsUp className="w-5 h-5 text-blue-600" />}
              videos={recommendedVideos}
            />
          )}

          {/* More Related Videos */}
          {relatedVideos.length > 5 && (
            <VideoSection
              title="More Like This"
              icon={<FaBolt className="w-5 h-5 text-yellow-600" />}
              videos={relatedVideos.slice(5, 9)}
            />
          )}
        </div>
      </div>
    </>
  );
}

// Static paths generation - pre-build popular videos
export const getStaticPaths: GetStaticPaths = async () => {
  try {
    // Pre-build top 100 hot/trending videos
    const topVideos = await prisma.videos.findMany({
      where: {
        OR: [{ tier: "hot" }, { tier: "trending" }],
        isActive: true,
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: 100,
      select: {
        videoId: true,
      },
    });

    const paths = topVideos.map((video) => ({
      params: { videoId: video.videoId },
    }));

    return {
      paths,
      fallback: "blocking",
    };
  } catch (error) {
    console.error("[VideoPage] Error generating paths:", error);
    return {
      paths: [],
      fallback: "blocking",
    };
  }
};

// Enhanced Static props with multiple video sections
export const getStaticProps: GetStaticProps<VideoPageProps> = async ({
  params,
}) => {
  const videoId = params?.videoId as string;

  if (!videoId) {
    return { notFound: true };
  }

  try {
    // Fetch main video using findFirst instead of findUnique
    const video = await prisma.videos.findFirst({
      where: {
        videoId,
        isActive: true,
      },
    });

    if (!video) {
      return { notFound: true };
    }

    // Determine revalidation time based on video tier
    let revalidateTime = 3600; // Default 1 hour
    if (video.tier === "hot") {
      revalidateTime = 300; // 5 minutes for hot videos
    } else if (video.tier === "trending") {
      revalidateTime = 900; // 15 minutes for trending
    } else if (
      video.publishedAt < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ) {
      revalidateTime = 7200; // 2 hours for old videos
    }

    // Build conditions for related videos query (fixed empty object issue)
    const conditions = [];
    if (video.playlists && video.playlists.length > 0) {
      conditions.push({ playlists: { hasSome: video.playlists } });
    }
    if (video.tier) {
      conditions.push({ tier: video.tier });
    }

    // Always add recent videos as a fallback
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    conditions.push({ publishedAt: { gte: oneWeekAgo } });

    // Fetch related videos from same playlist/tier
    const relatedVideos = await prisma.videos.findMany({
      where: {
        AND: [
          {
            videoId: { not: videoId },
            isActive: true,
          },
          conditions.length > 0 ? { OR: conditions } : {},
        ],
      },
      orderBy: [{ publishedAt: "desc" }],
      take: 10,
      select: {
        videoId: true,
        title: true,
        description: true,
        thumbnails: true,
        statistics: true,
        publishedAt: true,
        contentDetails: true,
        isShort: true,
        tier: true,
      },
    });

    // Fetch trending videos (top 5 hot/trending from any playlist)
    const trendingVideos = await prisma.videos.findMany({
      where: {
        OR: [{ tier: "hot" }, { tier: "trending" }],
        isActive: true,
        videoId: { not: videoId },
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: 4,
      select: {
        videoId: true,
        title: true,
        description: true,
        thumbnails: true,
        statistics: true,
        publishedAt: true,
        contentDetails: true,
        isShort: true,
        tier: true,
      },
    });

    // Fetch "You might like" - 1 video from each different playlist
    let recommendedVideos: any = [];

    if (video.playlists && video.playlists.length > 0) {
      // Get other playlists
      const otherPlaylists = await prisma.playlist.findMany({
        where: {
          isActive: true,
          NOT: {
            playlistId: { in: video.playlists },
          },
        },
        take: 6,
        select: {
          playlistId: true,
        },
      });

      recommendedVideos = await prisma.videos.findMany({
        where: {
          playlists: { hasSome: otherPlaylists.map((p) => p.playlistId) },
          isActive: true,
          videoId: { not: videoId },
        },
        distinct: ["playlists"],
        take: 6,
        orderBy: {
          publishedAt: "desc",
        },
        select: {
          videoId: true,
          title: true,
          description: true,
          thumbnails: true,
          statistics: true,
          publishedAt: true,
          contentDetails: true,
          isShort: true,
          tier: true,
        },
      });
    }

    // Get playlist info if video is in a playlist
    let playlistInfo = null;
    if (video.playlists && video.playlists.length > 0) {
      const playlist = await prisma.playlist.findFirst({
        where: {
          playlistId: video.playlists[0],
          isActive: true,
        },
        select: {
          title: true,
          slug: true,
        },
      });

      if (playlist && playlist.slug) {
        const playlistVideos = await prisma.videos.findMany({
          where: {
            playlists: { has: video.playlists[0] },
            isActive: true,
          },
          orderBy: { publishedAt: "desc" },
          select: { videoId: true },
        });

        const currentIndex = playlistVideos.findIndex(
          (v) => v.videoId === videoId
        );

        playlistInfo = {
          title: playlist.title,
          slug: playlist.slug,
          videos: playlistVideos.map((v) => v.videoId),
          currentIndex,
        };
      }
    }

    // Transform data with proper thumbnail structure
    const transformVideo = (v: any): VideoData => ({
      videoId: v.videoId,
      title: v.title,
      description: v.description || "",
      publishedAt:
        v.publishedAt instanceof Date
          ? v.publishedAt.toISOString()
          : v.publishedAt,
      thumbnails: v.thumbnails || {},
      statistics: {
        viewCount: String(v.statistics?.viewCount || 0),
        likeCount: String(v.statistics?.likeCount || 0),
        commentCount: String(v.statistics?.commentCount || 0),
      },
      contentDetails: {
        duration: v.contentDetails?.duration || "PT0S",
        durationSeconds: v.contentDetails?.durationSeconds || 0,
      },
      tags: v.tags || [],
      playlists: v.playlists || [],
      tier: v.tier || "standard",
      channelId: v.channelId || "",
      channelTitle: v.channelTitle || "FMT",
      isShort: v.isShort || false,
    });

    return {
      props: {
        video: transformVideo(video),
        relatedVideos: relatedVideos.map(transformVideo),
        trendingVideos: trendingVideos.map(transformVideo),
        recommendedVideos: recommendedVideos.map(transformVideo),
        playlistInfo,
        error: null,
      },
      revalidate: revalidateTime,
    };
  } catch (error) {
    console.error("[VideoPage] Error fetching video:", error);

    return {
      props: {
        video: null,
        relatedVideos: [],
        trendingVideos: [],
        recommendedVideos: [],
        error: "Failed to load video. Please try again later.",
      },
      revalidate: 60,
    };
  }
};
