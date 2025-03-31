import React, { useState, useEffect } from "react";
import Linkify from "linkify-react";
import ShareComponents from "@/components/news-article/ShareButtons";
import FullDateDisplay from "@/components/common/display-date-formats/FullDateDisplay";

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
  const [isClient, setIsClient] = useState(false);

  // Only render YouTube component on client side
  useEffect(() => {
    setIsClient(true);

    // Debug information
    console.log("VideoDetailedContent mounted, videoId:", videoId);
  }, [videoId]);

  if (!video?.node) {
    return <div className="lg:w-2/3 p-4">Video information not available</div>;
  }

  return (
    <main className="lg:w-2/3">
      <div className="aspect-video w-full bg-slate-100 mb-4">
        {isClient ? (
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}`}
            title={video?.node?.title || "YouTube video player"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p>Loading video...</p>
          </div>
        )}
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

        <div className="overflow-hidden text-wrap py-8 font-roboto">
          <Linkify options={{ nl2br: true, rel: "nofollow", target: "_blank" }}>
            {video?.node?.excerpt || ""}
          </Linkify>
        </div>
      </div>
    </main>
  );
};

export default VideoDetailedContent;
