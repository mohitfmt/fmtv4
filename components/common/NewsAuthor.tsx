import Link from "next/link";
import React from "react";

const NewsAuthor = ({ author }: any) => {
  const isAuthorHaveFullName =
    author?.node?.firstName && author?.node?.lastName;
  const name = isAuthorHaveFullName
    ? `${author.node.firstName} ${author.node.lastName}`
    : author?.node?.name || null;
  return (
    <Link
      href={`/category/author/${author?.node?.slug}`}
      className="flex items-center"
    >
      <div
        className="tracking-wide font-rhd text-lg text-stone-700 dark:text-stone-300"
        itemProp="author"
        itemType="https://schema.org/Person"
        itemScope
      >
        <span></span>
        By:
        <span
          className="underline font-semibold underline-offset-4 text-stone-700 dark:text-stone-300"
          itemProp="name"
        >
          {name}
        </span>
        <Link
          href={`https://www.freemalaysiatoday.com/category/author/${author?.node?.slug}`}
          className="sr-only"
          itemProp="url"
        />
      </div>
    </Link>
  );
};

export default NewsAuthor;
