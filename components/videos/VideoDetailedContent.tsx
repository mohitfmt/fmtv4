import React from "react";
import { YouTubeEmbed } from "@next/third-parties/google";
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
  return (
    <main className="lg:w-2/3">
      <YouTubeEmbed
        params="controls=1&showinfo=1"
        style="max-width: 100vw; rounded: 50px"
        videoid={videoId}
      />

      <div className="py-4">
        <h1 className="mt-1 text-4xl font-extrabold">
          {video?.node?.title}
        </h1>

        <div className="mt-4 flex justify-between items-center align-middle">
          {video?.node?.dateGmt && (
            <FullDateDisplay
              dateString={video.node?.dateGmt}
              tooltipPosition="right"
            />
          )}
          <div>
            <ShareComponents
              url={shareUrl}
              title={shareTitle}
              mediaUrl={shareThumbnail}
              hashs={tags}
            />
          </div>
        </div>

        <div className="overflow-hidden text-wrap py-8 font-roboto">
          <Linkify
            options={{ nl2br: true, rel: "nofollow", target: "_blank" }}
          >
            {video?.node?.excerpt}
          </Linkify>
        </div>
      </div>
    </main>
  );
};

export default VideoDetailedContent;