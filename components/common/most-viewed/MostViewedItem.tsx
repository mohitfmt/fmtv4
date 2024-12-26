import { memo } from "react";
import Link from "next/link";
import { CATEGORIES } from "@/constants/categories";
import FullDateDisplay from "../display-date-formats/FullDateDisplay";
import { MostViewedItemType } from "@/types/global";

interface MostViewedItemProps {
  item: MostViewedItemType;
  index: number;
}

const findCategory = (uri: string) => {
  const category = uri.split("/category/")[1]?.split("/")[0].toUpperCase();
  return (
    CATEGORIES[category as keyof typeof CATEGORIES] ?? category ?? "MALAYSIA"
  );
};

// Replaced h3 and h4 with h1 and h2 (to increase accessibility score)
const MostViewedItem = memo(({ item, index }: MostViewedItemProps) => (
  <Link href={item.uri}>
    <div className="flex items-center gap-4 p-1 mb-3 py-2 border-b hover:bg-stone-100 hover:rounded-xl dark:hover:bg-stone-600">
      <div className="w-11 border-r-2 border-accent-yellow text-5xl font-bitter font-bold text-stone-700 dark:text-stone-300">
        {index + 1}
      </div>
      <div className="flex-1">
        <h2 className="text-xs text-accent-category flex gap-2 items-center justify-between">
          {findCategory(item.uri)}
          <span className="text-stone-700 dark:text-stone-300">
            <FullDateDisplay dateString={item.date} />
          </span>
        </h2>
        <h1 className="text-lg font-bitter font-medium">{item.title}</h1>
      </div>
    </div>
  </Link>
));

MostViewedItem.displayName = "MostViewedItem";

export default MostViewedItem;
