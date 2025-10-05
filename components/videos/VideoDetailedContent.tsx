// components/videos/VideoDetailedContent.tsx
// ENHANCED: Phase 1 - Performance foundation with VideoFacade
import React from "react";
import Linkify from "linkify-react";
import FullDateDisplay from "@/components/common/display-date-formats/FullDateDisplay";
import ShareComponents from "../news-article/ShareComponents";
import VideoFacade from "./VideoFacade";

interface VideoContentProps {
  video: any;
  videoId: string;
  shareUrl: string;
  shareTitle: string;
  shareThumbnail: string;
  tags: string[];
}

const VideoDetailedContent: React.FC<VideoContentProps> = ({
  video,
  videoId,
  shareUrl,
  shareTitle,
  shareThumbnail,
  tags,
}) => {
  if (!video?.node) {
    return <div className="lg:w-2/3 p-4">Video information not available</div>;
  }

  // Extract thumbnail from video data with fallbacks
  const getVideoThumbnail = () => {
    if (shareThumbnail) return shareThumbnail;

    // Try to extract from video node if available
    if (video.node?.thumbnails) {
      return (
        video.node.thumbnails.maxres?.url ||
        video.node.thumbnails.high?.url ||
        video.node.thumbnails.medium?.url
      );
    }

    // Return undefined to let VideoFacade handle its own fallbacks
    return undefined;
  };

  return (
    <main className="lg:w-2/3">
      {/* 🆕 VideoFacade instead of direct iframe */}
      <div className="mb-4">
        <VideoFacade
          videoId={videoId}
          title={video?.node?.title || "YouTube video player"}
          thumbnail={getVideoThumbnail()}
          aspectRatio="video"
          priority={true} // Hero video gets priority loading
          className="rounded-lg overflow-hidden"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 800px"
          onLoad={() => {
            // Optional: Track video facade interactions
            if (typeof window !== "undefined" && window.gtag) {
              window.gtag("event", "video_facade_loaded", {
                event_category: "Video",
                event_label: videoId,
              });
            }
          }}
          onError={(error) => {
            console.error("VideoFacade error:", error);
            // Optional: Track errors for monitoring
            if (typeof window !== "undefined" && window.gtag) {
              window.gtag("event", "video_facade_error", {
                event_category: "Video",
                event_label: videoId,
                value: error.message,
              });
            }
          }}
        />
      </div>

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

        <p className="overflow-hidden text-wrap py-8 font-roboto">
          <Linkify options={{ nl2br: true, rel: "nofollow", target: "_blank" }}>
            {video?.node?.excerpt || ""}
          </Linkify>
        </p>
      </div>
    </main>
  );
};

export default VideoDetailedContent;
