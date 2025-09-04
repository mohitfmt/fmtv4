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
