import { getPreferredCategory } from "@/lib/utils";
import CoverImage from "../CoverImage";
import Link from "next/link";
import PublishingDateTime from "../display-date-formats/PublishingDateTime";

const TTBNewsPreview = ({
  title,
  featuredImage,
  date,
  slug,
  excerpt,
  categories,
  uri,
  isBig,
}: any) => {
  const updatedExcerpt = excerpt?.replace(/<[^>]*>?/gm, "");
  const preferredCategory = getPreferredCategory(categories?.edges);
  return (
    <article className="flex flex-col border-b transition-shadow border-stone-200 dark:border-stone-600 px-2 hover:shadow-xl dark:hover:shadow-stone-600 dark:hover:shadow-md">
      <figure className="relative">
        {featuredImage && (
          <CoverImage
            title={title}
            coverImage={featuredImage}
            slug={slug}
            url={uri}
            isBig={isBig}
          />
        )}
      </figure>

      <Link href={uri} title={updatedExcerpt} className="my-2">
        <h2 className="text-xs text-accent-category flex gap-2 items-center justify-between">
          {preferredCategory && (
            <span key={preferredCategory?.node?.id} className="tracking-wider">
              {preferredCategory?.node?.name.toUpperCase()}
            </span>
          )}
          <span className="text-sm font-bitter font-semibold text-stone-700 dark:text-stone-300 tracking-wider">
            <PublishingDateTime dateString={date} size={16} />
          </span>
        </h2>
        <h1 className="text-lg font-bitter font-semibold leading-snug transition-colors hover:text-blue-700 dark:hover:text-cyan-300">
          {title}
        </h1>
      </Link>
    </article>
  );
};

export default TTBNewsPreview;
