// components/common/SubcategoryList.tsx
import { FaArrowTrendUp } from "react-icons/fa6";
import { HiArrowCircleRight } from "react-icons/hi";
import Link from "next/link";

interface TagItem {
  id?: string | number;
  title: string;
  uri?: string;
  href?: string;
  slug?: string;
}

interface SubcategoryListProps {
  items: TagItem[];
  variant: "trending" | "subcategories";
  className?: string;
}

const TrendingNSubCategoriesList = ({
  items,
  variant,
  className = "",
}: SubcategoryListProps) => {
  const isTrending = variant === "trending";

  const Icon = isTrending ? FaArrowTrendUp : HiArrowCircleRight;
  const label = isTrending ? "trending" : "Sub Categories";

  return (
    <div className={`flex items-center gap-2 md:gap-3 my-5 ${className}`}>
      <div className="inline-flex items-center justify-center bg-accent-yellow dark:bg-accent-blue px-2 rounded-lg border-[0.5px] border-yellow-400 dark:border-blue-100">
        <span className="hidden md:block font-bold uppercase tracking-wide text-sm px-1">
          {label}
        </span>
        <span>
          <Icon size={24} />
        </span>
      </div>
      <ul className="flex items-center gap-1 md:gap-3 flex-wrap">
        {items.map((item) => (
          <li
            key={item.id || item.slug || item.title}
            className="px-2.5 py-1 font-semibold rounded-lg font-rhd text-xs uppercase tracking-widest border-[0.5px] border-stone-400 hover:bg-accent-yellow dark:hover:bg-accent-blue transition-colors ease-in-out"
          >
            <Link href={item.uri || item.href || "#"}>{item.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TrendingNSubCategoriesList;
