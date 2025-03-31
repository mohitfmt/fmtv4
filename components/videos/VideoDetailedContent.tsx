import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Linkify from "linkify-react";
import ShareComponents from "@/components/news-article/ShareButtons";
import FullDateDisplay from "@/components/common/display-date-formats/FullDateDisplay";
import { VideoContentProps } from "@/types/global";

// Client-side only YouTube component
const YouTubeEmbed = dynamic(
  () => import("@next/third-parties/google").then((mod) => mod.YouTubeEmbed),
  { ssr: false }
);

const VideoDetailedContent = ({
  video,
  videoId,
  shareUrl,
  shareTitle,
  shareThumbnail,
  tags,
}: VideoContentProps) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    console.log("[VideoDetailedContent] Component mounted");
    console.log("videoId:", videoId);
    console.log("shareUrl:", shareUrl);
    console.log("shareTitle:", shareTitle);
    console.log("shareThumbnail:", shareThumbnail);
    console.log("tags:", tags);
    console.log("video.node.title:", video?.node?.title);
    console.log("video.node.dateGmt:", video?.node?.dateGmt);
    console.log("video.node.excerpt:", video?.node?.excerpt);
  }, []);

  if (!video?.node) {
    console.warn("[VideoDetailedContent] video.node is undefined or null");
    return <div>Video information unavailable</div>;
  }

  return (
    <main className="lg:w-2/3">
      {isClient ? (
        <YouTubeEmbed
          params="controls=1&showinfo=1"
          style="max-width: 100vw; rounded: 50px"
          videoid={videoId}
        />
      ) : (
        <div
          style={{
            aspectRatio: "16/9",
            backgroundColor: "#f0f0f0",
            width: "100%",
            height: "auto",
          }}
        >
          Loading video...
        </div>
      )}

      <div className="py-4">
        <h1 className="mt-1 text-4xl font-extrabold">
          {video?.node?.title || ""}
        </h1>

        <div className="mt-4 flex justify-between items-center align-middle">
          {video?.node?.dateGmt && (
            <FullDateDisplay
              dateString={video.node.dateGmt}
              tooltipPosition="right"
            />
          )}
          <div>
            <ShareComponents
              url={shareUrl || ""}
              title={shareTitle || ""}
              mediaUrl={shareThumbnail || ""}
              hashs={tags || []}
            />
          </div>
        </div>

        <div className="overflow-hidden text-wrap py-8 font-roboto">
          <Linkify options={{ nl2br: true, rel: "nofollow", target: "_blank" }}>
            {typeof video?.node?.excerpt === "string" ? video.node.excerpt : ""}
          </Linkify>
        </div>
      </div>
    </main>
  );
};

export default VideoDetailedContent;
