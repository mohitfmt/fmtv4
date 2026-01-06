import { GetStaticProps, GetStaticPaths } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import siteConfig from "@/constants/site-config";
// import { websiteJSONLD } from "@/constants/jsonlds/org";
import { getAllPostsWithSlug } from "@/lib/gql-queries/get-all-posts-with-slug";
import { getSafeTags, stripHTML } from "@/lib/utils";
import { getMoreStories, getRelatedPosts } from "@/lib/api";
import PhotoDetail from "@/components/gallery/PhotoDetials";
import GalleryLayout from "@/components/gallery/GalleryLayout";
import { getPostAndMorePosts } from "@/lib/gql-queries/get-post-and-more-posts";
import { getWebPageSchema } from "@/constants/jsonlds/shared-schemas";

// Default categories if none are provided
const DEFAULT_CATEGORIES = ["Photos", "Gallery"];
const REVALIDATION_INTERVAL = 300; // 5 minutes

interface ArticleProps {
  post: any;
  posts: any[];
  preview?: boolean;
  relatedPosts?: any[];
  moreStories?: any[];
}

// Helper function to safely get categories
const getSafeCategories = (post: any) => {
  if (!post?.categories?.edges || !Array.isArray(post.categories.edges)) {
    return DEFAULT_CATEGORIES;
  }
  const categories = post.categories.edges
    .filter((edge: any) => edge?.node?.name)
    .map((edge: any) => edge.node.name);
  return categories.length > 0 ? categories : DEFAULT_CATEGORIES;
};

const extractGalleryImages = (
  content: string,
  featuredImage?: any
): Array<{
  url: string;
  caption?: string;
  width?: number;
  height?: number;
}> => {
  const images: Map<string, any> = new Map(); // Use Map to deduplicate

  // If content is empty, use featured image as fallback
  if (!content || content.trim() === "") {
    if (featuredImage?.node?.sourceUrl) {
      return [
        {
          url: featuredImage.node.sourceUrl,
          caption:
            featuredImage.node.caption ||
            featuredImage.node.altText ||
            "Gallery Image",
          width: featuredImage.node.mediaDetails?.width || 1200,
          height: featuredImage.node.mediaDetails?.height || 800,
        },
      ];
    }
    return [];
  }

  // Helper function to normalize URLs
  const normalizeUrl = (url: string): string => {
    if (!url) return "";
    return url
      .replace(/^\/\//, "https://")
      .replace(/^http:\/\//, "https://")
      .replace(/\\/g, ""); // Remove escaped slashes
  };

  // Pattern 1: WordPress attachment IDs in various formats
  const attachmentPatterns = [
    /wp-image-(\d+)/gi,
    /attachment_(\d+)/gi,
    /data-attachment-id="(\d+)"/gi,
  ];

  // Pattern 2: Image URLs in various attributes
  const urlPatterns = [
    /<img[^>]+src=["']([^"']+)["']/gi,
    /data-src=["']([^"']+)["']/gi,
    /data-lazy-src=["']([^"']+)["']/gi,
    /data-original=["']([^"']+)["']/gi,
    /data-full=["']([^"']+)["']/gi,
    /href=["'](https?:\/\/[^"']+\.(jpg|jpeg|png|gif|webp)[^"']*)/gi,
  ];

  // Pattern 3: RoboGallery specific patterns
  const roboPatterns = [
    /robo-gallery-image-(\d+)/gi,
    /\[robo-gallery[^\]]*images=["']([^"']+)["'][^\]]*\]/gi,
    /data-robo-image=["']([^"']+)["']/gi,
  ];

  // Extract using URL patterns
  urlPatterns.forEach((pattern) => {
    let match;
    const contentCopy = content; // Reset regex state
    while ((match = pattern.exec(contentCopy)) !== null) {
      const url = normalizeUrl(match[1]);
      if (url && !url.includes("placeholder") && !url.includes("data:image")) {
        if (!images.has(url)) {
          images.set(url, {
            url,
            caption: `Gallery Image ${images.size + 1}`,
            width: 1200,
            height: 800,
          });
        }
      }
    }
  });

  // Pattern 4: Check for figure/figcaption combinations
  const figurePattern = /<figure[^>]*>([\s\S]*?)<\/figure>/gi;
  let figureMatch;
  while ((figureMatch = figurePattern.exec(content)) !== null) {
    const figureContent = figureMatch[1];
    const imgMatch = /<img[^>]+src=["']([^"']+)["']/.exec(figureContent);
    const captionMatch = /<figcaption[^>]*>(.*?)<\/figcaption>/i.exec(
      figureContent
    );

    if (imgMatch) {
      const url = normalizeUrl(imgMatch[1]);
      if (url && !url.includes("placeholder") && !url.includes("data:image")) {
        const existing = images.get(url) || {
          url,
          width: 1200,
          height: 800,
        };
        if (captionMatch) {
          existing.caption = captionMatch[1].replace(/<[^>]*>/g, "").trim();
        }
        images.set(url, existing);
      }
    }
  }

  // If still no images found, use featured image
  if (images.size === 0 && featuredImage?.node?.sourceUrl) {
    images.set(featuredImage.node.sourceUrl, {
      url: featuredImage.node.sourceUrl,
      caption:
        featuredImage.node.caption ||
        featuredImage.node.altText ||
        "Featured Gallery Image",
      width: featuredImage.node.mediaDetails?.width || 1200,
      height: featuredImage.node.mediaDetails?.height || 800,
    });
  }

  return Array.from(images.values());
};

// Generate ImageGallery JSON-LD
const generateImageGalleryJsonLD = (post: any, images: Array<any>) => {
  const fullUrl = `${siteConfig.baseUrl}${post.uri}`;
  const safeTitle = post?.title?.replace(/"/g, '\\"') || "";
  const safeExcerpt = stripHTML(post?.excerpt || "").substring(0, 160);

  return {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    "@id": `${fullUrl}#gallery`,
    url: fullUrl,
    name: safeTitle,
    description: safeExcerpt,
    datePublished: post?.dateGmt
      ? `${post.dateGmt}Z`
      : new Date().toISOString(),
    dateModified: post?.modifiedGmt
      ? `${post.modifiedGmt}Z`
      : post?.dateGmt
        ? `${post.dateGmt}Z`
        : new Date().toISOString(),
    author: {
      "@type": "Person",
      name: post?.author?.node?.name || "FMT Reporters",
      url: `${siteConfig.baseUrl}${post?.author?.node?.uri || "/category/author/fmtreporters/"}`,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.siteName,
      logo: {
        "@type": "ImageObject",
        url: siteConfig.iconPath,
        width: 60,
        height: 60,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": fullUrl,
    },
    image: images.map((img, index) => ({
      "@type": "ImageObject",
      "@id": `${fullUrl}#image-${index}`,
      url: img.url,
      caption: img.caption || `Image ${index + 1} from ${safeTitle}`,
      width: img.width,
      height: img.height,
      contentUrl: img.url,
      thumbnailUrl: img.url,
      representativeOfPage: index === 0,
    })),
    numberOfImages: images.length,
    keywords: post?.tags?.edges?.map((tag: any) => tag.node.name).join(", "),
    articleSection: getSafeCategories(post),
    inLanguage: "en-MY",
    isFamilyFriendly: true,
    copyrightHolder: {
      "@type": "Organization",
      name: siteConfig.siteName,
    },
    copyrightYear: new Date(post?.dateGmt || Date.now()).getFullYear(),
    license: `${siteConfig.baseUrl}/terms-of-use`,
  };
};

// Generate MediaObject JSON-LD for better image understanding
const generateMediaObjectJsonLD = (images: Array<any>, post: any) => {
  return {
    "@context": "https://schema.org",
    "@type": "MediaObject",
    "@id": `${siteConfig.baseUrl}${post.uri}#media`,
    contentUrl: images[0]?.url,
    thumbnailUrl: images[0]?.url,
    width: images[0]?.width || 1200,
    height: images[0]?.height || 800,
    uploadDate: post?.dateGmt ? `${post.dateGmt}Z` : new Date().toISOString(),
    description: stripHTML(post?.excerpt || "").substring(0, 160),
    name: post?.title,
    associatedMedia: images.slice(1).map((img, index) => ({
      "@type": "ImageObject",
      contentUrl: img.url,
      width: img.width,
      height: img.height,
      caption: img.caption || `Image ${index + 2}`,
    })),
  };
};

// Generate BreadcrumbList JSON-LD
const generateBreadcrumbJsonLD = (post: any) => {
  const categories = getSafeCategories(post);
  const mainCategory = categories[0];

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteConfig.baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Photos",
        item: `${siteConfig.baseUrl}/photos`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: mainCategory,
        item: `${siteConfig.baseUrl}/category/${mainCategory.toLowerCase()}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: post?.title,
        item: `${siteConfig.baseUrl}${post?.uri}`,
      },
    ],
  };
};

const getAdTargeting = (post: any, tagNames: any) => {
  const safeTags = tagNames;
  const safeCategories = getSafeCategories(post);

  return {
    pos: "article",
    section: [...safeCategories, "photo-gallery"],
    key: [...safeTags, "photos", "gallery", "images"],
    articleId: post.id || "",
    premium: post.isPremium ? "yes" : "no",
    sponsored: post.isSponsored ? "yes" : "no",
    contentType: "photo-gallery",
    imageCount: extractGalleryImages(post?.content || "").length.toString(),
  };
};

const NewsArticlePost = ({
  post,
  posts,
  preview = false,
  relatedPosts = [],
  moreStories = [],
}: ArticleProps) => {
  const router = useRouter();

  if (!router.isFallback && !post?.slug) {
    return <div>Error</div>;
  }

  // Safely extract and process data
  const safeTitle = post?.title || "Photo Gallery";
  const safeUri = post?.uri || "/";
  const fullUrl = `${siteConfig.baseUrl}${safeUri}`;

  // Properly strip HTML from excerpt
  const rawExcerpt = post?.excerpt || "";
  const safeExcerpt = stripHTML(rawExcerpt);
  const metaDescription = safeExcerpt.substring(0, 160);

  // Extract gallery images for structured data
  const galleryImages = extractGalleryImages(
    post?.content || "",
    post?.featuredImage
  );

  // ✅ FIX: Featured image ALWAYS takes priority
  const featuredImageNode = post?.featuredImage?.node;
  const featuredImageUrl = featuredImageNode?.sourceUrl;
  const featuredImageWidth = featuredImageNode?.mediaDetails?.width || 1600;
  const featuredImageHeight = featuredImageNode?.mediaDetails?.height || 1000;

  // Use featured image first, fallback to first gallery image, then site icon
  const safeFeaturedImage =
    featuredImageUrl || galleryImages[0]?.url || siteConfig.iconPath;

  const imageAltText =
    featuredImageNode?.altText || featuredImageNode?.caption || safeTitle;

  // ✅ FIX: Properly handle tags array - filter and map to strings
  const rawTags = getSafeTags(post) || [];
  const safeTags = rawTags
    .filter((tag: any) => tag && typeof tag === "object" && tag.name)
    .map((tag: any) => tag.name);

  const tagsWithSlug =
    post?.tags?.edges?.map((edge: any) => ({
      name: edge?.node?.name,
      slug: edge?.node?.slug,
    })) || [];

  // ✅ FIX: Properly format keywords as string
  const keywordsList = [
    ...safeTags,
    "photo gallery",
    "news photos",
    "image gallery",
    "visual news",
    "photojournalism",
    ...getSafeCategories(post).map((cat: string) => `${cat} photos`),
  ];
  const keywords = keywordsList.join(", ");

  // Ad targeting parameters
  const dfpTargetingParams = getAdTargeting(post, safeTags);

  // Author data
  const authorName = post?.author?.node?.name || "FMT Reporters";
  const authorUrl = `${siteConfig.baseUrl}${post?.author?.node?.uri || "/category/author/fmtreporters/"}`;

  // Dates
  const publishedDate = post?.dateGmt
    ? `${post.dateGmt}Z`
    : new Date().toISOString();
  const modifiedDate = post?.modifiedGmt
    ? `${post.modifiedGmt}Z`
    : publishedDate;

  // Check if premium content
  if (post?.isPremium && !preview) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">
          This is premium content. Please sign in to view this photo gallery.
        </p>
      </div>
    );
  }

  return (
    <>
      <Head>
        {/* Essential Meta Tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="X-UA-Compatible" content="ie=edge" />
        <title>{`${safeTitle} - Photo Gallery | ${siteConfig.siteShortName}`}</title>
        <meta name="description" content={metaDescription} />
        <meta name="keywords" content={keywords} />

        {/* Author and Publication Info */}
        <meta name="author" content={authorName} />
        <meta property="article:author" content={authorUrl} />
        <meta property="article:published_time" content={publishedDate} />
        <meta property="article:modified_time" content={modifiedDate} />
        <meta property="article:section" content="Photos" />

        {/* ✅ FIX: Properly render article tags - no more [object Object] */}
        {safeTags.map((tag: string) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}

        {/* Photo Gallery Specific Meta */}
        <meta name="medium" content="image" />
        <meta name="image_count" content={galleryImages.length.toString()} />
        <meta property="og:type" content="article" />
        <meta property="og:rich_attachment" content="true" />

        {/* Canonical and Alternate URLs */}
        <link rel="canonical" href={fullUrl} />
        <link rel="alternate" hrefLang="x-default" href={fullUrl} />
        <link rel="alternate" hrefLang="en-MY" href={fullUrl} />

        {/* Open Graph Tags */}
        <meta property="og:url" content={fullUrl} />
        <meta property="og:title" content={`${safeTitle} - Photo Gallery`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:site_name" content={siteConfig.siteName} />
        <meta property="og:locale" content="en_MY" />

        {/* ✅ FIX: Featured image ONLY for og:image - always renders */}
        <meta property="og:image" content={safeFeaturedImage} />
        <meta property="og:image:secure_url" content={safeFeaturedImage} />
        <meta
          property="og:image:width"
          content={featuredImageWidth.toString()}
        />
        <meta
          property="og:image:height"
          content={featuredImageHeight.toString()}
        />
        <meta property="og:image:type" content="image/webp" />
        <meta property="og:image:alt" content={imageAltText} />

        {/* Facebook Specific Tags */}
        <meta property="fb:app_id" content="193538481218906" />
        <meta property="fb:pages" content="144916735576536" />
        <meta
          property="article:publisher"
          content="https://www.facebook.com/FreeMalaysiaToday"
        />

        {/* ✅ FIX: Twitter Card - summary_large_image with explicit twitter:image */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fmtoday" />
        <meta name="twitter:creator" content="@fmtoday" />
        <meta name="twitter:url" content={fullUrl} />
        <meta name="twitter:title" content={`${safeTitle} - Photo Gallery`} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={safeFeaturedImage} />
        <meta name="twitter:image:alt" content={imageAltText} />
        <meta name="twitter:domain" content="freemalaysiatoday.com" />

        {/* Pinterest Rich Pins */}
        <meta property="og:see_also" content={fullUrl} />
        <meta name="pinterest:media" content={safeFeaturedImage} />
        <meta name="pinterest:description" content={metaDescription} />

        {/* Additional SEO Meta Tags */}
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <meta
          name="googlebot"
          content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        />
        <meta
          name="bingbot"
          content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        />

        {/* Language and Geo Tags */}
        <meta name="content-language" content="en-MY" />
        <meta name="geo.region" content="MY" />
        <meta name="geo.placename" content="Malaysia" />

        {/* Publisher Information */}
        <meta name="publisher" content={siteConfig.siteName} />
        <meta
          name="copyright"
          content={`© ${new Date().getFullYear()} ${siteConfig.siteName}`}
        />

        {/* Prefetch and Preconnect for Performance */}
        <link rel="dns-prefetch" href="https://media.freemalaysiatoday.com" />
        <link
          rel="preconnect"
          href="https://media.freemalaysiatoday.com"
          crossOrigin="anonymous"
        />

        {/* Preload featured image */}
        {featuredImageUrl && (
          <link
            rel="preload"
            as="image"
            href={featuredImageUrl}
            imageSrcSet={`${featuredImageUrl} 1x`}
            imageSizes="(max-width: 768px) 100vw, 50vw"
          />
        )}

        {/* RSS Feed for Photos */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title={`${siteConfig.siteName} - Photo Galleries`}
          href={`${siteConfig.baseUrl}/feeds/photos.xml`}
        />
      </Head>

      {/* JSON-LD Structured Data */}
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(getWebPageSchema()) }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            generateImageGalleryJsonLD(post, galleryImages)
          ),
        }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            generateMediaObjectJsonLD(galleryImages, post)
          ),
        }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateBreadcrumbJsonLD(post)),
        }}
        type="application/ld+json"
      />

      {/* Existing Layout Components */}
      <GalleryLayout
        post={post}
        safeTitle={safeTitle}
        safeExcerpt={safeExcerpt}
        safeUri={safeUri}
        tagWithSlug={tagsWithSlug}
        relatedPosts={relatedPosts}
        moreStories={moreStories}
        dfpTargetingParams={dfpTargetingParams}
      >
        <PhotoDetail
          content={post?.content}
          additionalFields={{
            categories: post?.categories,
            tags: post?.tags,
          }}
        />
      </GalleryLayout>
    </>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const allPosts = await getAllPostsWithSlug();

    if (!allPosts?.edges) {
      console.warn("No posts found in getStaticPaths");
      return { paths: [], fallback: "blocking" };
    }

    const paths = allPosts.edges
      .filter((edge: any) => edge?.node?.uri)
      .map(({ node }: any) => ({
        params: {
          slug: node.uri.slice(1).split("/").filter(Boolean),
        },
      }));

    return {
      paths,
      fallback: "blocking",
    };
  } catch (error) {
    console.error("Error in getStaticPaths:", error);
    return { paths: [], fallback: "blocking" };
  }
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  try {
    const slug = Array.isArray(params?.slug)
      ? params.slug[params.slug.length - 1]
      : params?.slug;

    if (!slug) {
      return { notFound: true };
    }

    const data = await getPostAndMorePosts(slug, preview, previewData);

    if (!data?.post) {
      return { notFound: true };
    }

    // Fetch related posts and more stories
    const relatedPosts = await getRelatedPosts(slug);
    const moreStories = await getMoreStories(slug);

    return {
      props: {
        preview,
        post: data.post,
        posts:
          data?.posts?.edges?.map((edge: any) => edge?.node).filter(Boolean) ||
          [],
        relatedPosts:
          relatedPosts?.edges?.map((edge: any) => edge?.node).filter(Boolean) ||
          [],
        moreStories:
          moreStories?.edges?.map((edge: any) => edge?.node).filter(Boolean) ||
          [],
      },
      revalidate: REVALIDATION_INTERVAL,
    };
  } catch (error) {
    console.error("Error in getStaticProps:", error);
    return { notFound: true };
  }
};

export default NewsArticlePost;
