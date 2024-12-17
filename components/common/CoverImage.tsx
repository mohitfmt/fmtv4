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
  index?: number;
}

interface Dimensions {
  width: number;
  height: number;
  containerClass: string;
}

const getDimensions = (index: number, isMobile: boolean): Dimensions => {
  // Hero image (index 0)
  if (index === 0) {
    return {
      width: isMobile ? 640 : 940,
      height: isMobile ? 400 : 588,
      containerClass: "w-full",
    };
  }

  // Secondary images
  if (isMobile) {
    return {
      width: 150,
      height: 94,
      containerClass: "w-[150px]",
    };
  }

  return {
    width: 300,
    height: 188,
    containerClass: "w-[300px]",
  };
};

export default function CoverImage({
  title,
  coverImage,
  // slug,
  url,
  isPriority = false,
  className = "",
  index = 0,
}: CoverImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 640);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const imageSource =
    coverImage?.node?.sourceUrl || coverImage?.node?.mediaItemUrl;
  if (!imageSource) return null;

  const isHero = index === 0;
  const shouldPrioritize = isPriority || isHero;
  const dimensions = getDimensions(index, isMobile);

  const image = (
    <div
      ref={ref}
      className={`relative ${dimensions.containerClass} ${className}`}
      style={{
        aspectRatio: `${dimensions.width}/${dimensions.height}`,
      }}
    >
      <Image
        src={imageSource}
        alt={`Cover Image for ${title}`}
        fill
        sizes={
          isHero
            ? "(max-width: 640px) 100vw, 940px"
            : "(max-width: 640px) 150px, 300px"
        }
        className="rounded-lg object-cover"
        priority={shouldPrioritize}
        quality={isHero ? 85 : 75}
      />
    </div>
  );

  if (!url) return image;

  return (
    <Link href={url} aria-label={title} className="block">
      {image}
    </Link>
  );
}
