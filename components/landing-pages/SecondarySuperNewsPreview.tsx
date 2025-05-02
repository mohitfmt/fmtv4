import CoverImage from "../common/CoverImage";
import Link from "next/link";
import NewsAuthor from "../common/NewsAuthor";
import FullDateDisplay from "../common/display-date-formats/FullDateDisplay";

const SecondarySuperNewsPreview = ({
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
    <>
      <article className="relative">
        {featuredImage && (
          <CoverImage
            title={title}
            coverImage={featuredImage}
            slug={slug}
            url={uri}
            isBig={true}
          />
        )}
        <div className="absolute w-full bottom-0 bg-gradient-to-b from-transparent via-40% via-black/60 to-black/95 text-white px-2 lg:px-5 flex flex-col rounded-lg">
          <Link href={uri}>
            <h3
              className="text-2xl md:text-4xl font-extrabold font-bitter my-2 text-left"
              style={{ textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8)" }}
              title={title}
            >
              {title}
            </h3>
            <div
              className="my-2 font-thin hidden lg:block"
              title={updatedExcerpt}
              dangerouslySetInnerHTML={{ __html: excerpt }}
            />
          </Link>
        </div>
      </article>
      <div className="flex w-full text-md justify-between items-center lg:px-2 -mt-4 lg:-mt-8">
        <NewsAuthor author={author} />
        <span className="font-bitter font-semibold text-stone-700 dark:text-stone-300 tracking-wider">
          <FullDateDisplay dateString={date} />
        </span>
      </div>
    </>
  );
};

export default SecondarySuperNewsPreview;
