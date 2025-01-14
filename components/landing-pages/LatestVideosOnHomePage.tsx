import React from "react";
import Image from "next/image";
import { Clock, Eye, ThumbsUp, MessageSquare, Play } from "lucide-react";
import SectionHeading from "../common/SectionHeading";
import PublishingDateTime from "../common/display-date-formats/PublishingDateTime";

// TypeScript Interfaces
interface Statistics {
  viewCount: string;
  likeCount: string;
  favoriteCount: string;
  commentCount: string;
}

interface FeaturedImage {
  node: {
    mediaItemUrl: string;
  };
}

interface VideoNode {
  id: string;
  videoId: string;
  title: string;
  excerpt: string;
  featuredImage: FeaturedImage;
  duration: string;
  statistics: Statistics;
  dateGmt: string;
}

interface VideoCardProps {
  video: VideoNode;
  isFeature?: boolean;
}

interface LatestVideosProps {
  videos: VideoData[];
}

interface VideoData {
  node: VideoNode;
}

// Helper function to format view count
const formatViewCount = (count: string): string => {
  const numCount = parseInt(count, 10);
  if (numCount >= 1000000) {
    return `${(numCount / 1000000).toFixed(1)}M`;
  } else if (numCount >= 1000) {
    return `${(numCount / 1000).toFixed(1)}K`;
  }
  return count;
};

const formatDuration = (duration: string): string => {
  // Handle minutes and seconds format (PT1M30S)
  const fullMatch = duration.match(/PT(\d+)M(\d+)S/);
  if (fullMatch) {
    const [, minutes, seconds] = fullMatch;
    return `${minutes}:${seconds.padStart(2, "0")}`;
  }

  // Handle minutes only format (PT2M)
  const minutesMatch = duration.match(/PT(\d+)M/);
  if (minutesMatch) {
    const [, minutes] = minutesMatch;
    return `${minutes}:00`;
  }

  // Handle seconds only format (PT45S)
  const secondsMatch = duration.match(/PT(\d+)S/);
  if (secondsMatch) {
    const [, seconds] = secondsMatch;
    return `0:${seconds.padStart(2, "0")}`;
  }

  return duration;
};

const VideoCard: React.FC<VideoCardProps> = ({ video, isFeature = false }) => {
  const { title, excerpt, featuredImage, duration, statistics, dateGmt } =
    video;

  if (isFeature) {
    return (
      <div className="relative group overflow-hidden rounded-lg h-[400px] xl:h-[450px] ">
        {/* Thumbnail with better aspect ratio handling */}
        <div className="relative h-full">
          <Image
            src={featuredImage.node.mediaItemUrl}
            alt={title}
            width={640}
            height={480}
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
          />
          {/* Play Icon - Always Visible with hover effect */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/50 rounded-full p-3 transition-all duration-300 group-hover:bg-black/70 group-hover:scale-110">
              <Play className="text-white w-8 h-8" />
            </div>
          </div>
          {/* Duration Badge - More visible */}
          <div className="absolute top-3 right-3 bg-black/90 text-white px-2.5 py-1.5 rounded-md flex items-center gap-1.5 font-medium shadow-lg">
            <Clock size={14} />
            {formatDuration(duration)}
          </div>
        </div>

        {/* Stronger gradient for better text visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Content with improved spacing */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3
            className="text-pretty text-2xl md:text-4xl font-extrabold font-bitter mb-3 text-white"
            style={{ textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8)" }}
            title={title}
          >
            {title}
          </h3>
          <p
            className="line-clamp-2 mb-3 text-gray-100"
            style={{ textShadow: "1px 1px 2px rgba(0, 0, 0, 0.5)" }}
          >
            {excerpt.replace(/\n/g, " ").replace(/Read More:.*$/, "")}
          </p>
          <div className="flex items-center justify-between text-gray-200">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Eye size={16} />
                {formatViewCount(statistics.viewCount)}
              </span>
              <span className="flex items-center gap-1.5">
                <ThumbsUp size={16} />
                {statistics.likeCount}
              </span>
              {parseInt(statistics.commentCount) > 0 && (
                <span className="flex items-center gap-1.5">
                  <MessageSquare size={16} />
                  {statistics.commentCount}
                </span>
              )}
            </div>
            <span className="flex items-center gap-1.5 bg-black text-white">
              <PublishingDateTime dateString={dateGmt} />
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Secondary Video Card
  return (
    <div className="group">
      {/* Thumbnail Container */}
      <div className="relative overflow-hidden rounded-lg aspect-video">
        <Image
          src={featuredImage.node.mediaItemUrl}
          alt={title}
          width={320}
          height={180}
          className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
        />
        {/* Play Icon - Always Visible */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/50 rounded-full p-3 transition-all duration-300 group-hover:bg-black/70 group-hover:scale-110">
            <Play className="text-white w-6 h-6" />
          </div>
        </div>
        {/* Duration Badge */}
        <div className="absolute top-2 right-2 bg-black/80 text-white px-2 py-1 text-sm rounded-md flex items-center gap-1">
          <Clock size={12} />
          {formatDuration(duration)}
        </div>
        <div className="absolute bottom-2 w-full text-white text-sm rounded-md flex items-center gap-1">
          <div className="flex justify-between items-center w-full px-2">
            <div className="flex items-center gap-1">
              <span className="flex items-center bg-black/80 px-1.5 rounded">
                <Eye size={12} />
                {formatViewCount(statistics.viewCount)}
              </span>
              <span className="flex items-center bg-black/80 px-1.5 rounded">
                <ThumbsUp size={12} />
                {statistics.likeCount}
              </span>
            </div>
            <div className="bg-black/80 px-1.5 rounded">
              <PublishingDateTime dateString={dateGmt} />
            </div>
          </div>
        </div>
      </div>

      {/* Content Below Thumbnail */}
      <div className="mt-2">
        <h3 className="line-clamp-3">{title}</h3>
      </div>
    </div>
  );
};

const LatestVideosOnHomePage: React.FC<LatestVideosProps> = ({ videos }) => {
  if (!videos?.length) return null;

  return (
    <section className="my-8">
      <SectionHeading sectionName="Latest Videos" />
      {/* <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Latest Videos</h2>
        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
          View All
        </button>
      </div> */}

      <div className="grid grid-cols-12 gap-4">
        {/* Feature Video */}
        <div className="col-span-12 lg:col-span-7 h-[400px]">
          <VideoCard video={videos[0].node} isFeature={true} />
        </div>

        {/* Secondary Videos Grid */}
        <div className="col-span-12 lg:col-span-5 grid grid-cols-2 gap-4">
          {videos.slice(1, 5).map((video) => (
            <div key={video.node.id} className="col-span-1">
              <VideoCard video={video.node} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LatestVideosOnHomePage;
