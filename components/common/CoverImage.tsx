import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
// import useIntersectionObserver from "../lib/hooks/use-intersection-observer";
import { ImageBlurDataURL } from "@/constants/image-blurdata-url";

interface Props {
  title: string;
  coverImage: {
    node: {
      sourceUrl: string;
      mediaItemUrl: string;
    };
  };
  slug?: string;
  url: string;
  isPriority?: boolean;
}

export default function CoverImage({
  title,
  coverImage,
  slug,
  url,
  isPriority = false,
}: Props) {
  const ref = useRef(null);
  const isInView = true; // useIntersectionObserver(ref);
  const blurDataURL = ImageBlurDataURL;

  const image = (
    <div ref={ref} className="relative aspect-[16/10]">
      {(isInView || isPriority) && (
        <Image
          fill
          style={{ objectFit: "cover" }}
          alt={`Cover Image for ${title}`}
          src={coverImage?.node?.sourceUrl ?? coverImage?.node?.mediaItemUrl}
          className="rounded-lg"
          sizes="(max-width: 768px) 200px, 940px"
          quality={85}
          placeholder="blur"
          blurDataURL={blurDataURL}
          priority={isPriority}
          loading={isPriority ? "eager" : "lazy"}
        />
      )}
    </div>
  );

  return (
    <div className="sm:mx-0">
      {url ? (
        <Link href={url} aria-label={title}>
          {image}
        </Link>
      ) : (
        image
      )}
    </div>
  );
}
