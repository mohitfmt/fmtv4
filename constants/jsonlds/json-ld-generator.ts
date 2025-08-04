import { formattedJsonDate } from "@/components/common/display-date-formats/DateFormates";
import { stripHTML } from "@/lib/utils";
import { PostCardProps } from "@/types/global";

const findSection = (uri: string) => {
  const urlSegments = uri.split("/");
  const categoryIndex = urlSegments.findIndex(
    (part: string) => part === "category"
  );
  const articleCategory =
    categoryIndex !== -1 ? urlSegments[categoryIndex + 1] : "notfound";
  switch (articleCategory.toLowerCase()) {
    case "nation":
      return `Nation`;
    case "bahasa":
      return `Berita`;
    case "business":
      return `Business`;
    case "leisure":
      return `Lifestyle`;
    case "opinion":
      return `Opinion`;
    case "world":
      return `World`;
    case "sports":
      return `Sports`;
    case "highlight":
      return `Breaking News`;
    default:
      return articleCategory;
  }
};

export const generatedJsonLd = (
  postEdges: any,
  pathURi: string,
  pageName: string
) => {
  const articleItemListElement = postEdges?.map(
    ({ node }: { node: PostCardProps }, index: number) => {
      const articleUrl = `https://www.freemalaysiatoday.com${node?.uri ?? "/404/"}`;

      const authorUrl = `https://www.freemalaysiatoday.com${node?.author?.node?.uri ?? "/category/author/fmtreporters/"}`;

      return {
        "@type": "NewsArticle",
        articleSection: [findSection(node?.uri) ?? "News", pageName],
        name: `${pageName}: ${node?.title}`,
        headline: node?.title ?? "News Headline",
        description: stripHTML(node?.excerpt ?? ""),
        datePublished: node?.dateGmt + "Z",
        inLanguage:
          findSection(node?.uri).toLowerCase() === "berita" ? "ms" : "en",
        image: {
          "@context": "https://schema.org",
          "@type": "ImageObject",
          "@id": node?.featuredImage?.node?.sourceUrl,
          url: node?.featuredImage?.node?.sourceUrl,
          height: 1000,
          width: 1600,
          caption: node?.title ?? "Free Malaysia Today",
          contentUrl: node?.featuredImage?.node?.sourceUrl,
          creditText: node?.title ?? "Free Malaysia Today",
          license: "https://www.freemalaysiatoday.com/privacy-policy/",
          acquireLicensePage:
            "https://www.freemalaysiatoday.com/privacy-policy/",
          creator: {
            "@type": "Organization",
            name: "Free Malaysia Today",
            url: "https://www.freemalaysiatoday.com/",
          },
          copyrightNotice: `© Free Malaysia Today, ${new Date().getFullYear()}`,
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": articleUrl,
          breadcrumb: {
            "@type": "BreadcrumbList",
            "@id": `${articleUrl}#breadcrumb`,
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                item: {
                  "@id": "https://www.freemalaysiatoday.com/",
                  name: "Home",
                },
              },
              {
                "@type": "ListItem",
                position: 2,
                item: {
                  "@id": pathURi,
                  name: pageName,
                },
              },
              {
                "@type": "ListItem",
                position: 3,
                name: node?.title ?? "Article",
              },
            ],
          },
        },
        keywords:
          node?.tags?.edges?.map(({ node }) => node?.name).join(", ") ?? "",
        author: [
          {
            "@type": "Person",
            name: node?.author?.node?.name ?? "FMT Reporters",
            url: authorUrl,
            sameAs: authorUrl,
            affiliation: {
              "@type": "NewsMediaOrganization",
              name: "Free Malaysia Today",
              url: "https://www.freemalaysiatoday.com/",
            },
          },
          {
            "@type": "NewsMediaOrganization",
            name: "Free Malaysia Today",
            url: "https://www.freemalaysiatoday.com/",
          },
        ],
        publisher: {
          "@type": "NewsMediaOrganization",
          name: "Free Malaysia Today",
          url: "https://www.freemalaysiatoday.com/",
          logo: {
            "@type": "ImageObject",
            url: "https://www.freemalaysiatoday.com/icon-512x512.png",
            contentUrl: "https://www.freemalaysiatoday.com/icon-512x512.png",
            width: 512,
            height: 512,
          },
        },
        isPartOf: {
          "@type": "CollectionPage",
          "@id": pathURi,
        },
      };
    }
  );

  const homeNewsJsonLD = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": pathURi,
    url: pathURi,
    name: pageName,
    hasPart: articleItemListElement,
    breadcrumb: {
      "@type": "BreadcrumbList",
      "@id": `${pathURi}#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          item: {
            "@id": "https://www.freemalaysiatoday.com/",
            name: "Home",
          },
        },
        {
          "@type": "ListItem",
          position: 2,
          item: {
            "@id": pathURi,
            name: pageName,
          },
        },
      ],
    },
  };

  return homeNewsJsonLD;
};
