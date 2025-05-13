import Link from "next/link";
import CoverImage from "../CoverImage";
import { getPreferredCategory } from "@/lib/utils";
import PublishingDateTime from "../display-date-formats/PublishingDateTime";

const LTRNewsPreview = ({
  title,
  excerpt,
  featuredImage,
  date,
  slug,
  categories,
  uri,
}: any) => {
  const plainTextExcerpt = excerpt?.replace(/<[^>]+>/g, "") || "";

  const preferredCategory = getPreferredCategory(categories.edges);
  return (
    <article className="mb-4 px-1 rounded border-b border-stone-200 dark:border-stone-600 hover:shadow-xl dark:hover:shadow-stone-600 dark:hover:shadow-md transition-shadow">
      <div className="flex">
        <figure className="w-2/5 mr-2 my-1 rounded-lg overflow-hidden transition-transform transform hover:scale-105">
          {featuredImage && (
            <CoverImage
              title={title}
              coverImage={featuredImage}
              slug={slug}
              url={uri}
              className="relative"
            />
          )}
        </figure>
        <div className="flex-1 font-bitter">
          <div className="text-sm text-accent-category flex gap-2 items-center justify-between">
            {preferredCategory && (
              <span key={preferredCategory?.node?.id} className="tracking-wide">
                {preferredCategory?.node?.name.toUpperCase()}
              </span>
            )}
            <span className="font-bitter font-semibold text-stone-700 dark:text-stone-300 tracking-wider">
              <PublishingDateTime dateString={date} size={16} />
            </span>
          </div>
          <Link href={uri} title={title}>
            <h2 className="font-bitter font-semibold leading-snug transition-colors hover:text-blue-700 dark:hover:text-cyan-300">
              {title}
            </h2>
          </Link>
        </div>
      </div>

      <div className="flex justify-between items-center mt-1 mb-3">
        <p
          className="text-gray-600 dark:text-stone-200 transition-all duration-150 hover:text-gray-900 leading-tight line-clamp-2"
          title={plainTextExcerpt}
          dangerouslySetInnerHTML={{ __html: excerpt || "" }}
          style={{ flexShrink: 1 }}
        />
      </div>
    </article>
  );
};

export default LTRNewsPreview;
