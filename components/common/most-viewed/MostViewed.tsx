import useSWR from "swr";
import SectionHeading from "../SectionHeading";
import MostViewedItem from "./MostViewedItem";
import LTRNewsPreview from "../news-preview-cards/LTRNewsPreview";
import { MostViewedSkeleton } from "@/components/skeletons/MostViewedSkeleton";
import { MostViewedItemType } from "@/types/global";
import { FooterSkeleton } from "@/components/skeletons/FooterColumnSkeleton";

interface MostViewedProps {
  isFooter?: boolean;
}

const fetcher = (url: string) =>
  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    })
    .catch((error) => {
      console.error("Fetch error:", error);
      throw error;
    });

const MostViewed = ({ isFooter = false }: MostViewedProps) => {
  const {
    data: posts,
    error,
    isLoading,
  } = useSWR<MostViewedItemType[]>("/api/most-viewed", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
    errorRetryCount: 3,
  });

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 dark:bg-red-900/10 rounded-lg">
        Failed to load most viewed posts. Please try again later.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={isFooter ? "" : "flex flex-col mb-8 justify-center"}>
        {!isFooter && <SectionHeading sectionName="most viewed last 2 days" />}
        {isFooter ? (
          <div className="mt-4 flex flex-col gap-4">
            {[...Array(3)].map((_, index) => (
              <FooterSkeleton key={`skeleton-${index}`} />
            ))}
          </div>
        ) : (
          <MostViewedSkeleton />
        )}
      </div>
    );
  }

  if (isFooter) {
    return (
      <div className="mt-4 flex flex-col gap-4">
        {posts?.slice(0, 3)?.map((item) => (
          <LTRNewsPreview
            key={item.uri}
            title={item.title}
            uri={item.uri}
            slug={item.slug}
            date={item.date}
            featuredImage={{
              node: {
                sourceUrl: item.image,
                mediaItemUrl: item.uri,
              },
            }}
            categories={{
              edges: [
                {
                  node: {
                    id: "most-viewed",
                    name: "Most Viewed",
                  },
                },
              ],
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col mb-8 justify-center">
      <SectionHeading sectionName="most viewed last 2 days" />
      {posts?.map((item, i) => (
        <MostViewedItem key={item.uri} item={item} index={i} />
      ))}
    </div>
  );
};

export default MostViewed;
