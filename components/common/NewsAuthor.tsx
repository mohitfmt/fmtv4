import siteConfig from "@/constants/site-config";
import Link from "next/link";
import React from "react";

const NewsAuthor = ({ author }: any) => {
  // const isAuthorHaveFullName =
  //   author?.node?.firstName && author?.node?.lastName;
  // const name = isAuthorHaveFullName
  //   ? `${author.node.firstName} ${author.node.lastName}`
  //   : author?.node?.name || null;

  return (
    <div
      className="tracking-wide font-rhd text-stone-700 dark:text-stone-300"
      itemScope
      itemProp="author"
      itemType="https://schema.org/Person"
    >
      <Link
        href={`/category/author/${author?.node?.slug}`}
        className="flex items-center font-bold"
        itemProp="url"
      >
        {/* <span className="mr-1">By:</span> */}
        <span className="underline underline-offset-4" itemProp="name">
          {author?.node?.name}
        </span>
      </Link>
    </div>
  );
};

export default NewsAuthor;
