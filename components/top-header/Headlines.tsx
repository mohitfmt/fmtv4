import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const Headlines = () => {
  const { data: posts, error } = useSWR("/api/top-news", fetcher, {
    fallbackData: [],
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 3000000,
    dedupingInterval: 30000,
  });
  const [isHovering, setIsHovering] = useState(false);

  const customStyle = {
    animation: `marquee 60s linear infinite ${
      isHovering ? "paused" : "running"
    }`,
  };
  let categoryDisplayName = "Breaking News";
  const makeDisplayName4Category = (catName: string) => {
    switch (catName) {
      case "super-highlight":
        categoryDisplayName = "breaking news";
        break;
      case "top-news":
        categoryDisplayName = "just in";
        break;
      case "top-bm":
        categoryDisplayName = "berita";
        break;
      case "leisure":
        categoryDisplayName = "Lifestyle";
        break;
      default:
        categoryDisplayName = catName;
        break;
    }
    return categoryDisplayName;
  };

  return (
    <div className="flex flex-1 items-center gap-2 overflow-hidden text-sm">
      <h3 className="font-bold uppercase font-rhd">Headlines</h3>
      <div className="relative flex items-center overflow-x-hidden">
        <div
          className="animate-marquee whitespace-nowrap"
          style={customStyle}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {posts?.map((post: any, index: number) => (
            <Link
              key={`${post?.id}${index}`}
              className="mx-1 inline-flex items-center"
              href={post?.uri}
              prefetch={false}
            >
              <span className="uppercase p-1 px-2 bg-yellow-300 text-black text-xs tracking-wider font-semibold mr-2 rounded-lg">
                {makeDisplayName4Category(post.categoryName)} &rarr;
              </span>
              <span className="text-sm">{post?.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Headlines;
