import React, { ErrorInfo } from "react";
import dynamic from "next/dynamic";
import Linkify from "linkify-react";

import ShareComponents from "@/components/news-article/ShareButtons";
import FullDateDisplay from "@/components/common/display-date-formats/FullDateDisplay";

// Error boundary component for catching YouTube player errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Video player error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Dynamically import the YouTube player with SSR disabled
const YouTubeEmbed = dynamic(() => import("./YoutubeEmbedTag"), {
  ssr: false,
  loading: () => (
    <div
      className="w-full bg-gray-200 rounded-lg animate-pulse"
      style={{ paddingTop: "56.25%" }} // 16:9 aspect ratio
    ></div>
  ),
});

interface VideoDetailContentProps {
  video: any;
  videoId: string;
  shareUrl: string;
  shareTitle: string;
  shareThumbnail: string;
  tags: string[];
}

const VideoDetailContent: React.FC<VideoDetailContentProps> = ({
  video,
  videoId,
  shareUrl,
  shareTitle,
  shareThumbnail,
  tags,
}) => {
  return (
    <main className="lg:w-2/3">
      <ErrorBoundary
        fallback={
          <div className="bg-red-50 p-4 rounded-lg mb-4 text-red-500">
            Error loading video player. Please refresh the page.
          </div>
        }
      >
        {/* YouTube Video Player */}
        <YouTubeEmbed videoId={videoId} title={video?.node?.title} />
      </ErrorBoundary>

      <div className="py-4">
        <h1 className="mt-1 text-4xl font-extrabold">{video?.node?.title}</h1>

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
          <Linkify options={{ nl2br: true, rel: "nofollow", target: "_blank" }}>
            {video?.node?.excerpt}
          </Linkify>
        </div>
      </div>
    </main>
  );
};

export default VideoDetailContent;
