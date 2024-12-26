import useSWR from "swr";
import SectionHeading from "../SectionHeading";
import MostViewedItem from "./MostViewedItem";
import { MostViewedSkeleton } from "@/components/skeletons/MostViewedSkeleton";
import { MostViewedItemType } from "@/types/global"; 

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

const MostViewed = () => {
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
      <div className="p-4 text-red-600 bg-red-50 rounded-lg">
        Failed to load most viewed posts. Please try again later.
      </div>
    );
  }

  return (
    <div className="flex flex-col mb-8 md:pl-5 pl-2 justify-center">
      <SectionHeading sectionName="most viewed last 2 days" />
      {isLoading ? (
        <MostViewedSkeleton />
      ) : (
        posts?.map((item, i) => (
          <MostViewedItem key={item.uri} item={item} index={i} />
        ))
      )}
    </div>
  );
};

export default MostViewed;
