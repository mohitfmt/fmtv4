import { useState, useEffect } from "react";
import { Post } from "@/lib/gql-queries/get-filtered-category";

interface SharedData {
  specialFeaturesPosts: Post[];
  galleryPosts: Post[];
}

export const useSideBarCarouselData = () => {
  const [sharedData, setSharedData] = useState<SharedData>({
    specialFeaturesPosts: [],
    galleryPosts: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSharedData = async () => {
      try {
        const res = await fetch("/api/gallery-features-content");
        if (!res.ok) throw new Error("Failed to fetch shared data");

        const data = await res.json();
        setSharedData({
          specialFeaturesPosts: data.specialFeaturesPosts.edges.map(
            (edge: any) => edge.node
          ),
          galleryPosts: data.galleryPosts.edges.map((edge: any) => edge.node),
        });
        setIsLoading(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
        setIsLoading(false);
      }
    };

    fetchSharedData();
  }, []);

  return {
    ...sharedData,
    isLoading,
    error,
  };
};
