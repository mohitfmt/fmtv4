import { useState, useEffect } from "react";
import { PostCardProps } from "@/types/global";
import TTBNewsPreview from "../common/news-preview-cards/TTBNewsPreview";
import LoadMoreButton from "@/components/common/LoadMoreButton";

interface Posts {
  edges: Array<{
    node: PostCardProps;
  }>;
}

interface AuthorPostsWithLoadMoreProps {
  authorId: string;
  initialPosts: Posts;
  startingOffset: number;
  bigImage: boolean;
}

const AuthorPostsWithLoadMore = ({
  authorId,
  initialPosts,
  startingOffset,
  bigImage,
}: AuthorPostsWithLoadMoreProps) => {
  const [posts, setPosts] = useState(initialPosts.edges);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(
    startingOffset + initialPosts.edges.length
  );

  // Reset state when author changes
  useEffect(() => {
    setPosts(initialPosts.edges);
    setCurrentOffset(startingOffset + initialPosts.edges.length);
    setHasMore(initialPosts.edges.length === 20);
    setIsLoading(false);
  }, [authorId, initialPosts.edges, startingOffset]);

  const loadMorePosts = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/more-author-posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          authorId,
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
      <div className="grid grid-cols-2 gap-4">
        {posts.map(({ node }) => (
          <TTBNewsPreview
            isBig={bigImage}
            {...node}
            key={`${authorId}-${node.id}`}
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

export default AuthorPostsWithLoadMore;
