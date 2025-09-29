// components/videos/ShortsRail.tsx
// Displays videos from the designated "shorts" playlist
// Duration doesn't matter - any video in the shorts playlist is considered a "short"
import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FaPlay,
  FaEye,
  FaChevronLeft,
  FaChevronRight,
  FaArrowRight,
} from "react-icons/fa";
import { BsLightningChargeFill } from "react-icons/bs";
import { Button } from "@/components/ui/button";
import { formatViewCount, formatDuration } from "@/lib/utils";
import type { Video } from "@/types/video";

const ShortsRail = ({ shorts }: { shorts: Video[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, number>>({});
  const [isVisible, setIsVisible] = useState(false);

  // Display up to 12 videos from shorts playlist, with "View More" as 13th item
  const displayShorts = shorts.slice(0, 12);

  // Lazy load the entire component
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = scrollRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => observer.disconnect();
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Thumbnail priority list for Shorts (frame0.jpg for vertical videos)
  const getThumbnailPriorityList = (videoId: string) => [
    `https://i.ytimg.com/vi/${videoId}/frame0.jpg`,
    `https://i.ytimg.com/vi/${videoId}/oar2.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hq1.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
  ];

  const getShortsThumbnailUrl = (video: Video) => {
    const errorCount = imageErrors[video.videoId] || 0;
    const priorityList = getThumbnailPriorityList(video.videoId);
    return priorityList[Math.min(errorCount, priorityList.length - 1)];
  };

  const handleImageError = (videoId: string) => {
    setImageErrors((prev) => ({
      ...prev,
      [videoId]: (prev[videoId] || 0) + 1,
    }));
  };

  if (displayShorts.length === 0) {
    return null;
  }

  return (
    <section className="my-8" aria-label="Shorts Videos">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BsLightningChargeFill className="w-6 h-6 text-red-600" />
          <h2 className="text-2xl font-bold">Shorts</h2>
          <span className="text-sm text-muted-foreground">Quick videos</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("left")}
            aria-label="Scroll left"
          >
            <FaChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("right")}
            aria-label="Scroll right"
          >
            <FaChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {/* Display shorts in 9:16 vertical format (180px × 320px) */}
        {displayShorts.map((short) => (
          <article
            key={short.videoId}
            className="flex-shrink-0 w-[180px] group"
          >
            <Link href={`/videos/${short.videoId}`} prefetch={false}>
              <div className="relative aspect-[9/16] bg-gray-900 rounded-lg overflow-hidden">
                {isVisible && (
                  <Image
                    src={getShortsThumbnailUrl(short)}
                    alt={short.title}
                    fill
                    sizes="180px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized
                    onError={() => handleImageError(short.videoId)}
                    loading="lazy"
                  />
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Play button on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="bg-white/90 rounded-full p-3">
                    <FaPlay className="w-5 h-5 text-black ml-0.5" />
                  </div>
                </div>

                {/* Video info at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                  <h3 className="text-xs font-semibold line-clamp-2 mb-1">
                    {short.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-white/90">
                    <FaEye className="w-3 h-3" />
                    <span>
                      {formatViewCount(short.statistics?.viewCount || 0)}
                    </span>
                  </div>
                </div>

                {/* Duration badge */}
                <div className="absolute top-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-white text-xs font-medium">
                  {formatDuration(short.duration)}
                </div>
              </div>
            </Link>
          </article>
        ))}

        {/* "View More" as 13th item if there are more than 12 shorts */}
        {shorts.length > 12 && (
          <div className="flex-shrink-0 w-[180px]">
            <Link href="/videos/shorts" prefetch={false}>
              <div className="relative aspect-[9/16] bg-gradient-to-br from-red-600 to-red-800 rounded-lg overflow-hidden flex flex-col items-center justify-center group cursor-pointer">
                <div className="text-white text-center p-4">
                  <div className="bg-white/20 rounded-full p-3 mb-3 mx-auto w-fit group-hover:scale-110 transition-transform">
                    <FaArrowRight className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-sm mb-1">View More</p>
                  <p className="text-xs opacity-90">
                    {shorts.length - 12}+ shorts
                  </p>
                </div>
              </div>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default ShortsRail;
