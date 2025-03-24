import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import AdSlot from "../common/AdSlot";
import VideoCard from "./VideoCard";
import VideoSkeleton from "../skeletons/VideoCardSkeleton";

interface PlaylistProps {
  playlistId: string;
}

interface Video {
  node: {
    id: string;
    title: string;
    uri: string;
    excerpt: string;
    dateGmt: string;
    featuredImage: {
      node: {
        mediaItemUrl: string;
      };
    };
    statistics: {
      viewCount: number;
      likeCount: number;
      commentCount: number;
    };
  };
}

const LoadingState = () => (
  <div className="grid grid-cols-1 gap-6 py-4 md:grid-cols-2 lg:grid-cols-3">
    {[...Array(6)].map((_, index) => (
      <VideoSkeleton key={index} />
    ))}
  </div>
);

const Playlist = ({ playlistId }: PlaylistProps) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaylist = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/get-yt-playlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ playlistId }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch playlist");
      }

      const data = await res.json();
      setVideos(data);
    } catch (error) {
      console.error("Error fetching playlist:", error);
      setError("Failed to load videos. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [playlistId]);

  useEffect(() => {
    if (playlistId) {
      fetchPlaylist();
    }
  }, [playlistId, fetchPlaylist]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchPlaylist} variant="outline" size="sm">
          Try Again
        </Button>
      </div>
    );
  }

  if (!videos.length) {
    return (
      <div className="text-center py-8">
        <p>No videos available</p>
      </div>
    );
  }

  return (
    <section aria-label="Video playlist">
      <div className="grid grid-cols-1 gap-6 py-4 md:grid-cols-2 lg:grid-cols-3">
        {videos.map(({ node }, index) => (
          <div key={node.id || index}>
            {index === 3 && (
              <div className="ads-medium-mobile my-6">
                <AdSlot
                  id="div-gpt-ad-1661333336129-0"
                  name="ROS_Midrec"
                  sizes={[300, 250]}
                  visibleOnDevices="onlyMobile"
                />
              </div>
            )}
            <VideoCard node={node} />
          </div>
        ))}
      </div>

      <div className="flex justify-center py-4">
        <Link
          href={`https://www.youtube.com/playlist?list=${playlistId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block"
          aria-label="View more videos on YouTube"
        >
          <Button className="rounded-full" size="lg" variant="outline">
            View More
          </Button>
        </Link>
      </div>
    </section>
  );
};

export default Playlist;
