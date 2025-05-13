import CoverImage from "../common/CoverImage";
import Link from "next/link";
import NewsAuthor from "../common/NewsAuthor";
import PublishingDateTime from "../common/display-date-formats/PublishingDateTime";

const SuperNewsPreview = ({
  title,
  featuredImage,
  date,
  excerpt,
  author,
  slug,
  uri,
}: any) => {
  const updatedExcerpt = excerpt?.replace(/<[^>]*>/g, "");

  return (
    <article className="p-0 md:p-2 border-b mt-1 overflow-hidden">
      <header className="relative">
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
      <div className="flex justify-between items-center my-2 text-md">
        <NewsAuthor author={author} />
        <span className="font-bitter font-semibold text-stone-700 dark:text-stone-300 tracking-wider">
          <PublishingDateTime dateString={date} />
        </span>
      </div>
      <Link href={uri}>
        <h1
          className="text-4xl leading-tight font-extrabold font-bitter hover:text-blue-700 dark:hover:text-cyan-300"
          title={title}
        >
          {title}
        </h1>
      </Link>

      <p
        className="flex items-center justify-between my-2"
        title={updatedExcerpt}
        dangerouslySetInnerHTML={{ __html: excerpt }}
      />
    </article>
  );
};

export default SuperNewsPreview;
