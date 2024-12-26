import Link from "next/link";
import { cn, getPreferredCategory } from "@/lib/utils";
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
  imageWrapperClass,
  className,
  eagerLoadImage,
}: CategoryHeroPostProps) => {
  const parsedExcerpt = post?.excerpt?.replace(/<[^>]*>?/gm, "");
  const preferredCategory = getPreferredCategory(post?.categories?.edges);

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row items-center gap-2 md:gap-8",
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
          />
        )}
      </figure>

      {/* Right side - Content */}
      <div className="flex-1 py-2">
        <div className="text-xs font-bitter mb-2 text-accent-red flex gap-2 items-center justify-between">
          {preferredCategory && (
            <span key={preferredCategory?.node?.id} className="tracking-wider">
              {preferredCategory?.node?.name.toUpperCase()}
            </span>
          )}
          <span className="text-sm font-bitter font-semibold text-stone-700 dark:text-stone-300 tracking-wider">
            <PublishingDateTime dateString={post?.date} size={16} />
          </span>
        </div>
        <Link href={post?.uri} prefetch={false}>
          <h1 className="text-3xl font-heading font-extrabold leading-tight hover:text-blue-600">
            {post?.title}
          </h1>
        </Link>

        <summary className="list-none font-bitter mt-2 font-heading text-foreground">
          {parsedExcerpt}
        </summary>
      </div>
    </div>
  );
};

export default CategoryHeroPost;
