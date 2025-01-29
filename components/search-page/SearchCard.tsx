import Link from "next/link";
import { getPreferredCategory } from "@/lib/utils";
import parse from "html-react-parser";
import CoverImage from "../common/CoverImage";
import PublishingDateTime from "../common/display-date-formats/PublishingDateTime";

const SearchCard = ({
  title,
  excerpt,
  featuredImage,
  date,
  slug,
  categories,
  uri,
}: any) => {
  const parsedExcerpt = parse(excerpt || "").toString();
  const preferredCategory = getPreferredCategory(categories.edges);

  return (
    <article className="rounded-lg hover:shadow-md border dark:border-stone-600 dark:hover:shadow-stone-600 transition-all duration-300">
      <div className="flex flex-col md:flex-row gap-6 ">
        <figure className="md:w-2/5 rounded-lg overflow-hidden">
          {featuredImage && (
            <div className="aspect-video">
              <CoverImage
                title={title}
                coverImage={featuredImage}
                slug={slug}
                url={uri}
              />
            </div>
          )}
        </figure>
        
        <div className="md:w-3/5 p-2">
          <div className="flex flex-col justify-around h-full">
            <header className="flex items-center justify-between mb-3">
              {preferredCategory && (
                <span className="text-sm text-accent-category tracking-wide font-bitter">
                  {preferredCategory?.node?.name.toUpperCase()}
                </span>
              )}
              <span className="text-sm font-bitter text-stone-700 dark:text-stone-300">
                <PublishingDateTime dateString={date} size={16} />
              </span>
            </header>
            
            <Link href={uri} title={title}>
              <h2 className="text-xl font-bitter font-semibold mb-4 leading-tight hover:text-blue-700 dark:hover:text-cyan-300 transition-colors">
                {title}
              </h2>
            </Link>
            
            <div 
              className="text-gray-600 dark:text-stone-200 line-clamp-3 leading-relaxed"
              title={parsedExcerpt}
              dangerouslySetInnerHTML={{ __html: excerpt }}
            />
          </div>
          
        </div>
      </div>
    </article>
  );
};

export default SearchCard;