import siteConfig, { getIconUrl } from "@/constants/site-config";
import { stripHTML } from "@/lib/utils";
import { WebPageJsonLD } from "@/constants/jsonlds/org";
import { ArticleData } from "@/types/global";

const extractFirstParagraph = (htmlContent: string) => {
  const paragraphPattern = /<p>(.*?)<\/p>/;
  const match = htmlContent?.match(paragraphPattern);
  return match ? match[1].trim() : null;
};
const extractLocation = (content: string) => {
  const locationPattern = /^([A-Z\s]+:)\s+/;
  const match = content?.match(locationPattern);
  if (match) {
    return match[1].slice(0, -1).trim();
  }
  return "MALAYSIA";
};
const extractYouTubeID = (content: string): string | null => {
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = content?.match(regex);
  return match ? match[1] : null;
};
const getRelatedNewsJsonLd = (relatedData: any) => {
  const ListofItems = relatedData?.map((node: any, index: number) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `https://www.freemalaysiatoday.com${node?.uri}`,
    name: node?.title,
  }));

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: ListofItems,
  };
};
const getBreadcrumbJsonLd = (uri: string) => {
  let baseUrl = `https://${process.env.NEXT_PUBLIC_DOMAIN ?? "www.freemalaysiatoday.com"}`;
  baseUrl = baseUrl.replace(/\/$/, "");

  const postUri = uri.split("/").filter(Boolean);

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const formatName = (item: string, index: number, array: string[]) => {
    if (/^\d{4}$/.test(item)) {
      return `${item} (Year)`;
    } else if (/^\d{2}$/.test(item) && /^\d{4}$/.test(array[index - 1])) {
      const monthIndex = parseInt(item, 10) - 1;
      return `${item} (${months[monthIndex]})`;
    } else if (
      /^\d{2}$/.test(item) &&
      /^\d{2}$/.test(array[index - 1]) &&
      /^\d{4}$/.test(array[index - 2])
    ) {
      const day = parseInt(item, 10);
      const month = months[parseInt(array[index - 1], 10) - 1];
      const year = array[index - 2];
      return `${day}${getOrdinalSuffix(day)} ${month} ${year}`;
    } else {
      return item.toUpperCase().replace(/-/g, " ");
    }
  };

  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return "th";
    switch (day % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  const itemListElement = postUri.map((item, index, array) => ({
    "@type": "ListItem",
    position: index + 2,
    name: formatName(item, index, array),
    item: `${baseUrl}/${array.slice(0, index + 1).join("/")}/`,
  }));

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl,
      },
      ...itemListElement,
    ],
  };
};

const ArticleJsonLD = ({
  data,
  relatedData,
}: {
  data: ArticleData;
  relatedData: any;
}) => {
  const keywords =
    data?.keywords?.keywords ||
    data?.tags?.edges?.map(({ node }: any) => node?.name).join(", ");

  const fullUrl = `${siteConfig.baseUrl}${data?.uri}`;

  const stripContent = stripHTML(data?.content ?? "content not found");
  const firstParagraph = extractFirstParagraph(
    data?.content ?? "content not found"
  );
  const location = extractLocation(firstParagraph ?? "location not found");

  const timeToRead = Math.ceil(stripContent?.split(" ").length / 200);
  const durationToReadNews = "PT" + timeToRead + "M";

  const urlSegments = fullUrl.split("/");
  const categoryIndex = urlSegments.findIndex((part) => part === "category");
  const articleCategory =
    categoryIndex !== -1 ? urlSegments[categoryIndex + 1] : "notfound";
  const articleType = "NewsArticle";
  const articleLanguage = "en";
  const cleanExcerpt = stripHTML(data?.excerpt ?? "excerpt not found");

  let videoJsonLD = null;
  const videoData = extractYouTubeID(data?.content ?? "content not found");

  if (videoData) {
    videoJsonLD = {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: data?.title,
      description: cleanExcerpt,
      uploadDate: data?.dateGmt,
      thumbnailUrl: data?.featuredImage?.node?.sourceUrl,
      contentUrl: `https://www.youtube.com/watch?v=${videoData}`,
      embedUrl: `https://www.youtube.com/embed/${videoData}`,
    };
  }

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": articleType,
    name: data?.title,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": fullUrl,
    },
    url: fullUrl,
    headline: data?.title,
    about: `${data?.title} - ${cleanExcerpt}`,
    alternativeHeadline: cleanExcerpt,
    abstract: `${data?.title} - ${cleanExcerpt}`,
    articleSection:
      data?.categories?.edges?.map((category) => category?.node?.name) ??
      articleCategory,
    articleBody: stripContent,
    wordCount: stripContent?.split(" ").length,
    timeRequired: durationToReadNews,
    countryOfOrigin: {
      "@type": "Country",
      name: "Malaysia",
    },
    isAccessibleForFree: true,
    image: {
      "@context": "https://schema.org",
      "@type": "ImageObject",
      "@id": data?.featuredImage?.node?.sourceUrl,
      url: data?.featuredImage?.node?.sourceUrl,
      height: data?.featuredImage?.node?.mediaDetails?.height,
      width: data?.featuredImage?.node?.mediaDetails?.width,
      representativeOfPage: true,
      caption: data?.title ?? `${siteConfig.siteName}`,
      contentUrl: data?.featuredImage?.node?.sourceUrl,
      creditText: data?.title ?? `${siteConfig.siteName}`,
      license: `${siteConfig.baseUrl}/privacy-policy/`,
      acquireLicensePage: `${siteConfig.baseUrl}/privacy-policy/`,
      creator: {
        "@type": "Organization",
        name: `${siteConfig.siteName}`,
        url: `${siteConfig.baseUrl}`,
      },
      copyrightNotice: `© Free Malaysia Today, ${new Date().getFullYear()}`,
    },
    thumbnailUrl: data?.featuredImage?.node?.sourceUrl,
    dateCreated: data?.dateGmt,
    datePublished: data?.dateGmt,
    dateModified: data?.modifiedGmt,
    contentLocation: {
      "@type": "Place",
      name: location,
    },
    author: [
      {
        "@type": "Person",
        name: data?.author.node.name,
        url: `${siteConfig.baseUrl}${data?.author.node.uri}`,
      },
    ],
    publisher: {
      "@type": "NewsMediaOrganization",
      name: `${siteConfig.siteName}`,
      url: `${siteConfig.baseUrl}`,
      logo: {
        "@type": "ImageObject",
        url: getIconUrl(),
        width: 512,
        height: 512,
      },
    },
    inLanguage: articleLanguage,
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [".headline", ".news-content"],
    },
    keywords,
    potentialAction: {
      "@type": "ReadAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: fullUrl,
      },
      actionStatus: "PotentialActionStatus",
    },
  };

  const breadcrumbJsonLd = getBreadcrumbJsonLd(data?.uri || "");
  const relatedNewsJsonLd = getRelatedNewsJsonLd(relatedData);

  return (
    <>
      {videoJsonLD && (
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(videoJsonLD),
          }}
          id="video-json-ld"
          type="application/ld+json"
          defer
        />
      )}
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd),
        }}
        id="article-json-ld"
        type="application/ld+json"
        defer
      />

      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(relatedNewsJsonLd) }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(WebPageJsonLD) }}
        type="application/ld+json"
      />
    </>
  );
};

export default ArticleJsonLD;
