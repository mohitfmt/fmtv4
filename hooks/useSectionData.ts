import { useState, useEffect, useRef } from "react";

export const useSectionData = (
  initialPosts: any[] = [],
  category: string,
  limit: number = 5
) => {
  const [posts, setPosts] = useState(initialPosts);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const fetchInProgressRef = useRef(false);

  useEffect(() => {
    const shouldFetch =
      !initialPosts?.length && attempts < 3 && !fetchInProgressRef.current;
    if (!shouldFetch) return;

    const fetchData = async () => {
      fetchInProgressRef.current = true;
      setLoading(true);

      try {
        const queryParams = new URLSearchParams({
          category,
          limit: limit.toString(),
        });
        const response = await fetch(`/api/fetch-section-data?${queryParams}`);
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          setPosts(data);
        } else {
          // Retry after delay
          setTimeout(() => setAttempts((prev) => prev + 1), 1000);
        }
      } catch (error) {
        console.error(`Error fetching ${category}:`, error);
        setTimeout(() => setAttempts((prev) => prev + 1), 1000);
      } finally {
        setLoading(false);
        fetchInProgressRef.current = false;
      }
    };

    fetchData();
  }, [initialPosts?.length, attempts, category, limit]);

  return {
    posts: initialPosts.length ? initialPosts : posts,
    loading: !initialPosts?.length && loading,
    attempts,
  };
};
