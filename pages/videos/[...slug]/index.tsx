import React, { useState, useEffect, Suspense } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { OrgJsonLD, websiteJSONLD } from "@/constants/jsonlds/org";
import { parseISO8601DurationToSeconds } from "@/lib/utils";
import AdSlot from "@/components/common/AdSlot";
import VideoDetailedContent from "@/components/videos/VideoDetailedContent";
import siteConfig from "@/constants/site-config";
import VideoSidebarSkeleton from "@/components/skeletons/VideoSidebarSkeleton";
import { LatestVideosSidebar } from "@/components/videos/LatestVideosSideBar";

export default function VideoDetailPage() {
  const router = useRouter();

  // State for all the data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [video, setVideo] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [metaData, setMetaData] = useState<any>(null);
  const [videoArticles, setVideoArticles] = useState<any>(null);

  // Extract videoId and playlistId from router
  const { slug, playlistId: queryPlaylistId } = router.query;
  const videoId = Array.isArray(slug) ? slug[0] : "";
  const titleSlug = Array.isArray(slug) && slug.length > 1 ? slug[1] : "";

  // Ensure playlistId is a string
  const playlistId = Array.isArray(queryPlaylistId)
    ? queryPlaylistId[0]
    : queryPlaylistId;
  console.log("videoId:", videoId);
  console.log("playlistId:", playlistId);

  // Fetch data when router is ready and we have the required parameters
  useEffect(() => {
    const fetchData = async () => {
      if (!router.isReady || !videoId || !playlistId) {
        console.log(
          "Skipping fetch - missing required params or router not ready"
        );
        return;
      }

      try {
        setLoading(true);

        // Log what we're fetching
        console.log("useEffect - Fetching data for videoId:", videoId);
        console.log("useEffect - Fetching data for playlistId:", playlistId);

        // Use your API endpoint directly
        const response = await fetch("/api/get-yt-playlist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ playlistId }),
        });

        if (!response.ok) {
          console.error(`API request failed with status ${response.status}`);
          window.location.href = `https://www.youtube.com/watch?v=${videoId}`;
          return;
        }

        const fetchedVideos = await response.json();
        console.log("Fetched videos count:", fetchedVideos?.length);
        setVideos(fetchedVideos || []);

        // Find the specific video in the playlist
        const fetchedVideo = fetchedVideos?.find(
          (p: any) => p?.node?.videoId === videoId
        );

        console.log("Found video:", !!fetchedVideo);

        if (!fetchedVideo) {
          console.log("Video not found in playlist, redirecting to YouTube");
          window.location.href = `https://www.youtube.com/watch?v=${videoId}`;
          return;
        }

        setVideo(fetchedVideo);

        // Generate SEO metadata
        const slugSuffix =
          titleSlug ||
          fetchedVideo?.node?.title?.toLowerCase().replace(/\s+/g, "-");
        const videoURL = `${siteConfig.baseUrl}/videos/${fetchedVideo?.node?.videoId}/${slugSuffix}?playlistId=${playlistId}`;
        const thumbnailURL =
          fetchedVideo?.node?.featuredImage?.node?.mediaItemUrl || "";
        const publicationDate = fetchedVideo?.node?.dateGmt || "";
        const tagsString = fetchedVideo?.node?.tags
          ? fetchedVideo?.node?.tags?.join(", ")
          : "Video";
        const durationInSeconds = parseISO8601DurationToSeconds(
          fetchedVideo?.node?.duration || "PT0S"
        );

        const generatedMetaData = {
          title: `${fetchedVideo?.node?.title} | Videos`,
          description: `${fetchedVideo?.node?.excerpt?.split(" ").slice(0, 30).join(" ") + "..."}`,
          openGraph: {
            title: fetchedVideo?.node?.title,
            description: `${fetchedVideo?.node?.excerpt?.split(" ").slice(0, 30).join(" ") + "..."}`,
            url: videoURL,
            type: "video.movie",
            duration: durationInSeconds,
            releaseDate: publicationDate,
            tags: tagsString,
            images: [
              {
                url: thumbnailURL,
                width: 1200,
                height: 630,
                alt: `${fetchedVideo?.node?.title} thumbnail`,
              },
            ],
            videos: [
              {
                url: `https://www.youtube.com/embed/${fetchedVideo?.node?.videoId}`,
                width: 1280,
                height: 720,
                secureUrl: `https://www.youtube.com/embed/${fetchedVideo?.node?.videoId}`,
                type: "text/html",
              },
            ],
          },
          twitter: {
            card: "summary_large_image",
            site: "@fmtoday",
            title: fetchedVideo?.node?.title,
            description: `${fetchedVideo?.node?.excerpt?.split(" ").slice(0, 30).join(" ") + "..."}`,
          },
          keywords: tagsString,
          category: fetchedVideo?.node?.categories?.nodes?.map(
            (category: any) => category?.name
          ),
        };

        setMetaData(generatedMetaData);

        // Prepare JSON-LD data for SEO
        const generatedVideoArticles = {
          "@context": "https://schema.org",
          "@type": "VideoObject",
          "@id": `https://www.youtube.com/watch?v=${fetchedVideo?.node?.videoId}`,
          name: fetchedVideo?.node?.title,
          description: fetchedVideo?.node?.excerpt?.split(
            "Subscribe to our channel"
          )[0],
          thumbnailUrl: thumbnailURL,
          uploadDate: publicationDate,
          contentUrl: videoURL,
          embedUrl: `https://www.youtube.com/embed/${fetchedVideo?.node?.videoId}`,
          duration: fetchedVideo?.node?.duration,
          author: {
            "@type": "NewsMediaOrganization",
            name: "Free Malaysia Today",
            url: "https://www.freemalaysiatoday.com/",
          },
          interactionStatistic: {
            "@type": "InteractionCounter",
            interactionType: "http://schema.org/WatchAction",
            userInteractionCount:
              fetchedVideo?.node?.statistics?.viewCount ?? 1,
          },
          url: `https://www.youtube.com/watch?v=${fetchedVideo?.node?.videoId}`,
          publisher: {
            "@type": "NewsMediaOrganization",
            name: "Free Malaysia Today",
            logo: {
              "@type": "ImageObject",
              url: "https://www.freemalaysiatoday.com/icon-512x512.png",
              width: 512,
              height: 512,
            },
          },
          isFamilyFriendly: true,
          keywords: tagsString,
          caption: fetchedVideo?.node?.title,
          genre: fetchedVideo?.node?.categories?.nodes
            ?.map((category: any) => category?.name)
            .join(", "),
        };

        setVideoArticles(generatedVideoArticles);
      } catch (err: any) {
        console.error("Error fetching video details:", err);
        setError(err.message || "An error occurred while fetching video data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router.isReady, videoId, playlistId, titleSlug, slug]);

  // If the router isn't ready or we're still loading data
  if (!router.isReady || loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If there was an error fetching data
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-red-500">Error loading video: {error}</div>
      </div>
    );
  }

  // Process data for rendering
  const shareUrl = metaData?.openGraph?.url;
  const shareTitle = video?.node?.title;
  const shareThumbnail = video?.node?.featuredImage?.node?.mediaItemUrl;
  const tags = video?.node?.tags || [];

  const dfpTargetingParams = {
    pos: "listing",
    section: ["videos page"],
    key: tags,
  };

  console.log("meta data :", metaData);
  return (
    <>
      {/* Head with Metadata and JSON-LD scripts */}
      <Head>
        <title>{metaData?.title || `${video?.node?.title} | Videos`}</title>
        <meta name="description" content={metaData?.description} />
        <meta name="keywords" content={metaData?.keywords} />

        {/* Open Graph Meta Tags */}
        {metaData?.openGraph && (
          <>
            <meta property="og:title" content={metaData.openGraph.title} />
            <meta
              property="og:description"
              content={metaData.openGraph.description}
            />
            <meta property="og:url" content={metaData.openGraph.url} />
            <meta property="og:type" content={metaData.openGraph.type} />
            {metaData.openGraph.images?.map((image: any, index: number) => (
              <React.Fragment key={index}>
                <meta property="og:image" content={image.url} />
                <meta
                  property="og:image:width"
                  content={image.width.toString()}
                />
                <meta
                  property="og:image:height"
                  content={image.height.toString()}
                />
                <meta property="og:image:alt" content={image.alt} />
              </React.Fragment>
            ))}
          </>
        )}

        {/* Twitter Card Meta Tags */}
        {metaData?.twitter && (
          <>
            <meta name="twitter:card" content={metaData.twitter.card} />
            <meta name="twitter:site" content={metaData.twitter.site} />
            <meta name="twitter:title" content={metaData.twitter.title} />
            <meta
              name="twitter:description"
              content={metaData.twitter.description}
            />
          </>
        )}

        {/* JSON-LD scripts */}
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(OrgJsonLD) }}
          type="application/ld+json"
          defer
        />
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJSONLD) }}
          type="application/ld+json"
          defer
        />
        {videoArticles && (
          <script
            dangerouslySetInnerHTML={{ __html: JSON.stringify(videoArticles) }}
            type="application/ld+json"
            defer
          />
        )}
      </Head>

      {/* Top Desktop Ad */}
      <div className="ads-dynamic-desktop">
        <AdSlot
          sizes={[
            [970, 90],
            [970, 250],
            [728, 90],
          ]}
          id="div-gpt-ad-1661333181124-0"
          name="ROS_Billboard"
          visibleOnDevices="onlyDesktop"
          targetingParams={dfpTargetingParams}
        />
      </div>

      {/* Top Mobile Ad */}
      <div className="ads-small-mobile">
        <AdSlot
          sizes={[
            [320, 50],
            [320, 100],
          ]}
          id="div-gpt-ad-1661362470988-0"
          name="ROS_Mobile_Leaderboard"
          visibleOnDevices="onlyMobile"
          targetingParams={dfpTargetingParams}
        />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row my-3">
        {/* Video Main Content */}
        <VideoDetailedContent
          video={video}
          videoId={videoId}
          shareUrl={shareUrl}
          shareTitle={shareTitle}
          shareThumbnail={shareThumbnail}
          tags={tags}
        />

        {/* Related Videos Sidebar */}
        <Suspense fallback={<VideoSidebarSkeleton />}>
          {playlistId && (
            <LatestVideosSidebar videos={videos} playlistId={playlistId} />
          )}
        </Suspense>
      </div>
    </>
  );
}
