import { getPreferredCategory } from "@/lib/utils";
import CoverImage from "../common/CoverImage";
import PublishingDateTime from "../common/PublishingDateTime";
import Link from "next/link";
import NewsAuthor from "../common/NewsAuthor";

const SuperNewsPreview = ({
  title,
  featuredImage,
  date,
  excerpt,
  author,
  slug,
  categories,
  uri,
}: any) => {
  const updatedExcerpt = excerpt?.replace(/<[^>]*>/g, "");
  const preferredCategory = getPreferredCategory(categories.edges);
  return (
    <article className="p-0 md:p-2 border-b mt-1">
      <header className="">
        {featuredImage && (
          <CoverImage
            title={title}
            coverImage={featuredImage}
            slug={slug}
            url={uri}
            isPriority={true}
          />
        )}
      </header>
      <div className="flex justify-between items-center my-1">
        <NewsAuthor author={author} />
        <h4 className="text-sm text-red-700 hidden">
          {preferredCategory && (
            <span key={preferredCategory?.node?.id}>
              {preferredCategory?.node?.name.toUpperCase()}
            </span>
          )}
        </h4>
        <span className="text-sm font-bitter font-semibold text-stone-700 dark:text-stone-300 tracking-wider">
          <PublishingDateTime dateString={date} />
        </span>
      </div>
      <Link href={uri}>
        <h3
          className="text-4xl leading-tight font-bold font-bitter"
          title={title}
        >
          {title}
        </h3>
      </Link>

      <footer className="flex items-center justify-between my-2">
        <div
          title={updatedExcerpt}
          dangerouslySetInnerHTML={{ __html: excerpt }}
        />
      </footer>
    </article>
  );
};

export default SuperNewsPreview;
