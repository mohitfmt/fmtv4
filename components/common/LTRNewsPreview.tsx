import Link from "next/link";
import CoverImage from "./CoverImage";
import { getPreferredCategory } from "@/lib/utils";
import PublishingDateTime from "./display-date-formats/PublishingDateTime";

const LTRNewsPreview = ({
  title,
  excerpt,
  featuredImage,
  date,
  slug,
  categories,
  uri,
}: any) => {
  const tooltipExcerpt = excerpt.replace(/<[^>]*>?/gm, "");
  const preferredCategory = getPreferredCategory(categories.edges);
  return (
    <article className="mb-4 px-1 rounded border-b border-stone-200 dark:border-stone-600 hover:shadow-xl dark:hover:shadow-stone-600 dark:hover:shadow-md transition-shadow">
      <div className="flex">
        <figure className="w-2/5 mr-2 mt-1 rounded-lg overflow-hidden transition-transform transform hover:scale-105">
          {featuredImage && (
            <CoverImage
              title={title}
              coverImage={featuredImage}
              slug={slug}
              url={uri}
            />
          )}
        </figure>
        <div className="flex-1">
          <h4 className="text-xs text-accent-red flex gap-2 items-center justify-between">
            {preferredCategory && (
              <span
                key={preferredCategory?.node?.id}
                className="tracking-wide font-robotoSlab"
              >
                {preferredCategory?.node?.name.toUpperCase()}
              </span>
            )}
            <span className="text-sm font-bitter font-semibold text-stone-700 dark:text-stone-300 tracking-wider">
              <PublishingDateTime dateString={date} size={16} />
            </span>
          </h4>
          <Link href={uri} title={title}>
            <h3 className="font-bitter font-semibold leading-snug transition-colors hover:text-blue-400">
              {title}
            </h3>
          </Link>
        </div>
      </div>

      <div className="flex justify-between items-center mt-1 mb-3">
        <footer
          className="text-gray-600 dark:text-stone-200 transition-all duration-150 hover:text-gray-900 leading-tight line-clamp-2"
          title={tooltipExcerpt}
          dangerouslySetInnerHTML={{ __html: excerpt }}
          style={{ flexShrink: 1 }}
        />
      </div>
    </article>
  );
};

export default LTRNewsPreview;
