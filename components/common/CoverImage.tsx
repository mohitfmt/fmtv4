import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";

interface CoverImageData {
  node: {
    sourceUrl: string;
    mediaItemUrl: string;
  };
}

interface CoverImageProps {
  title: string;
  coverImage: CoverImageData;
  slug?: string;
  url: string;
  isPriority?: boolean;
  className?: string;
  index?: number;
}

const BLUR_DATA_URL =
  "data:image/svg+xml;base64," +
  btoa(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1218 512">
    <circle cx="256" cy="256" r="240" fill="#a92c23"/>
    <circle cx="962" cy="256" r="240" fill="#1d5aaa"/>
    <circle cx="609" cy="256" r="240" fill="#f2a838"/>
    <path d="M182 354V158h148v44H234v40h86v44H234v68zm316 0V158h44l67 110 67-110h44V354H668V258l-47 74h-24l-47-74v96zm378-196h172v44H988v152H936V202H876z" fill="#fff"/>
  </svg>
  `);

const getOptimizedSizes = (index: number = 0) => {
  if (index === 0) {
    return "(max-width: 640px) 100vw, (max-width: 750px) 75vw, 940px";
  }
  return "(max-width: 640px) 150px, (max-width: 750px) 200px, 300px";
};

const getImageQuality = (isPriority: boolean, viewport: string) => {
  if (isPriority) return 85;
  if (viewport === "mobile") return 65;
  return 75;
};

const useImageErrorHandling = () => {
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const maxRetries = 3;
  const retryDelay = 2000;

  const handleRetry = useCallback(() => {
    if (retryCount < maxRetries) {
      setTimeout(
        () => {
          setLoadError(false);
          setRetryCount((prev) => prev + 1);
          setLoading(true);
        },
        retryDelay * (retryCount + 1)
      );
    }
  }, [retryCount]);

  useEffect(() => {
    if (loadError) {
      handleRetry();
    }
  }, [loadError, handleRetry]);

  return {
    loadError,
    setLoadError,
    loading,
    setLoading,
    retryCount,
  };
};

export default function CoverImage({
  title,
  coverImage,
  slug,
  url,
  isPriority = false,
  className = "",
  index = 0,
}: CoverImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState("desktop");

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width <= 640) setViewport("mobile");
      else if (width <= 1024) setViewport("tablet");
      else setViewport("desktop");
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isAboveTheFold = index < (viewport === "mobile" ? 1 : 4);
  const shouldPrioritize = isPriority || isAboveTheFold;
  const imageSource =
    coverImage?.node?.sourceUrl || coverImage?.node?.mediaItemUrl;

  const { loadError, setLoadError, loading, setLoading, retryCount } =
    useImageErrorHandling();

  if (!imageSource) return null;

  const handleImageError = () => {
    setLoadError(true);
    setLoading(false);
  };

  const image = (
    <div ref={ref} className={`relative aspect-[16/10] ${className}`}>
      {loading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg" />
      )}

      <Image
        src={imageSource}
        alt={`Cover Image for ${title}`}
        fill={true}
        style={{
          objectFit: "cover",
          opacity: loading ? 0 : 1,
        }}
        className="rounded-lg transition-opacity duration-300"
        sizes={getOptimizedSizes(index)}
        quality={getImageQuality(shouldPrioritize, viewport)}
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        priority={shouldPrioritize}
        loading={shouldPrioritize ? "eager" : "lazy"}
        onError={handleImageError}
        onLoad={() => setLoading(false)}
      />

      {loadError && retryCount >= 3 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-sm text-gray-500">
            Image unavailable {slug && `for ${slug}`}
          </div>
        </div>
      )}
    </div>
  );

  if (!url) return image;

  return (
    <div className="sm:mx-0">
      <Link href={url} aria-label={title}>
        {image}
      </Link>
    </div>
  );
}
