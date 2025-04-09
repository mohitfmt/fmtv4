import { useState, useEffect } from "react";
import { PostCardProps } from "@/types/global";
import TTBNewsPreview from "../../common/news-preview-cards/TTBNewsPreview";
import LoadMoreButton from "@/components/common/LoadMoreButton";

interface Posts {
  edges: Array<{
    node: PostCardProps;
  }>;
}

interface Props {
  initialPosts: Posts;
  categorySlug: string;
  startingOffset: number;
  bigImage?: boolean;
}

const SubCategoryOtherPosts = ({
  initialPosts,
  categorySlug,
  startingOffset,
  bigImage = false,
}: Props) => {
  const [posts, setPosts] = useState(initialPosts.edges);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(
    startingOffset + initialPosts.edges.length
  );

  // Reset state when category changes
  useEffect(() => {
    setPosts(initialPosts.edges);
    setCurrentOffset(startingOffset + initialPosts.edges.length);
    setHasMore(true);
    setIsLoading(false);
  }, [categorySlug, initialPosts.edges, startingOffset]);

  const loadMorePosts = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/more-vertical-posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categorySlug,
          offset: currentOffset,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }

      const data = await response.json();
      if (data.posts?.edges?.length > 0) {
        setPosts((prevPosts) => [...prevPosts, ...data.posts.edges]);
        setCurrentOffset((prev) => prev + data.posts.edges.length);
        setHasMore(data.posts.edges.length === 20);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more posts:", error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (!posts.length) return null;

  return (
    <div className="mt-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-2">
        {posts.map(({ node }) => (
          <TTBNewsPreview
            {...node}
            key={`${categorySlug}-${node.id}`}
            isBig={bigImage}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-8">
          <LoadMoreButton
            text="View More"
            isLoading={isLoading}
            onClick={loadMorePosts}
          />
        </div>
      )}
    </div>
  );
};

export default SubCategoryOtherPosts;
