import Link from "next/link";
import { cn, getPreferredCategory, stripHTML } from "@/lib/utils";
import { PostCardProps } from "@/types/global";
import CoverImage from "../CoverImage";
import PublishingDateTime from "../display-date-formats/PublishingDateTime";

type CategoryHeroPostProps = {
  post: PostCardProps;
  imageWrapperClass?: string;
  className?: string;
  eagerLoadImage?: boolean;
};

const CategoryHeroPost = ({
  post,
  className,
  eagerLoadImage,
}: CategoryHeroPostProps) => {
  const parsedExcerpt = stripHTML(post?.excerpt || "");

  const preferredCategory = getPreferredCategory(post?.categories?.edges);

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row items-stretch md:gap-8",
        className
      )}
    >
      {/* Left side - Image */}
      <figure className="w-full md:w-1/2">
        {post.featuredImage && (
          <CoverImage
            title={post.title}
            coverImage={post.featuredImage}
            slug={post.slug}
            url={post.uri}
            isPriority={eagerLoadImage}
            className="relative"
          />
        )}
      </figure>

      {/* Right side - Content */}
      <div className="flex-1 py-0.5 flex flex-col">
        {/* Top - Category and Date */}
        <div className="text-xs text-accent-category font-bitter flex gap-2 items-center justify-between">
          {preferredCategory && (
            <span key={preferredCategory?.node?.id} className="tracking-wider">
              {preferredCategory?.node?.name.toUpperCase()}
            </span>
          )}
          <div className="text-sm font-bitter font-semibold text-stone-700 dark:text-stone-300 tracking-wider">
            <PublishingDateTime dateString={post?.date} size={16} />
          </div>
        </div>

        {/* Middle - Title */}
        <Link href={post?.uri} className="my-auto" title={post?.title}>
          <h1 className="text-4xl font-bitter font-black leading-tight hover:text-blue-700 dark:hover:text-cyan-300">
            {post?.title}
          </h1>
        </Link>

        {/* Bottom - Excerpt */}
        <summary
          className="list-none font-bitter text-foreground mt-auto italic"
          title={parsedExcerpt}
        >
          <h2>{parsedExcerpt}</h2>
        </summary>
      </div>
    </div>
  );
};

export default CategoryHeroPost;
