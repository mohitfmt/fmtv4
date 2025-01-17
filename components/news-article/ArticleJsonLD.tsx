import siteConfig, { getIconUrl } from "@/constants/site-config";
import { stripHTML } from "@/lib/utils";

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

interface ArticleData {
  tags?: { edges?: { node?: { name?: string } }[] };
  uri?: string;
  content?: string;
  excerpt?: string;
  title?: string;
  keywords: { keywords: string };
  dateGmt?: string;
  modifiedGmt?: string;
  featuredImage?: {
    node?: {
      sourceUrl?: string;
      mediaDetails?: {
        height?: number;
        width?: number;
      };
    };
  };
  categories?: { edges?: { node?: { name?: string } }[] };
}

const ArticleJsonLD = ({ data }: { data: ArticleData }) => {
  const extractYouTubeID = (content: string): string | null => {
    const regex =
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = content?.match(regex);
    return match ? match[1] : null;
  };
  const keywords =
    data?.keywords.keywords ||
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
          __html: JSON.stringify({
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
              data?.categories?.edges?.map(
                (category) => category?.node?.name
              ) ?? articleCategory,
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
                "@type": "NewsMediaOrganization",
                name: `${siteConfig.siteName}`,
                url: `${siteConfig.baseUrl}`,
              },
            ],
            publisher: {
              "@type": "NewsMediaOrganization",
              name: `${siteConfig.siteName}`,
              url: `${siteConfig.baseUrl}`,
              logo: {
                "@type": "ImageObject",
                url: `${getIconUrl()}`,
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
          }),
        }}
        id="article-json-ld"
        type="application/ld+json"
        defer
      />
    </>
  );
};

export default ArticleJsonLD;
