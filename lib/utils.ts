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
  heroPosts,
  highlightPosts,
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
  const protocol = "https"; // or use your env condition
  const host = process.env.NEXT_PUBLIC_DOMAIN || "dev-v4.freemalaysiatoday.com";
  const baseUrl = `${protocol}://${host}`;

  const createArticleLD = (posts: any[], categoryName: string) => {
    return posts?.map((post) => ({
      "@type": "NewsArticle",
      headline: post?.title || "Article Headline",
      section: categoryName,
      url: `${baseUrl}${post?.uri}`,
      datePublished: post?.date
        ? new Date(post?.date).toISOString()
        : new Date().toISOString(),
      author: {
        "@type": "Person",
        name: post?.author?.node?.name || "FMT Reporter",
        url: post?.author?.node
          ? `${baseUrl}/category/authors/${post?.author?.node?.slug}`
          : `${baseUrl}/category/authors/fmt-reporters`,
      },
      image: post?.featuredImage?.node?.sourceUrl,
      imageObject: {
        "@context": "https://schema.org",
        "@type": "ImageObject",
        contentUrl: post?.featuredImage?.node?.sourceUrl,
        creditText: post?.featuredImage?.node?.altText || "Image Credit",
        width: 1600,
        height: 1000,
        copyrightNotice: "© Free Malaysia Today, since 2009",
        acquireLicensePage: `${baseUrl}/license`,
        creator: {
          "@type": "Organization",
          name: "Free Malaysia Today",
          url: baseUrl,
        },
        license: "https://creativecommons.org/licenses/by/4.0/",
      },
      articleSection:
        post?.categories?.nodes?.map((catName: any) => catName.name) || [],
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `${baseUrl}${post?.uri}`,
      },
    }));
  };

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Free Malaysia Today | Free and Independent News",
    url: baseUrl,
    description:
      "Explore 24/7 news on politics, economy, and more with Free Malaysia Today. Your source for unbiased Malaysian news in English & Malay since 2009.",
    mainEntityOfPage: {
      "@type": "CollectionPage",
      headline: "Free Malaysia Today | Homepage",
      description:
        "The homepage of FMT News featuring current articles on multiple categories such as Top News, Business, Sports, and more.",
      url: baseUrl,
      hasPart: [
        {
          "@type": "CollectionPage",
          headline: "Breaking News",
          about: "The latest breaking news in Malaysia.",
          hasPart: createArticleLD(heroPosts, "top-news"),
        },
        {
          "@type": "CollectionPage",
          headline: "Top highlights",
          about: "The latest highlights in Malaysia.",
          hasPart: createArticleLD(highlightPosts, "top-news"),
        },
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
            headline: video.node?.title || "Video Title",
            name: video.node?.title || "Video Title", // Ensures the "name" field is set
            url: video.node?.slug
              ? `${baseUrl}/videos/${video.node?.slug}`
              : baseUrl,
            contentUrl:
              video.node?.contentUrl || `${baseUrl}/default-video.mp4`, // Replace with actual video URL if available
            thumbnailUrl:
              video.node?.featuredImage.node.mediaItemUrl ||
              "https://via.placeholder.com/1600x1000?text=Video+Thumbnail+is+missing",
            uploadDate: video.node?.dateGmt || new Date().toISOString(),
            description: video.node?.excerpt || "Video description",
            duration: video.node?.duration || "PT0H0M0S",
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": video.node?.slug
                ? `${baseUrl}/videos/${video.node?.slug}`
                : baseUrl,
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
            url: `${baseUrl}/category/authors/{columnist?.slug}`,
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

export async function fetchLastUpdateTime() {
  const response = await fetch("/api/last-update");
  if (!response.ok) throw new Error("Failed to fetch last update time");
  return response.json();
}
