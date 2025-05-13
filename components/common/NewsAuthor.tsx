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
      itemProp="author"
      itemType="https://schema.org/Person"
      itemScope
    >
      <Link
        href={`${siteConfig.baseUrl}/category/author/${author?.node?.slug}`}
        className="flex items-center font-bold"
        itemProp="url"
      >
        {/* <span className="mr-1">By:</span> */}
        <h2 className="underline underline-offset-4" itemProp="name">
          {author?.node?.name}
        </h2>
      </Link>
    </div>
  );
};

export default NewsAuthor;
