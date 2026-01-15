import React from "react";
import Image from "next/image";
import { Clock, Eye, ThumbsUp, Play } from "lucide-react";
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
    <div className="group h-full flex flex-col">
      <div className="relative overflow-hidden rounded-lg aspect-video">
        <Image
          src={thumbnailUrl}
          alt={video.title}
          width={640}
          height={360}
          className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
          priority
        />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/50 rounded-full p-4 transition-all duration-300 group-hover:bg-black/70 group-hover:scale-110">
            <Play className="text-white w-8 h-8" />
          </div>
        </div>

        <div className="absolute bottom-2 left-2 flex items-center gap-4 bg-black/80 px-3 py-1.5 rounded-full text-white text-sm font-medium shadow-lg">
          <span className="flex items-center gap-1">
            <Eye size={14} />
            {formatViewCount(video.viewCount || 0)}
          </span>
          <span className="flex items-center gap-1">
            <ThumbsUp size={14} />
            {formatViewCount(video.likeCount || 0)}
          </span>
        </div>

        <time
          dateTime={formatMalaysianDate(dateGmt, false)}
          className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/80 px-3 py-1.5 rounded-full text-white text-sm font-medium shadow-lg"
        >
          <Clock size={14} />
          {formatMalaysianTime24h(dateGmt)}
        </time>
      </div>

      {/* Content Below Thumbnail */}
      <div className="mt-3">
        <h2 className="font-bitter text-2xl md:text-3xl font-bold leading-tight line-clamp-2 transition-colors hover:text-blue-700 dark:hover:text-cyan-300">
          {video.title}
        </h2>
        <p className="mt-2 text-base text-gray-600 dark:text-gray-300 leading-snug line-clamp-2">
          {description.replace(/\n/g, " ").replace(/Read More:.*$/, "")}
        </p>
      </div>
    </div>
  );
};

// Secondary Video Card (Small - Grid Videos)
const SecondaryVideoCard = ({ video }: any) => {
  const thumbnailUrl = getThumbnailUrl(video);
  const description = video.description || "";
  const dateGmt =
    typeof video.publishedAt === "string"
      ? video.publishedAt
      : video.publishedAt?.toISOString() || new Date().toISOString();

  return (
    <div className="group h-full flex flex-col">
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
          <div className="bg-black/50 rounded-full p-2 transition-all duration-300 group-hover:bg-black/70 group-hover:scale-110">
            <Play className="text-white w-5 h-5" />
          </div>
        </div>

        {/* Stats Pills - Left and Right */}
        {/* Left Pill: Views */}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 px-2 py-1 rounded-full text-white text-xs font-medium shadow-lg">
          <Eye size={12} />
          {formatViewCount(video.viewCount || 0)}
        </div>

        {/* Right Pill: Duration */}
        <time
          dateTime={formatMalaysianDate(dateGmt, false)}
          className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 px-2 py-1 rounded-full text-white text-xs font-medium shadow-lg"
        >
          <Clock size={12} />
          {formatMalaysianTime24h(dateGmt)}
        </time>
      </div>

      {/* Content Below Thumbnail */}
      <div className="mt-2">
        <h3 className="font-bitter text-base font-semibold leading-tight line-clamp-2 transition-colors hover:text-blue-700 dark:hover:text-cyan-300">
          {video.title}
        </h3>
        {description && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-snug line-clamp-2">
            {description.replace(/\n/g, " ").replace(/Read More:.*$/, "")}
          </p>
        )}
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
