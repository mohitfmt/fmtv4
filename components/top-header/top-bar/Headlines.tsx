import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import useSWR from "swr";
import HeadlineSkeleton from "@/components/skeletons/HeadlineSkeleton";

type Post = {
  id: string;
  uri: string;
  title: string;
  categoryName: string;
};

// Separate fetcher function with error handling
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch headlines");
  }
  return res.json();
};

// Category mapping in a constant
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  "super-highlight": "breaking news",
  "top-news": "just in",
  "top-bm": "berita",
  leisure: "Lifestyle",
};

const Headlines = () => {
  const [isHovering, setIsHovering] = useState(false);

  const {
    data: posts,
    error,
    isLoading,
    mutate,
  } = useSWR<Post[]>("/api/top-news", fetcher, {
    fallbackData: [],
    refreshInterval: 300000, // 5 minutes
  });

  // Memoized category name function
  const getCategoryDisplayName = useCallback((catName: string): string => {
    return CATEGORY_DISPLAY_NAMES[catName.toLowerCase()] || catName;
  }, []);

  // Error handling with retry
  if (error) {
    return (
      <div className="flex items-center gap-2 overflow-hidden">
        <HeadlineSkeleton />
        <button
          onClick={() => mutate()}
          className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded-md hover:bg-red-100"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center gap-2 overflow-hidden">
      <h3 className="uppercase text-sm sm:text-base sm:leading-none font-rhd flex flex-col items-end leading-none shrink-0">
        <span className="tracking-widest">Latest</span>
        <span className="font-semibold">Headlines</span>
      </h3>

      <div className="relative flex items-center overflow-x-hidden">
        <div
          className="animate-marquee whitespace-nowrap"
          style={{
            willChange: "transform",
            animation: posts?.length
              ? `marquee 60s linear infinite ${
                  isHovering ? "paused" : "running"
                }`
              : "none",
          }}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {isLoading ? (
            <HeadlineSkeleton />
          ) : (
            posts?.map((post, index) => (
              <Link
                key={`${post.id}-${index}`}
                className="mx-1 inline-flex items-center group"
                href={post.uri}
                prefetch={false}
              >
                <span className="uppercase py-0.5 px-2 bg-accent-yellow text-sm tracking-wide font-semibold mr-2 rounded-lg">
                  <span className="flex items-center text-black">
                    {getCategoryDisplayName(post.categoryName)}
                    <ArrowRightIcon className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </span>
                <span className="group-hover:text-cyan-300 transition-colors">
                  {post.title}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Headlines;
