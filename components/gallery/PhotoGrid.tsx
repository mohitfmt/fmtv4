import AdSlot from "../common/AdSlot";
import { useState, useEffect } from "react";
import LoadMoreButton from "../common/LoadMoreButton";
import { AdsTargetingParams, PostCardProps } from "@/types/global";
import PhotoCard from "./PhotoCard";

interface Posts {
  edges: Array<{
    node: PostCardProps;
  }>;
}

interface Props {
  initialPosts: Posts;
  adsTargetingParams?: AdsTargetingParams;
}

const PhotoGrid = ({ initialPosts, adsTargetingParams }: Props) => {
  const [posts, setPosts] = useState(initialPosts.edges);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(initialPosts.edges.length);

  // Reset state when posts change
  useEffect(() => {
    setPosts(initialPosts.edges);
    setCurrentOffset(initialPosts.edges.length);
    setHasMore(true);
    setIsLoading(false);
  }, [initialPosts.edges]);

  const loadMorePhotos = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/more-photos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categorySlug: "photos",
          offset: currentOffset,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch more photos");
      }

      const data = await response.json();
      if (data.posts?.edges?.length > 0) {
        setPosts((prevPosts) => [...prevPosts, ...data.posts.edges]);
        setCurrentOffset((prev) => prev + data.posts.edges.length);
        setHasMore(data.posts.edges.length === 12);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more photos:", error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <div className="ads-small-mobile">
        <AdSlot
          sizes={[
            [320, 50],
            [320, 100],
          ]}
          id="div-gpt-ad-1661362470988-0"
          name="ROS_Mobile_Leaderboard"
          visibleOnDevices="onlyMobile"
        />
      </div>

      <h1 className="my-4 text-center text-4xl font-extrabold">Photos</h1>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post, index) => {
          const { node } = post;
          return (
            <div key={node.id}>
              {index === 3 && (
                <div className="ads-medium-mobile">
                  <AdSlot
                    id="div-gpt-ad-1661333336129-0"
                    name="ROS_Midrec"
                    sizes={[300, 250]}
                    visibleOnDevices="onlyMobile"
                  />
                </div>
              )}
              <PhotoCard node={node} />
            </div>
          );
        })}
      </section>

      {hasMore && (
        <div className="flex justify-center mt-8">
          <LoadMoreButton
            text="View More Photos"
            isLoading={isLoading}
            onClick={loadMorePhotos}
          />
        </div>
      )}

      <div className="ads-medium-mobile">
        <AdSlot
          id="div-gpt-ad-1661355704641-0"
          name="ROS_Midrec_b"
          sizes={[300, 250]}
          visibleOnDevices="onlyMobile"
          targetingParams={adsTargetingParams}
        />
      </div>
    </div>
  );
};

export default PhotoGrid;
