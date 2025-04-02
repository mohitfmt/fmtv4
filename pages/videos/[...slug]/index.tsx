import React from "react";
import Head from "next/head";
import { useRouter } from "next/router";

// import VideoSidebarSkeleton from "@/components/skeletons/VideoSidebarSkeleton";
import { OrgJsonLD, websiteJSONLD } from "@/constants/jsonlds/org";
import { parseISO8601DurationToSeconds } from "@/lib/utils";
import { getPlaylist } from "@/lib/api";
import AdSlot from "@/components/common/AdSlot";
import { VideoDetailPageProps } from "@/types/global";
import VideoDetailedContent from "@/components/videos/VideoDetailedContent";
// import { LatestVideosSidebar } from "@/components/videos/LatestVideosSideBar";
import siteConfig from "@/constants/site-config";

export default function VideoDetailPage({
  video,
  // videos,
  videoId,
  playlistId,
  metaData,
  videoArticles,
}: VideoDetailPageProps) {
  const router = useRouter();

  // // If the page is still generating via fallback or router isn't ready
  if (router.isFallback || !router.isReady) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  console.log("videoId :", videoId);
  console.log("playlistId :", playlistId);

  const shareUrl = metaData?.openGraph?.url;
  const shareTitle = video?.node?.title;
  const shareThumbnail = video?.node?.featuredImage?.node?.mediaItemUrl;
  const tags = video?.node?.tags || [];

  const dfpTargetingParams = {
    pos: "listing",
    section: ["videos page"],
    key: tags,
  };

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
            {metaData.openGraph.images?.map((image: any, index: any) => (
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
        {/* <Suspense fallback={<VideoSidebarSkeleton />}>
          <LatestVideosSidebar videos={videos} playlistId={playlistId} />
        </Suspense> */}
      </div>
    </>
  );
}

// Switch from getStaticPaths/getStaticProps to getServerSideProps
// since we need to handle the dynamic playlist ID from the URL
export async function getServerSideProps(context: any) {
  // Extract the slug array from path parameters
  const { slug } = context.params || {};

  // Get videoId (first slug element)
  const videoId = Array.isArray(slug) ? slug[0] : "";

  // Get title slug (second slug element if exists)
  const titleSlug = Array.isArray(slug) && slug.length > 1 ? slug[1] : "";

  // Get playlistId from query parameter - fully dynamic
  const { playlistId } = context.query;

  console.log("[SSR] video id :", videoId);
  console.log("[SSR] playlist id :", playlistId);

  // Validate that we have the required parameters
  if (!videoId || !playlistId) {
    console.log("[SSR] video or playlist not found :", videoId, playlistId);
    return { notFound: true };
  }

  try {
    // Fetch playlist data with the dynamic playlistId from the URL
    const videos = await getPlaylist(playlistId);

    // Find the specific video in the playlist
    const video = videos.find((p: any) => p?.node?.videoId === videoId);

    console.log("[SSR] detailed video id :", video?.node?.videoId);
    console.log("[SSR] side bar videos lenght :", videos?.length);
    // If video isn't found in this playlist, redirect to YouTube
    if (!video) {
      return {
        redirect: {
          destination: `https://www.youtube.com/watch?v=${videoId}`,
          permanent: false,
        },
      };
    }

    // Generate SEO metadata
    const slugSuffix =
      titleSlug || video?.node?.title?.toLowerCase().replace(/\s+/g, "-");
    const videoURL = `${siteConfig.baseUrl}/videos/${video?.node?.videoId}/${slugSuffix}?playlistId=${playlistId}`;
    const thumbnailURL = video?.node?.featuredImage?.node?.mediaItemUrl || "";
    const publicationDate = video?.node?.dateGmt || "";
    const tagsString = video?.node?.tags
      ? video?.node?.tags?.join(", ")
      : "Video";
    const durationInSeconds = parseISO8601DurationToSeconds(
      video?.node?.duration || "PT0S"
    );

    const metaData = {
      title: `${video?.node?.title} | Videos`,
      description: `${video?.node?.excerpt?.split(" ").slice(0, 30).join(" ") + "..."}`,
      openGraph: {
        title: video?.node?.title,
        description: `${video?.node?.excerpt?.split(" ").slice(0, 30).join(" ") + "..."}`,
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
        description: `${video?.node?.excerpt?.split(" ").slice(0, 30).join(" ") + "..."}`,
      },
      keywords: tagsString,
      category: video?.node?.categories?.nodes?.map(
        (category: any) => category?.name
      ),
    };

    // Prepare JSON-LD data for SEO
    const videoArticles = {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      "@id": `https://www.youtube.com/watch?v=${video?.node?.videoId}`,
      name: video?.node?.title,
      description: video?.node?.excerpt?.split("Subscribe to our channel")[0],
      thumbnailUrl: thumbnailURL,
      uploadDate: publicationDate,
      contentUrl: videoURL,
      embedUrl: `https://www.youtube.com/embed/${video?.node?.videoId}`,
      duration: video?.node?.duration,
      author: {
        "@type": "NewsMediaOrganization",
        name: "Free Malaysia Today",
        url: "https://www.freemalaysiatoday.com/",
      },
      interactionStatistic: {
        "@type": "InteractionCounter",
        interactionType: "http://schema.org/WatchAction",
        userInteractionCount: video?.node?.statistics?.viewCount ?? 1,
      },
      url: `https://www.youtube.com/watch?v=${video?.node?.videoId}`,
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
      caption: video?.node?.title,
      genre: video?.node?.categories?.nodes
        ?.map((category: any) => category?.name)
        .join(", "),
    };

    return {
      props: {
        video,
        videos,
        videoId,
        playlistId,
        metaData,
        videoArticles,
      },
    };
  } catch (error) {
    console.error("Error fetching video details:", error);
    return { notFound: true };
  }
}
