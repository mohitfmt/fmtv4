import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play, Eye, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatViewCount } from "@/lib/utils";
import type { Video } from "@/types/video";

const ShortsRail = ({ shorts }: { shorts: Video[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, number>>({});
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver>();

  // Filter shorts to only include videos between 5 and 60 seconds
  const validShorts = shorts.filter((video) => {
    const duration = video.durationSeconds || parseInt(video.duration) || 0;
    return duration > 5 && duration < 60;
  });

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

  // Thumbnail priority list for Shorts
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

  if (validShorts.length === 0) {
    return null;
  }

  return (
    <section className="my-8" aria-label="Shorts Videos">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-red-600" />
          <h2 className="text-2xl font-bold">Shorts</h2>
          <span className="text-sm text-muted-foreground">
            Quick videos ({validShorts.length})
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("left")}
            aria-label="Scroll left"
            disabled={validShorts.length <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("right")}
            aria-label="Scroll right"
            disabled={validShorts.length <= 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {validShorts.map((short, index) => (
          <article
            key={short.videoId}
            className="flex-shrink-0 w-[250px] group"
          >
            <Link href={`/videos/${short.videoId}`} prefetch={false}>
              <div className="relative aspect-[9/16] bg-gray-900 rounded-lg overflow-hidden">
                {isVisible && (
                  <Image
                    src={getShortsThumbnailUrl(short)}
                    alt={short.title}
                    fill
                    sizes="250px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized
                    onError={() => handleImageError(short.videoId)}
                    loading="lazy"
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="bg-black/60 rounded-full p-3">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                  <h3 className="text-sm font-semibold line-clamp-2 mb-1">
                    {short.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-white/90">
                    <Eye className="w-3 h-3" />
                    <span>
                      {formatViewCount(short.statistics?.viewCount || 0)} views
                    </span>
                  </div>
                </div>

                <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded text-white text-xs font-medium">
                  {short.durationSeconds ||
                    Math.floor(parseInt(short.duration) || 0)}
                  s
                </div>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
};

export default ShortsRail;
