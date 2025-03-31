import React, { useState, useEffect, useRef } from "react";
import { YouTubeEmbed } from "@next/third-parties/google";

interface YouTubeEmbedProps {
  videoId: string;
  title?: string;
}

const YouTubeEmbedTag: React.FC<YouTubeEmbedProps> = ({ videoId, title }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    
    // Error handling using window event listener
    const handleError = (event: ErrorEvent) => {
      // Only handle errors from our container or its children
      if (containerRef.current && containerRef.current.contains(event.target as Node)) {
        console.error("YouTube embed error:", event);
        setHasError(true);
      }
    };
    
    window.addEventListener('error', handleError);
    
    return () => {
      setIsMounted(false);
      window.removeEventListener('error', handleError);
    };
  }, []);

  if (!isMounted) {
    // Return a placeholder while client-side rendering is in progress
    return (
      <div
        className="w-full bg-gray-200 rounded-lg"
        style={{ paddingTop: "56.25%" /* 16:9 aspect ratio */ }}
        aria-label="Loading video player..."
      ></div>
    );
  }

  if (hasError) {
    // Fallback to a standard iframe if the YouTube embed component fails
    return (
      <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
        <iframe
          className="absolute top-0 left-0 w-full h-full rounded-lg"
          src={`https://www.youtube.com/embed/${videoId}?controls=1&showinfo=1&rel=0&enablejsapi=0&origin=${encodeURIComponent(window.location.origin)}`}
          title={title || "YouTube video"}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        ></iframe>
      </div>
    );
  }

  try {
    return (
      <div className="youtube-embed-container" ref={containerRef}>
        <YouTubeEmbed
          params="controls=1&showinfo=1&enablejsapi=0"
          style="max-width: 100vw; rounded: 50px;"
          videoid={videoId}
        />
      </div>
    );
  } catch (error) {
    console.error("Error rendering YouTube component:", error);
    setHasError(true);
    // Return null and let React re-render with hasError=true
    return null;
  }
};

export default YouTubeEmbedTag;