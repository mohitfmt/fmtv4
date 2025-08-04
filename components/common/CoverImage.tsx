// components/common/CoverImage.tsx
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
  imageClassName?: string;
  isBig?: boolean;
  aspectRatio?: "1:1" | "4:3" | "16:9" | "16:10" | "auto";
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
}

export default function CoverImage({
  title,
  coverImage,
  url,
  isPriority = false,
  className = "",
  imageClassName = "",
  isBig = false,
  aspectRatio = "16:10",
  objectFit = "cover",
}: CoverImageProps) {
  const imageSource =
    coverImage?.node?.sourceUrl || coverImage?.node?.mediaItemUrl;

  if (!imageSource) {
    // Fallback image
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-lg bg-gray-200",
          className
        )}
        style={{
          aspectRatio:
            aspectRatio === "auto" ? undefined : aspectRatio.replace(":", "/"),
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-gray-400">No image available</span>
        </div>
      </div>
    );
  }

  const image = (
    <div
      className={cn("relative overflow-hidden rounded-lg", className)}
      style={{
        aspectRatio:
          aspectRatio === "auto" ? undefined : aspectRatio.replace(":", "/"),
      }}
    >
      <Image
        src={imageSource}
        alt={title || "Article image"}
        fill
        sizes={
          isPriority || isBig
            ? "(max-width: 640px) 100vw, (max-width: 1024px) 75vw, (max-width: 1600px) 50vw, 800px"
            : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1600px) 33vw, 400px"
        }
        className={cn(
          objectFit === "cover" ? "object-cover" : `object-${objectFit}`,
          imageClassName
        )}
        priority={isPriority}
        quality={isPriority || isBig ? 85 : 75}
        loading={isPriority ? "eager" : "lazy"}
        placeholder="blur"
        blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAQCAMAAABA3o1rAAAAAXNSR0IB2cksfwAAAAlwSFlzAAAh1QAAIdUBBJy0nQAAAEtQTFRFAAAA8ak7HVqqqC0jHVqq/fz6qCwivVQ499Sn15+bqCwiVXus8KY5qCwiwYlbw9PoMWKgobrc8qk68qk6HVqq+eXN9bxn8KY6qCwiCqtsPAAAABl0Uk5TAP7+/h//Pv7//9L+tnf9/1L/Kgqs//9nD7y8RTsAAADASURBVHicjVHtDoMgEONDREQnooDv/6TrHTjnfizWkFzS2itFiEc4+v7gIZa48dCF0H3oftTAfIgySWDaRLcrYG+SWVeMTBOCagjfvLYnL1+nQJEH/K0DNJiBTpbS+xXw2IIA9K9x7gWDbBLOQBbrYkgAi7kJLAtMTiSQSi1L21EFaWgOBuNdUFdYzpgNvsQrLgGF1I5u0UJmCqmU91yFqCn/XvMqqjR+uhfVqh5RdeQuy2/V9FgAD1s8Hwt49tBv+I0JpUT5PH8AAAAASUVORK5CYII="
      />
    </div>
  );

  if (!url) return image;

  return (
    <Link
      href={url}
      aria-label={`Read more: ${title}`}
      className="block hover:opacity-90 transition-opacity"
      prefetch={true}
    >
      {image}
    </Link>
  );
}
