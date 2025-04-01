import React from "react";
// import Head from "next/head";
import { GetServerSideProps, NextPage } from "next";

import { VideoDetailPageProps } from "@/types/global";
// import VideoDetailedContent from "@/components/videos/VideoDetailedContent";
// import { LatestVideosSidebar } from "@/components/videos/LatestVideosSideBar";
// import VideoSidebarSkeleton from "@/components/skeletons/VideoSidebarSkeleton";
// import AdSlot from "@/components/common/AdSlot";
import { getPlaylist } from "@/lib/api";
// import { parseISO8601DurationToSeconds } from "@/lib/utils";
// import { OrgJsonLD, websiteJSONLD } from "@/constants/jsonlds/org";
// import ErrorBoundary from "@/components/common/ErrorBoundary";

const VideoDetailPage: NextPage<VideoDetailPageProps> = ({
  video,
  // videos,
  videoId,
  playlistId,
  // metaData,
  // videoArticles,
}) => {
  // const shareUrl = metaData?.openGraph?.url || "";
  // const shareTitle = video?.node?.title || "";
  // const shareThumbnail = video?.node?.featuredImage?.node?.mediaItemUrl || "";
  // const tags = video?.node?.tags || [];

  console.log("[VideoDetailPage] Rendering with data:");
  console.log("videoId:", videoId);
  console.log("playlistId:", playlistId);

  // const dfpTargetingParams = {
  //   pos: "listing",
  //   section: ["videos page"],
  //   key: tags,
  // };

  return (
    // <ErrorBoundary>
    <>
      <h1>This is video detail page</h1>
      <h2>Playlist id : {playlistId}</h2>
      <h3>Video id : {videoId}</h3>
    </>
    // </ErrorBoundary>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  console.log("[SSR] context:", context.query);
  const { slug } = context.params || {};
  const { playlistId } = context.query;

  const videoId = Array.isArray(slug) ? slug[0] : slug || "";
  const playlistIdStr = Array.isArray(playlistId)
    ? playlistId[0]
    : playlistId || "PLKe9JQ8opkEAErOOqs4tB87iWhuh_-osl";

  console.log("[SSR] videoId:", videoId);
  console.log("[SSR] playlistId:", playlistIdStr);

  if (!videoId) {
    return { notFound: true };
  }

  try {
    const videos = await getPlaylist(playlistIdStr);
    const video = videos.find((p: any) => p?.node?.videoId === videoId);

    if (!video) {
      return {
        redirect: {
          destination: `https://www.youtube.com/watch?v=${videoId}`,
          permanent: false,
        },
      };
    }

    // const slugSuffix =
    //   Array.isArray(slug) && slug.length > 1
    //     ? slug[1]
    //     : video?.node?.title?.toLowerCase().replace(/\s+/g, "-");

    // const videoURL = `https://www.freemalaysiatoday.com/videos/${video?.node?.videoId}/${slugSuffix}/?playlistId=${playlistIdStr}`;
    // const thumbnailURL = video?.node?.featuredImage?.node?.mediaItemUrl || "";
    // const publicationDate = video?.node?.dateGmt || "";
    // const tags = video?.node?.tags?.join(", ") || "FMT";
    // const durationInSeconds = parseISO8601DurationToSeconds(
    //   video?.node?.duration || "PT0S"
    // );

    // const metaData = {
    //   title: `${video?.node?.title} | FMT Videos`,
    //   description: `${video?.node?.excerpt?.split(" ").slice(0, 30).join(" ") + "..."}`,
    //   openGraph: {
    //     title: video?.node?.title,
    //     description: `${video?.node?.excerpt?.split(" ").slice(0, 30).join(" ") + "..."}`,
    //     url: videoURL,
    //     type: "video.movie",
    //     duration: durationInSeconds,
    //     releaseDate: publicationDate,
    //     tags: tags,
    //     images: [
    //       {
    //         url: thumbnailURL,
    //         width: 1200,
    //         height: 630,
    //         alt: `${video?.node?.title} thumbnail`,
    //       },
    //     ],
    //     videos: [
    //       {
    //         url: `https://www.youtube.com/embed/${video?.node?.videoId}`,
    //         width: 1280,
    //         height: 720,
    //         secureUrl: `https://www.youtube.com/embed/${video?.node?.videoId}`,
    //         type: "text/html",
    //       },
    //     ],
    //   },
    //   twitter: {
    //     card: "summary_large_image",
    //     site: "@fmtoday",
    //     title: video?.node?.title,
    //     description: `${video?.node?.excerpt?.split(" ").slice(0, 30).join(" ") + "..."}`,
    //   },
    //   keywords: tags,
    //   category: video?.node?.categories?.nodes?.map(
    //     (category: { name: string }) => category?.name
    //   ),
    // };

    // const videoArticles = {
    //   "@context": "https://schema.org",
    //   "@type": "VideoObject",
    //   "@id": `https://www.youtube.com/watch?v=${video?.node?.videoId}`,
    //   name: video?.node?.title,
    //   description: video?.node?.excerpt?.split("Subscribe to our channel")[0],
    //   thumbnailUrl: thumbnailURL,
    //   uploadDate: publicationDate,
    //   contentUrl: video?.node?.uri,
    //   embedUrl: `https://www.youtube.com/embed/${video?.node?.videoId}`,
    //   duration: video?.node?.duration,
    //   author: {
    //     "@type": "NewsMediaOrganization",
    //     name: "Free Malaysia Today",
    //     url: "https://www.freemalaysiatoday.com/",
    //   },
    //   interactionStatistic: {
    //     "@type": "InteractionCounter",
    //     interactionType: "http://schema.org/WatchAction",
    //     userInteractionCount: video?.node?.statistics?.viewCount ?? 1,
    //   },
    //   url: `https://www.youtube.com/watch?v=${video?.node?.videoId}`,
    //   publisher: {
    //     "@type": "NewsMediaOrganization",
    //     name: "Free Malaysia Today",
    //     logo: {
    //       "@type": "ImageObject",
    //       url: "https://www.freemalaysiatoday.com/icon-512x512.png",
    //       width: 512,
    //       height: 512,
    //     },
    //   },
    //   isFamilyFriendly: true,
    //   keywords: tags,
    //   caption: video?.node?.title,
    //   genre: video?.node?.categories?.nodes
    //     ?.map((category: { name: string }) => category?.name)
    //     .join(", "),
    // };

    return {
      props: {
        video,
        videos,
        videoId,
        playlistId: playlistIdStr,
        // metaData,
        // videoArticles,
      },
    };
  } catch (error) {
    console.error("[getServerSideProps] Error fetching video details:", error);
    return { notFound: true };
  }
};

export default VideoDetailPage;
