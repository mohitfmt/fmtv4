import { TrendUp } from "@phosphor-icons/react";
import Link from "next/link";

const TrendingTags = ({ tags }: any) => {
  return (
    <div className="flex items-center gap-2 md:gap-3 my-5">
      <div className="inline-flex items-center py-0.5 bg-yellow-300 dark:bg-blue-600 pl-1 pr-2 rounded-lg border border-yellow-400 dark:border-blue-100">
        <span className="font-bold uppercase tracking-wide text-sm text-nowrap pl-1">
          trending
        </span>
        <TrendUp size={24} />
      </div>
      <ul className="flex items-center gap-1 md:gap-3 flex-wrap">
        {tags.map((tag: any) => (
          <li
            key={tag.id}
            className="px-2 py-1 font-semibold rounded-lg font-rhd text-xs uppercase tracking-widest border border-stone-200 hover:bg-yellow-300 dark:hover:bg-blue-600 transition-colors ease-in-out"
          >
            <Link href={tag.uri}>{tag.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TrendingTags;
