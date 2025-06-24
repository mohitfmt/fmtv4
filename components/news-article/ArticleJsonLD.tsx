import React from "react";
import siteConfig from "@/constants/site-config";
import { stripHTML } from "@/lib/utils";
import { OrgJsonLD, WebPageJsonLD } from "@/constants/jsonlds/org";
import { ArticleData } from "@/types/global";

const extractFirstParagraph = (htmlContent: string): string | null => {
  const paragraphPattern = /<p>(.*?)<\/p>/;
  const match = htmlContent?.match(paragraphPattern);
  return match ? match[1].trim() : null;
};

const extractLocation = (content: string): string => {
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
  const items =
    relatedData?.map((node: any, index: number) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${siteConfig.baseUrl}${node?.uri}`,
      name: node?.title,
    })) ?? [];

  return {
    "@type": "ItemList",
    name: "Related Articles",
    itemListElement: items,
  };
};

const getBreadcrumbJsonLd = (uri: string) => {
  let baseUrl = `https://${process.env.NEXT_PUBLIC_DOMAIN ?? "www.freemalaysiatoday.com"}`;
  baseUrl = baseUrl.replace(/\/+$/, "");
  const segments = uri.split("/").filter(Boolean);
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
  const getOrdinal = (d: number) =>
    d > 3 && d < 21 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[d % 10] || "th";

  const formatted = segments.map((seg, i, arr) => {
    if (/^\d{4}$/.test(seg)) return `${seg} (Year)`;
    if (/^\d{2}$/.test(seg) && /^\d{4}$/.test(arr[i - 1])) {
      return `${seg} (${months[parseInt(seg, 10) - 1]})`;
    }
    if (
      /^\d{2}$/.test(seg) &&
      /^\d{2}$/.test(arr[i - 1]) &&
      /^\d{4}$/.test(arr[i - 2])
    ) {
      const day = parseInt(seg, 10);
      return `${day}${getOrdinal(day)} ${months[parseInt(arr[i - 1], 10) - 1]} ${arr[i - 2]}`;
    }
    return seg.toUpperCase().replace(/-/g, " ");
  });

  const list = formatted.map((name, idx) => ({
    "@type": "ListItem",
    position: idx + 2,
    name,
    item: `${baseUrl}/${segments.slice(0, idx + 1).join("/")}/`,
  }));

  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      ...list,
    ],
  };
};

const ArticleJsonLD: React.FC<{ data: ArticleData; relatedData: any }> = ({
  data,
  relatedData,
}) => {
  const fullUrl = `${siteConfig.baseUrl}${data.uri}`;
  const stripContent = stripHTML(data.content ?? "");
  const firstPara = extractFirstParagraph(data.content ?? "");
  const location = extractLocation(firstPara ?? "");
  const timeToRead = Math.ceil((stripContent?.split(" ")?.length || 0) / 200);
  const duration = `PT${timeToRead}M`;
  const cleanExcerpt = stripHTML(data.excerpt ?? "");
  const keywords =
    data.keywords?.keywords ||
    data.tags?.edges?.map((t: any) => t.node.name).join(", ");

  // Video
  const videoId = extractYouTubeID(data.content ?? "");
  const videoNode = videoId
    ? {
        "@type": "VideoObject",
        "@id": `https://www.youtube.com/watch?v=${videoId}`,
        name: data.title,
        description: cleanExcerpt,
        uploadDate: `${data.dateGmt}Z`,
        thumbnailUrl: data.featuredImage?.node?.sourceUrl,
        contentUrl: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        author: {
          "@type": "NewsMediaOrganization",
          name: siteConfig.siteName,
          url: siteConfig.baseUrl,
        },
        publisher: {
          "@type": "NewsMediaOrganization",
          name: siteConfig.siteName,
          logo: OrgJsonLD.logo,
        },
        url: fullUrl,
      }
    : null;

  // Article node
  const articleNode = {
    "@type": "NewsArticle",
    name: data.title,
    mainEntityOfPage: { "@type": "WebPage", "@id": fullUrl },
    url: fullUrl,
    headline: data.title,
    abstract: `${data.title} - ${cleanExcerpt}`,
    description: cleanExcerpt,
    dateCreated: `${data.dateGmt}Z`,
    datePublished: `${data.dateGmt}Z`,
    dateModified: `${data.modifiedGmt}Z`,
    author: [
      {
        "@type": "Person",
        name: data.author.node.name,
        url: `${siteConfig.baseUrl}${data.author.node.uri}`,
        sameAs: `${siteConfig.baseUrl}${data.author.node.uri}`,
        affiliation: {
          "@type": "NewsMediaOrganization",
          name: siteConfig.siteName,
          url: siteConfig.baseUrl,
        },
        jobTitle: "Reporter",
        worksFor: {
          "@type": "NewsMediaOrganization",
          name: siteConfig.siteName,
          url: siteConfig.baseUrl,
        },
      },
    ],
    publisher: {
      "@type": "NewsMediaOrganization",
      name: siteConfig.siteName,
      url: siteConfig.baseUrl,
      logo: OrgJsonLD.logo,
    },
    image: {
      "@type": "ImageObject",
      url: data?.featuredImage?.node?.sourceUrl,
      width: data?.featuredImage?.node?.mediaDetails?.width,
      height: data?.featuredImage?.node?.mediaDetails?.height,
      caption: data?.title,
      representativeOfPage: true,
      contentUrl: data?.featuredImage?.node?.sourceUrl,
      creditText: data?.title,
      license: `${siteConfig.baseUrl}/privacy-policy/`,
      acquireLicensePage: `${siteConfig.baseUrl}/privacy-policy/`,
      creator: {
        "@type": "Organization",
        name: siteConfig.siteName,
        url: siteConfig.baseUrl,
      },
      copyrightNotice: `© ${siteConfig.siteName}, ${new Date().getFullYear()}`,
    },
    articleSection: data?.categories?.edges?.map((c: any) => c.node.name),
    articleBody: stripContent,
    wordCount: stripContent.split(" ").length,
    timeRequired: duration,
    isAccessibleForFree: true,
    contentLocation: { "@type": "Place", name: location },
    keywords,
    potentialAction: {
      "@type": "ReadAction",
      target: { "@type": "EntryPoint", urlTemplate: fullUrl },
      actionStatus: "PotentialActionStatus",
    },
  };

  // Breadcrumb & Related
  const breadcrumbNode = getBreadcrumbJsonLd(data?.uri ?? siteConfig.baseUrl);
  const relatedNode = getRelatedNewsJsonLd(relatedData);

  // WebPage
  const { "@context": _ctx, ...webPageNode } = WebPageJsonLD;

  // Assemble @graph
  const graph = [
    articleNode,
    breadcrumbNode,
    relatedNode,
    ...(videoNode ? [videoNode] : []),
    webPageNode,
  ];

  const combinedJsonLd = {
    "@context": "https://schema.org",
    "@graph": graph,
  };

  return (
    <script
      id="combined-json-ld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(combinedJsonLd) }}
    />
  );
};

export default ArticleJsonLD;
