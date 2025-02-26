import { useState, useEffect } from "react";

export const useSectionData = (
  initialPosts: any[] = [],
  category: string,
  limit: number = 5
) => {
  const [posts, setPosts] = useState(initialPosts);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    // Only fetch if initialPosts is empty
    const shouldFetch = !initialPosts?.length;
    if (!shouldFetch) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Correctly construct the query string
        const queryParams = new URLSearchParams({
          category,
          limit: limit.toString(),
        });

        const response = await fetch(`/api/fetch-section-data?${queryParams}`);
        const data = await response.json();

        if (data?.length) {
          setPosts(data);
        } else if (attempts < 3) {
          // Limit retry attempts
          setAttempts((prev) => prev + 1);
          await fetchData();
        }
      } catch (error) {
        console.error(`Error fetching ${category}:`, error);

        if (attempts < 3) {
          // Limit retry attempts
          setAttempts((prev) => prev + 1);
          await fetchData();
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [category, initialPosts?.length, limit, attempts]);

  return {
    posts: initialPosts?.length ? initialPosts : posts,
    loading: !initialPosts?.length && loading,
    attempts,
  };
};
