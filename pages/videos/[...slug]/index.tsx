import { GetServerSideProps, NextPage } from "next";
import Head from "next/head";
import React, { Suspense } from "react";

import { OrgJsonLD, websiteJSONLD } from "@/constants/jsonlds/org";
import { parseISO8601DurationToSeconds } from "@/lib/utils";
import { VideoDetailPageProps } from "@/types/global";
import AdSlot from "@/components/common/AdSlot";
import VideoSidebarSkeleton from "@/components/skeletons/VideoSidebarSkeleton";
import { getPlaylist } from "@/lib/api";
import { LatestVideosSidebar } from "@/components/videos/LatestVideosSideBar";
import VideoDetailedContent from "@/components/videos/VideoDetailedContent";
import siteConfig from "@/constants/site-config";
import { gerneralTargetingKeys } from "@/constants/ads-targeting-params/general";

const VideoDetailPage: NextPage<VideoDetailPageProps> = ({
  video,
  videos,
  videoId,
  playlistId,
  metaData,
  videoArticles,
}) => {
  const shareUrl = metaData.openGraph.url;
  const shareTitle = video?.node?.title;
  const shareThumbnail = video?.node?.featuredImage?.node?.mediaItemUrl;
  const tags = video?.node?.tags || [];

  const dfpTargetingParams = {
    pos: "listing",
    section: ["video-summary page"],
    key: [tags, ...gerneralTargetingKeys],
  };
  return (
    <>
      {/* Head with Metadata and JSON-LD scripts */}
      <Head>
        <title>{metaData.title}</title>
        <meta name="description" content={metaData.description} />
        <meta name="keywords" content={metaData.keywords} />

        {/* Open Graph Meta Tags */}
        <meta property="og:title" content={metaData.openGraph.title} />
        <meta
          property="og:description"
          content={metaData.openGraph.description}
        />
        <meta property="og:url" content={metaData.openGraph.url} />
        <meta property="og:type" content={metaData.openGraph.type} />
        <meta
          property="og:video"
          content={`https://www.youtube.com/watch?v=${video?.node?.videoId}`}
        />
        <meta
          property="og:video:secure_url"
          content={`https://www.youtube.com/watch?v=${video?.node?.videoId}`}
        />
        <meta
          property="og:video:height"
          content={metaData?.openGraph?.videos[0]?.height}
        />
        <meta
          property="og:video:width"
          content={metaData?.openGraph?.videos[0]?.width}
        />
        {metaData.openGraph.images?.map((image: any, index: any) => (
          <React.Fragment key={index}>
            <meta property="og:image" content={image?.url} />
            <meta
              property="og:image:width"
              content={image?.width?.toString()}
            />
            <meta
              property="og:image:height"
              content={image?.height?.toString()}
            />
            <meta property="og:image:alt" content={image?.alt} />
          </React.Fragment>
        ))}

        <link
          rel="canonical"
          href={`${videoArticles?.url.replace("/", "")}/`}
        />

        <link
          rel="alternate"
          hrefLang="x-default"
          href={`${videoArticles?.url.replace("/", "")}/`}
        />

        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content={metaData?.twitter?.card} />
        <meta name="twitter:site" content={metaData?.twitter?.site} />
        <meta name="twitter:title" content={metaData?.twitter?.title} />
        <meta
          name="twitter:description"
          content={metaData?.twitter?.description}
        />
      </Head>
      {/* JSON-LD scripts */}
      <script
        dangerouslySetInnerHTML={{ __html: JSON?.stringify(OrgJsonLD) }}
        type="application/ld+json"
        async
        // defer
      />
      <script
        dangerouslySetInnerHTML={{ __html: JSON?.stringify(websiteJSONLD) }}
        type="application/ld+json"
        async
        // defer
      />
      <script
        dangerouslySetInnerHTML={{ __html: JSON?.stringify(videoArticles) }}
        type="application/ld+json"
        async
        // defer
      />

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

      {/* Main Content Area */}
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
          <LatestVideosSidebar videos={videos} playlistId={playlistId} />
        </Suspense>
      </div>

      {/* Pixel Ad */}
      <AdSlot
        id="div-gpt-ad-1661362827551-0"
        name="Pixel"
        targetingParams={dfpTargetingParams}
        sizes={[1, 1]}
        additionalStyle={{
          position: "absolute",
          top: 0,
          left: 0,
          backgroundColor: "var(--muted)",
          height: 0,
        }}
      />

      {/* OutOfPage Ad */}
      <AdSlot
        id="div-gpt-ad-1661362765847-0"
        name="OutOfPage"
        sizes={[1, 1]}
        outOfPage={true}
        targetingParams={dfpTargetingParams}
        additionalStyle={{
          position: "absolute",
          top: 0,
          left: 0,
          backgroundColor: "var(--muted)",
          height: 0,
        }}
      />
    </>
  );
};

// Server-side props fetching
export const getServerSideProps: GetServerSideProps = async (context) => {
  // Extract slug and playlistId from context
  const { slug } = context.params || {};
  const { playlistId } = context.query;

  // Ensure slug and playlistId are strings
  const videoId = slug && Array.isArray(slug) ? slug[0] : slug || "";
  const playlistIdStr = Array.isArray(playlistId)
    ? playlistId[0]
    : playlistId || "";

  // Fetch video and playlist data
  if (!videoId || !playlistIdStr) {
    return {
      notFound: true,
    };
  }

  try {
    const videos = await getPlaylist(playlistIdStr);
    const video = videos.find((p: any) => p?.node?.videoId === videoId);

    // If video not found, redirect to YouTube
    if (!video) {
      return {
        redirect: {
          destination: `https://www.youtube.com/watch?v=${videoId}`,
          permanent: false,
        },
      };
    }

    // Determine the slug suffix for URL (use first alternate slug if exists)
    const slugSuffix =
      Array.isArray(slug) && slug.length > 1
        ? slug[1]
        : video?.node?.title.toLowerCase().replace(/\s+/g, "-");

    // Generate metadata similar to App Router approach
    const videoURL = `${siteConfig.baseUrl}/videos/${video?.node?.videoId}/${slugSuffix}/?playlistId=${playlistIdStr}`;
    const thumbnailURL = video?.node?.featuredImage?.node?.mediaItemUrl || "";
    const publicationDate = video?.node?.dateGmt || "";
    const tags = video?.node?.tags ? video?.node?.tags?.join(", ") : "FMT";
    const durationInSeconds = parseISO8601DurationToSeconds(
      video?.node?.duration || "PT0S"
    );

    const metaData = {
      title: `${video?.node?.title} | FMT Videos`,
      description: `${video?.node?.excerpt.split(" ").slice(0, 30).join(" ") + "..."}`,
      openGraph: {
        title: video?.node?.title,
        description: `${video?.node?.excerpt.split(" ").slice(0, 30).join(" ") + "..."}`,
        url: videoURL,
        type: "video.movie",
        duration: durationInSeconds,
        releaseDate: publicationDate,
        tags: tags,
        images: [
          {
            url: thumbnailURL,
            width: 1200,
            height: 630,
            alt: `${video?.node?.title} thumbnail`,
          },
        ],
        videos: [
          {
            url: `https://www.youtube.com/embed/${video?.node?.videoId}`,
            width: 1280,
            height: 720,
            secureUrl: `https://www.youtube.com/embed/${video?.node?.videoId}`,
            type: "text/html",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        site: "@fmtoday",
        title: video?.node?.title,
        description: `${video?.node?.excerpt.split(" ").slice(0, 30).join(" ") + "..."}`,
      },
      keywords: tags,
      category: video?.node?.categories?.nodes?.map(
        (category: { name: string }) => category?.name
      ),
    };

    // Prepare JSON-LD data for SEO
    const videoArticles = {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      "@id": `https://www.youtube.com/watch?v=${video?.node?.videoId}`,
      name: video?.node?.title,
      description: video?.node?.excerpt?.split("Subscribe to our channel")[0],
      thumbnailUrl: video?.node?.featuredImage?.node?.mediaItemUrl,
      uploadDate: video?.node?.dateGmt,
      contentUrl: `https://www.youtube.com/watch?v=${video?.node?.videoId}`,
      embedUrl: "https://www.youtube.com/embed/" + video?.node?.videoId,
      duration: video?.node?.duration,
      author: {
        "@type": "NewsMediaOrganization",
        name: "Free Malaysia Today",
        url: siteConfig.baseUrl,
      },
      interactionStatistic: {
        "@type": "InteractionCounter",
        interactionType: "http://schema.org/WatchAction",
        userInteractionCount: video?.node?.statistics?.viewCount ?? 1,
      },
      url: `https://www.freemalaysiatoday.com${video?.node?.uri}`,
      publisher: {
        "@type": "NewsMediaOrganization",
        name: "Free Malaysia Today",
        logo: OrgJsonLD.logo,
      },
      isFamilyFriendly: true,
      keywords: video?.node?.tags.join(", "),
      caption: video?.node?.title,
      genre: video?.node?.categories?.nodes
        .map((category: { name: string }) => category?.name)
        .join(", "),
    };

    // Pass data to the page via props
    return {
      props: {
        video,
        videos,
        videoId,
        playlistId: playlistIdStr,
        metaData,
        videoArticles,
      },
    };
  } catch (error) {
    console.error("Error fetching video details:", error);
    return {
      notFound: true,
    };
  }
};

export default VideoDetailPage;
