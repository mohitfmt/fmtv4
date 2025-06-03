// hooks/useSideBarCarouselData.ts
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

        // Safely extract posts with multiple levels of fallback
        const extractPosts = (dataPath: any): Post[] => {
          // Check if we have the expected structure
          if (dataPath?.edges && Array.isArray(dataPath.edges)) {
            return dataPath.edges
              .filter((edge: any) => edge?.node) // Filter out any null/undefined edges
              .map((edge: any) => edge.node);
          }

          // If it's already an array of posts, return it
          if (Array.isArray(dataPath)) {
            return dataPath;
          }

          // Otherwise return empty array
          console.warn("[SidebarHook] Unexpected data structure:", dataPath);
          return [];
        };

        setSharedData({
          specialFeaturesPosts: extractPosts(data?.specialFeaturesPosts),
          galleryPosts: extractPosts(data?.galleryPosts),
        });

        setIsLoading(false);
      } catch (err) {
        console.error("[SidebarHook] Error fetching data:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
        // Still set empty arrays so components don't break
        setSharedData({
          specialFeaturesPosts: [],
          galleryPosts: [],
        });
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
