import React from "react";
import Image from "next/image";
import { Clock, Eye, ThumbsUp, MessageSquare, Play } from "lucide-react";
import SectionHeading from "../common/SectionHeading";
import Link from "next/link";
import {
  formatMalaysianDate,
  formatMalaysianTime24h,
} from "../common/display-date-formats/DateFormates";

// Helper function to format view count
const formatViewCount = (count: string | number): string => {
  const numCount = typeof count === "string" ? parseInt(count, 10) : count;
  if (isNaN(numCount)) return "0";

  if (numCount >= 1000000) {
    return `${(numCount / 1000000).toFixed(1)}M`;
  } else if (numCount >= 1000) {
    return `${(numCount / 1000).toFixed(1)}K`;
  }
  return String(numCount);
};

const formatDuration = (duration: string): string => {
  if (!duration) return "0:00";

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

// Get best available thumbnail URL
const getThumbnailUrl = (video: any): string => {
  if (video.thumbnails?.maxres) return video.thumbnails.maxres;
  if (video.thumbnails?.high) return video.thumbnails.high;
  if (video.thumbnails?.medium) return video.thumbnails.medium;
  if (video.thumbnails?.standard) return video.thumbnails.standard;
  if (video.thumbnails?.default) return video.thumbnails.default;

  // Fallback to YouTube URL
  const videoId = video.videoId || video.id;
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
};

// Featured Video Card (Large - First Video)
const FeaturedVideoCard = ({ video }: any) => {
  const thumbnailUrl = getThumbnailUrl(video);
  const description = video.description || "";
  const dateGmt =
    typeof video.publishedAt === "string"
      ? video.publishedAt
      : video.publishedAt?.toISOString() || new Date().toISOString();

  return (
    <div className="relative group overflow-hidden rounded-lg h-[400px] xl:h-[460px]">
      {/* Thumbnail */}
      <div className="relative h-full">
        <Image
          src={thumbnailUrl}
          alt={video.title}
          width={640}
          height={480}
          className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
          priority
        />

        {/* Play Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/50 rounded-full p-3 transition-all duration-300 group-hover:bg-black/70 group-hover:scale-110">
            <Play className="text-white w-8 h-8" />
          </div>
        </div>

        {/* Duration Badge */}
        <div className="absolute top-3 right-3 bg-black/90 text-white px-2.5 py-1.5 rounded-md flex items-center gap-1.5 font-medium shadow-lg">
          <Clock size={14} />
          {formatDuration(video.duration)}
        </div>
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-2 lg:p-5">
        <h2
          className="text-pretty text-2xl md:text-4xl font-extrabold font-bitter mb-3 text-white"
          style={{ textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8)" }}
          title={video.title}
        >
          {video.title}
        </h2>
        <p
          className="line-clamp-2 mb-3 text-gray-100"
          style={{ textShadow: "1px 1px 2px rgba(0, 0, 0, 0.5)" }}
        >
          {description.replace(/\n/g, " ").replace(/Read More:.*$/, "")}
        </p>

        <div className="flex items-center justify-between text-gray-200">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Eye size={16} />
              {formatViewCount(video.viewCount || 0)}
            </span>
            <span className="flex items-center gap-1.5">
              <ThumbsUp size={16} />
              {formatViewCount(video.likeCount || 0)}
            </span>
            {video.commentCount && parseInt(String(video.commentCount)) > 0 && (
              <span className="flex items-center gap-1.5">
                <MessageSquare size={16} />
                {formatViewCount(video.commentCount)}
              </span>
            )}
          </div>

          <time
            className="flex items-center gap-1.5 bg-black/80 text-white px-1.5 py-1 rounded-md"
            dateTime={formatMalaysianDate(dateGmt, false)}
          >
            {formatMalaysianTime24h(dateGmt)}
          </time>
        </div>
      </div>
    </div>
  );
};

// Secondary Video Card (Small - Grid Videos)
const SecondaryVideoCard = ({ video }: any) => {
  const thumbnailUrl = getThumbnailUrl(video);
  const dateGmt =
    typeof video.publishedAt === "string"
      ? video.publishedAt
      : video.publishedAt?.toISOString() || new Date().toISOString();

  return (
    <div className="group px-1 h-full flex flex-col border-b transition-shadow border-stone-200 dark:border-stone-600 hover:shadow-xl dark:hover:shadow-stone-600 dark:hover:shadow-md">
      {/* Thumbnail Container */}
      <div className="relative overflow-hidden rounded-lg aspect-video">
        <Image
          src={thumbnailUrl}
          alt={video.title}
          width={320}
          height={180}
          className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
        />

        {/* Play Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/50 rounded-full p-3 transition-all duration-300 group-hover:bg-black/70 group-hover:scale-110">
            <Play className="text-white w-6 h-6" />
          </div>
        </div>

        {/* Time Badge */}
        <div className="absolute bottom-2 right-2">
          <time
            className="flex items-center gap-1.5 bg-black/80 text-white px-1 py-0.5 rounded-md"
            dateTime={formatMalaysianDate(dateGmt, false)}
          >
            {formatMalaysianTime24h(dateGmt)}
          </time>
        </div>
      </div>

      {/* Content */}
      <div className="my-2 text-lg font-bitter font-semibold leading-snug transition-colors hover:text-blue-700 dark:hover:text-cyan-300">
        <h3 className="line-clamp-2">{video.title}</h3>
      </div>
    </div>
  );
};

const LatestVideosOnHomePage = ({ videos }: any) => {
  // Validate input
  if (!videos || !Array.isArray(videos) || videos.length === 0) {
    return null;
  }

  const featuredVideo = videos[0];
  const secondaryVideos = videos.slice(1, 5);

  return (
    <section className="my-10 mb-20">
      <Link href="/videos">
        <SectionHeading sectionName="Latest Videos" />
      </Link>

      <div className="grid grid-cols-12 gap-4">
        {/* Featured Video - Left Side (7 columns) */}
        <Link
          href={`/videos/${featuredVideo.videoId || featuredVideo.id}`}
          className="col-span-12 lg:col-span-7"
        >
          <FeaturedVideoCard video={featuredVideo} />
        </Link>

        {/* Secondary Videos - Right Side (5 columns, 2x2 grid) */}
        <div className="col-span-12 lg:col-span-5 grid grid-cols-2 gap-4">
          {secondaryVideos.map((video: any) => {
            const videoId = video.videoId || video.id;
            const uniqueKey = `${videoId}-${video.publishedAt}`;

            return (
              <Link
                href={`/videos/${videoId}`}
                key={uniqueKey}
                className="col-span-1"
              >
                <SecondaryVideoCard video={video} />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default LatestVideosOnHomePage;
