import { useEffect, useState } from "react";
import { PostCardProps } from "@/types/global";
import SearchLoadingSkeleton from "../skeletons/SearchSkeleton";
import LargeImageNewsPreview from "./SearchCard";
import LoadMoreButton from "../common/LoadMoreButton";

interface SearchWithLoadMoreProps {
  term?: string | string[];
  category?: string | string[];
}

const SearchWithLoadMore = ({ term, category }: SearchWithLoadMoreProps) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async (pageNum: number) => {
    if (!term) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        term: term as string,
        page: pageNum.toString(),
        ...(category && category !== "all"
          ? { category: category as string }
          : {}),
      });

      const response = await fetch(`/api/search?${queryParams}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch posts");
      }

      if (!data?.posts?.edges) {
        setError("Invalid response from server");
        return;
      }

      const newPosts = data.posts.edges;

      if (pageNum === 0) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }

      setHasMore(newPosts.length === 10);
    } catch (error) {
      console.error("[Search] Error fetching posts:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred while fetching posts"
      );
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  useEffect(() => {
    setInitialLoad(true);
    setPage(0);
    fetchPosts(0);
  }, [term, category]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage);
  };

  // Show skeletons during initial load
  if (initialLoad || (loading && page === 0)) {
    return (
      <section className="mt-4 flex flex-col gap-4">
        {[...Array(10)].map((_, index) => (
          <SearchLoadingSkeleton key={`skeleton-${index}`} />
        ))}
      </section>
    );
  }

  // Show no results state
  if (!loading && !error && posts.length === 0) {
    return (
      <div className="mt-8 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          No results found
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          We couldn&apos;t find any posts matching your search{" "}
          {category && category !== "all" && "in this category"}
        </p>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Try adjusting your search or category to find what you&apos;re looking
          for
        </p>
      </div>
    );
  }

  return (
    <>
      <section className="mt-4 flex flex-col gap-4">
        {/* Display posts */}
        {posts.map(({ node }: { node: PostCardProps }) => (
          <div
            key={node?.id}
            className="relative grid w-full items-center gap-4"
          >
            <LargeImageNewsPreview {...node} key={node.id} />
          </div>
        ))}

        {/* Show loading skeletons for "load more" */}
        {loading &&
          page > 0 &&
          [...Array(3)].map((_, index) => (
            <SearchLoadingSkeleton key={`skeleton-more-${index}`} />
          ))}

        {/* Show error state */}
        {error && <div className="text-center text-red-500 py-4">{error}</div>}
      </section>

      {/* Only show "View More" when there's more content and not loading */}
      {hasMore && !loading && !initialLoad && posts.length > 0 && (
        <div className="flex justify-center mt-8">
          <LoadMoreButton
            text="View More"
            isLoading={loading}
            onClick={loadMore}
          />
        </div>
      )}
    </>
  );
};

export default SearchWithLoadMore;
