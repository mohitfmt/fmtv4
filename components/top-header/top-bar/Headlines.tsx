import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { ArrowRight } from "@phosphor-icons/react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const Headlines = () => {
  // in Sync-Content API wrote await mutate("api/top-news"); in handler
  const { data: posts, error } = useSWR("/api/top-news", fetcher, {
    fallbackData: [],
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    revalidateIfStale: true,
    refreshInterval: 60000, // 60 seconds
  });
  const [isHovering, setIsHovering] = useState(false);

  const customStyle = {
    animation: `marquee 60s linear infinite ${isHovering ? "paused" : "running"
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
      <h3 className="uppercase font-rhd flex flex-col items-end">
        <span className="tracking-wider font-bold text-lg -mb-1">Latest</span>
        <span className=" tracking-tight">Headlines</span>
      </h3>

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


              <span className="uppercase py-0.5 px-2 bg-accent-yellow text-black text-sm tracking-wide font-semibold mr-2 rounded-lg">
                <span className="flex items-center">
                  {makeDisplayName4Category(post.categoryName)}
                  <ArrowRight size={15} className="inline ml-1 font-bolder" />
                </span>
              </span>

              <span className="">{post?.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Headlines;
