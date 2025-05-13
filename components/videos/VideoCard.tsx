// components/videos/VideoCard.tsx
import Image from "next/image";
import Link from "next/link";

import { formattedDisplayDate } from "../common/display-date-formats/DateFormates";
import { parseISO } from "date-fns";

interface VideoCardProps {
  node: {
    id: string;
    title: string;
    uri: string;
    excerpt: string;
    dateGmt: string;
    featuredImage: {
      node: {
        mediaItemUrl: string;
      };
    };
    statistics: {
      viewCount: number;
      likeCount: number;
      commentCount: number;
    };
  };
}

const VideoCard = ({ node }: VideoCardProps) => {
  const { title, uri, excerpt, featuredImage, statistics } = node;

  const formatStats = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <div className="group relative overflow-hidden rounded-lg transition-all duration-300 hover:shadow-lg">
      <Link
        href={uri}
        className="absolute inset-0 z-10"
        prefetch={false}
        aria-label={`Watch ${title}`}
      />
      <div className="relative aspect-video overflow-hidden">
        <Image
          alt={title}
          src={featuredImage.node.mediaItemUrl}
          className="rounded-lg object-cover transition-transform duration-300 group-hover:scale-105"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={false}
        />
      </div>
      <div className="py-2 px-1">
        <h2 className="mb-2 line-clamp-1 text-base font-semibold">{title}</h2>
        <p className="mb-2 line-clamp-2 text-xs font-medium text-gray-700 dark:text-gray-300 ">
          {excerpt}
        </p>
        <div className="flex justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span>{formatStats(statistics.viewCount)} Views</span>
            <span>•</span>
            <span>{formatStats(statistics.likeCount)} Likes</span>
            <span>•</span>
            <span>{formatStats(statistics.commentCount)} Comments</span>
          </div>
          <time dateTime={parseISO(node.dateGmt).toISOString()}>
            {formattedDisplayDate(node?.dateGmt)}
          </time>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
