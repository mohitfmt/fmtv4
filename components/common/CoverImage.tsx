import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
  index?: number; // Add index to track image position
}

// SVG blur placeholder
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

const useIsAboveTheFold = (
  ref: React.RefObject<HTMLElement>,
  index: number = 0
) => {
  const [isAboveTheFold, setIsAboveTheFold] = useState(false);

  useEffect(() => {
    const calculatePosition = () => {
      if (!ref.current) return;

      const viewportHeight = window.innerHeight;
      const isMobile = window.innerWidth <= 768;

      // On mobile, only the first image is above the fold
      if (isMobile) {
        setIsAboveTheFold(index === 0);
        return;
      }

      // On desktop, first 8 images are considered above the fold
      setIsAboveTheFold(index < 8);
    };

    calculatePosition();

    // Recalculate on resize
    window.addEventListener("resize", calculatePosition);
    return () => window.removeEventListener("resize", calculatePosition);
  }, [ref, index]);

  return isAboveTheFold;
};

const getImageSizes = (index: number = 0) => {
  // Optimize sizes based on image position and viewport
  if (index === 0) {
    return "(max-width: 768px) 100vw, 940px";
  }
  return "(max-width: 768px) 200px, (max-width: 1200px) 300px, 940px";
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
  const isAboveTheFold = useIsAboveTheFold(ref, index);

  const imageSource =
    coverImage?.node?.sourceUrl || coverImage?.node?.mediaItemUrl;
  if (!imageSource) return null;

  const shouldPrioritize = isPriority || isAboveTheFold;

  const image = (
    <div ref={ref} className={`relative aspect-[16/10] ${className}`}>
      <Image
        src={imageSource}
        alt={`Cover Image for ${title}`}
        fill={true}
        style={{ objectFit: "cover" }}
        className="rounded-lg transition-opacity duration-300"
        sizes={getImageSizes(index)}
        quality={shouldPrioritize ? 85 : 75}
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        priority={shouldPrioritize}
        loading={shouldPrioritize ? "eager" : "lazy"}
      />
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
