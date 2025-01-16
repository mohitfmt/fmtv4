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
      itemProp="url"
    >
      <div
        className="tracking-wide font-rhd text-lg text-stone-700 dark:text-stone-300"
        itemProp="author"
        itemType="https://schema.org/Person"
        itemScope
      >
        By:
        <span
          className="underline font-semibold underline-offset-4 text-stone-700 dark:text-stone-300"
          itemProp="name"
        >
          {name}
        </span>
      </div>
    </Link>
  );
};

export default NewsAuthor;
