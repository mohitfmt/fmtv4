import { getPreferredCategory, stripHTML } from "@/lib/utils";
import CoverImage from "../CoverImage";
import Link from "next/link";
import PublishingDateTime from "../display-date-formats/PublishingDateTime";
import { LogoSVG } from "@/components/ui/icons/LogoSVG";

const TTBNewsPreview = ({
  title,
  featuredImage,
  date,
  slug,
  excerpt,
  categories,
  uri,
  isBig = false,
  isSpecialPage = false,
}: any) => {
  const updatedExcerpt = stripHTML(excerpt || "");
  const preferredCategory = getPreferredCategory(categories?.edges);

  return (
    <article className="flex px-1 flex-col border-b transition-shadow border-stone-200 dark:border-stone-600 hover:shadow-xl dark:hover:shadow-stone-600 dark:hover:shadow-md">
      <figure className="relative">
        {featuredImage ? (
          <CoverImage
            title={title}
            coverImage={featuredImage}
            slug={slug}
            url={uri}
            isBig={isBig}
          />
        ) : (
          <Link href={uri}>
            <div className="relative aspect-video w-full bg-white flex items-center justify-center p-8">
              <LogoSVG className="w-full h-full object-contain max-h-full" />
              <div className="absolute inset-0 bg-black/5" />
            </div>
          </Link>
        )}
      </figure>

      <Link
        href={uri}
        title={updatedExcerpt}
        className="my-2 text-sm font-bitter"
      >
        <div className="text-accent-category flex gap-2 items-center justify-between">
          {preferredCategory && (
            <span key={preferredCategory?.node?.id} className="tracking-wider">
              {preferredCategory?.node?.name.toUpperCase()}
            </span>
          )}
          <div className="font-bitter font-semibold text-stone-700 dark:text-stone-300 tracking-wider">
            <PublishingDateTime dateString={date} />
          </div>
        </div>

        {isSpecialPage ? (
          <h2 className="text-lg font-bitter font-semibold leading-snug transition-colors hover:text-blue-700 dark:hover:text-cyan-300">
            {title}
          </h2>
        ) : (
          <h3 className="text-lg font-bitter font-semibold leading-snug transition-colors hover:text-blue-700 dark:hover:text-cyan-300">
            {title}
          </h3>
        )}
      </Link>
    </article>
  );
};

export default TTBNewsPreview;
