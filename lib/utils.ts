import { OrgJsonLD } from "@/constants/jsonlds/org";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getPreferredCategory = (
  categories: { node: { name: string; id: string; slug?: string } }[]
) => {
  if (!categories || categories.length === 0) {
    return { node: { name: "VIDEOS", id: "video-default" } };
  }

  const filteredCategories = categories.filter((category) => {
    const categoryName = category?.node?.name?.toLowerCase();
    return !(
      categoryName?.startsWith("top") ||
      categoryName?.includes("highlight") ||
      categoryName?.includes("super") ||
      categoryName?.includes("lifestyle")
    );
  });

  if (filteredCategories.length === 0) {
    return { node: { name: "VIDEOS", id: "video-default" } };
  }

  const sportCategory = filteredCategories.find(
    (category) =>
      category?.node?.name?.toLowerCase() !== "sports" &&
      category?.node?.slug !== "sports"
  );

  if (sportCategory) {
    return sportCategory;
  }

  return filteredCategories.reduce(
    (shortest, current) => {
      if (
        !shortest ||
        current?.node?.name?.length < shortest?.node?.name?.length
      ) {
        return current;
      }
      return shortest;
    },
    { node: { name: "", id: "", slug: "" } }
  );
};

export const generateCollectionPageJsonLD = ({
  topNewsPosts,
  businessPosts,
  opinionPosts,
  worldPosts,
  leisurePosts,
  sportsPosts,
  beritaPosts,
  videoPosts,
  columnists,
}: any) => {
  const createArticleLD = (posts: any[], categoryName: string) => {
    return posts?.map((post) => ({
      "@type": "NewsArticle",
      headline: post?.title || "Article Headline",
      url: `https://fmtnews.com/${categoryName}/${post?.slug}`,
      datePublished: post?.date
        ? new Date(post?.date).toISOString()
        : new Date().toISOString(),
      author: {
        "@type": "Person",
        name: post?.author?.node?.name || "Unknown Author",
        url: post?.author?.node
          ? `https://fmtnews.com/authors/${post?.author?.node?.slug}`
          : "https://fmtnews.com/authors/unknown",
      },
      imageObject: {
        "@context": "https://schema.org",
        "@type": "ImageObject",
        contentUrl: post?.featuredImage?.node?.sourceUrl,
        creditText: post?.featuredImage?.node?.altText || "Image Credit",
        width: 1600,
        height: 1000,
        copyrightNotice: "© FMT News, since 2009",
        acquireLicensePage: "https://fmtnews.com/license",
        creator: {
          "@type": "Organization",
          name: "FMT News",
          url: "https://fmtnews.com/",
        },
        license: "https://creativecommons.org/licenses/by/4.0/",
      },
      articleSection:
        post?.categories?.nodes?.map((catName: any) => catName.name) || [],
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `https://fmtnews.com/${categoryName}/${post?.slug}`,
      },
    }));
  };

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "FMT News | Free and Independent News",
    url: "https://fmtnews.com/",
    description:
      "Explore 24/7 news on politics, economy, and more with Free Malaysia Today. Your source for unbiased Malaysian news in English & Malay since 2009.",
    mainEntityOfPage: {
      "@type": "CollectionPage",
      headline: "FMT News Homepage",
      description:
        "The homepage of FMT News featuring current articles on multiple categories such as Top News, Business, Sports, and more.",
      url: "https://fmtnews.com/",
      hasPart: [
        {
          "@type": "CollectionPage",
          headline: "Top News",
          about: "The latest top news in Malaysia.",
          hasPart: createArticleLD(topNewsPosts, "top-news"),
        },
        {
          "@type": "CollectionPage",
          headline: "Business News",
          about: "The latest business and finance news.",
          hasPart: createArticleLD(businessPosts, "business"),
        },
        {
          "@type": "CollectionPage",
          headline: "Opinion",
          about: "Opinion articles from various columnists.",
          hasPart: createArticleLD(opinionPosts, "opinion"),
        },
        {
          "@type": "CollectionPage",
          headline: "World News",
          about: "World news from various countries.",
          hasPart: createArticleLD(worldPosts, "world"),
        },
        {
          "@type": "CollectionPage",
          headline: "Leisure News",
          about: "Leisure and lifestyle news.",
          hasPart: createArticleLD(leisurePosts, "leisure"),
        },
        {
          "@type": "CollectionPage",
          headline: "Sports News",
          about: "Latest sports news.",
          hasPart: createArticleLD(sportsPosts, "sports"),
        },
        {
          "@type": "CollectionPage",
          headline: "Berita Utama",
          about: "The latest headlines in Bahasa Malaysia.",
          hasPart: createArticleLD(beritaPosts, "berita-utama"),
        },
        {
          "@type": "CollectionPage",
          headline: "Latest Videos",
          about: "Latest videos on FMT News.",
          hasPart: videoPosts?.map((video: any) => ({
            "@type": "VideoObject",
            headline: video?.title || "Video Title",
            name: video?.title || "Video Title", // Ensures the "name" field is set
            url: video?.slug
              ? `https://fmtnews.com/videos/${video?.slug}`
              : "https://fmtnews.com/",
            contentUrl:
              video?.contentUrl || "https://fmtnews.com/default-video.mp4", // Replace with actual video URL if available
            thumbnailUrl:
              video?.thumbnailUrl ||
              "https://via.placeholder.com/1600x1000?text=Video+Thumbnail+is+missing",
            uploadDate: video?.date || new Date().toISOString(),
            description: video?.description || "Video description",
            duration: video?.duration || "PT0H0M0S",
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": video?.slug
                ? `https://fmtnews.com/videos/${video?.slug}`
                : "https://fmtnews.com/",
            },
          })),
        },
        {
          "@type": "CollectionPage",
          headline: "Columnists",
          about: "Opinion articles written by FMT columnists.",
          hasPart: columnists?.map((columnist: any) => ({
            "@type": "Person",
            name: columnist?.name || "Columnist Name",
            url: `https://fmtnews.com/authors/${columnist?.slug}`,
            jobTitle: "Columnist",
            description: columnist?.description || "Columnist description",
          })),
        },
      ],
    },
    publisher: OrgJsonLD,
  };
};

export const calculateCacheDuration = () => {
  const now = new Date();
  const noon = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
    0,
    0
  );
  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0
  );

  const nextUpdate = now.getHours() < 12 ? noon : midnight;
  const duration = Math.max(
    1,
    Math.floor((nextUpdate.getTime() - now.getTime()) / 1000)
  );

  return duration;
};
