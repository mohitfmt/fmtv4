import { GetStaticProps } from "next";
import Head from "next/head";
import { PostCardProps } from "@/types/global";
import PhotoGrid from "@/components/gallery/PhotoGrid";
import AdSlot from "@/components/common/AdSlot";
import { gerneralTargetingKeys } from "@/constants/ads-targeting-params/general";
import { getFilteredCategoryPosts } from "@/lib/gql-queries/get-filtered-category-posts";
import siteConfig from "@/constants/site-config";
import { getWebPageSchema } from "@/constants/jsonlds/shared-schemas";

interface Props {
  posts: {
    edges: Array<{
      node: PostCardProps;
    }>;
  };
}

const dfpTargetingParams = {
  pos: "listing",
  section: ["photo gallery"],
  key: [
    "Photos",
    "Fmt-photos",
    "Gallery",
    "Fmt-Gallery",
    ...gerneralTargetingKeys,
  ],
};

const PhotosPage = ({ posts }: Props) => {
  const pageTitle = "Photo Gallery | Free Malaysia Today (FMT)";
  const pageDescription =
    "Special feature of latest news photos and images selected by photographers and journalists from Free Malaysia Today (FMT).";
  const fullUrl = `${siteConfig.baseUrl}/photos`;

  // Extract featured image from first post, fallback to FMT logo
  const firstPost = posts?.edges?.[0]?.node;
  const featuredImageUrl =
    firstPost?.featuredImage?.node?.sourceUrl || siteConfig.iconPath;
  const featuredImageAlt =
    firstPost?.title || "FMT Photo Gallery - Malaysian News Photography";

  // Generate CollectionPage JSON-LD
  const collectionPageSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${fullUrl}#collection`,
    url: fullUrl,
    name: pageTitle,
    description: pageDescription,
    inLanguage: "en-MY",
    isPartOf: {
      "@type": "WebSite",
      "@id": `${siteConfig.baseUrl}#website`,
      url: siteConfig.baseUrl,
      name: siteConfig.siteName,
    },
    about: {
      "@type": "Thing",
      name: "News Photography",
      description:
        "Professional photojournalism covering Malaysian news and events",
    },
    publisher: {
      "@type": "NewsMediaOrganization",
      "@id": `${siteConfig.baseUrl}#organization`,
      name: siteConfig.siteName,
      url: siteConfig.baseUrl,
      logo: {
        "@type": "ImageObject",
        url: siteConfig.iconPath,
      },
      sameAs: [
        "https://www.facebook.com/FreeMalaysiaToday",
        "https://twitter.com/fmtoday",
      ],
    },
  };

  // Generate ItemList JSON-LD for photo galleries
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${fullUrl}#itemlist`,
    url: fullUrl,
    name: "FMT Photo Galleries",
    description: pageDescription,
    numberOfItems: posts?.edges?.length || 0,
    itemListElement: posts?.edges?.slice(0, 10).map((edge, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "ImageGallery",
        "@id": `${siteConfig.baseUrl}${edge.node.uri}#gallery`,
        url: `${siteConfig.baseUrl}${edge.node.uri}`,
        name: edge.node.title,
        image: edge.node.featuredImage?.node?.sourceUrl,
        datePublished: edge.node.date,
      },
    })),
  };

  // Generate BreadcrumbList JSON-LD
  const breadcrumbSchema = {
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
        item: fullUrl,
      },
    ],
  };

  return (
    <>
      <Head>
        {/* Primary Meta Tags */}
        <title>{pageTitle}</title>
        <meta name="title" content={pageTitle} />
        <meta name="description" content={pageDescription} />
        <meta
          name="keywords"
          content="FMT photos, Malaysia news photos, photo gallery, photojournalism, Malaysian photography, news images, FMT gallery"
        />
        <link rel="canonical" href={fullUrl} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={fullUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:site_name" content={siteConfig.siteName} />
        <meta property="og:locale" content="en_MY" />

        {/* Featured Image for Social Sharing */}
        <meta property="og:image" content={featuredImageUrl} />
        <meta property="og:image:secure_url" content={featuredImageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={featuredImageAlt} />

        {/* Facebook Specific */}
        <meta property="fb:pages" content="144916735576536" />
        <meta property="fb:app_id" content="1234567890" />
        <meta
          property="article:publisher"
          content="https://www.facebook.com/FreeMalaysiaToday"
        />
        <meta property="article:section" content="Photos" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fmtoday" />
        <meta name="twitter:creator" content="@fmtoday" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={featuredImageUrl} />
        <meta name="twitter:image:alt" content={featuredImageAlt} />
        <meta name="twitter:url" content={fullUrl} />
        <meta name="twitter:domain" content="freemalaysiatoday.com" />

        {/* Pinterest */}
        <meta name="pinterest:media" content={featuredImageUrl} />
        <meta name="pinterest:description" content={pageDescription} />

        {/* Additional SEO Meta Tags */}
        <meta
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1"
        />
        <meta
          name="googlebot"
          content="index, follow, max-image-preview:large, max-snippet:-1"
        />
        <meta
          name="bingbot"
          content="index, follow, max-image-preview:large, max-snippet:-1"
        />

        {/* Language and Geo Tags */}
        <meta httpEquiv="content-language" content="en-MY" />
        <meta name="geo.region" content="MY" />
        <meta name="geo.placename" content="Malaysia" />
        <meta name="content-language" content="en-MY" />

        {/* Performance Optimization */}
        <link rel="dns-prefetch" href="https://media.freemalaysiatoday.com" />
        <link
          rel="preconnect"
          href="https://media.freemalaysiatoday.com"
          crossOrigin="anonymous"
        />

        {/* Preload hero image if available */}
        {firstPost?.featuredImage?.node?.sourceUrl && (
          <link
            rel="preload"
            as="image"
            href={firstPost.featuredImage.node.sourceUrl}
            imageSrcSet={`${firstPost.featuredImage.node.sourceUrl}?w=640 640w, ${firstPost.featuredImage.node.sourceUrl}?w=940 940w`}
            imageSizes="(max-width: 640px) 100vw, 940px"
          />
        )}

        {/* Publisher Information */}
        <meta name="author" content={siteConfig.siteName} />
        <meta name="publisher" content={siteConfig.siteName} />
        <meta
          name="copyright"
          content={`© ${new Date().getFullYear()} ${siteConfig.siteName}`}
        />

        {/* Rating and Distribution */}
        <meta name="rating" content="general" />
        <meta name="distribution" content="global" />
      </Head>

      {/* JSON-LD Structured Data */}
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getWebPageSchema()),
        }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionPageSchema),
        }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemListSchema),
        }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
        type="application/ld+json"
      />

      <div className="pt-2 pb-4">
        <PhotoGrid
          initialPosts={posts}
          adsTargetingParams={dfpTargetingParams}
        />
      </div>
      {/* Pixel Ad */}
      <AdSlot
        id="div-gpt-ad-1661362827551-0"
        name="Pixel"
        targetingParams={dfpTargetingParams}
        sizes={[1, 1]}
        additionalStyle={{
          position: "absolute",
          top: 0,
          left: 0,
          backgroundColor: "var(--muted)",
          height: 0,
        }}
      />

      {/* OutOfPage Ad */}
      {/* <AdSlot
        id="div-gpt-ad-1661362765847-0"
        name="OutOfPage"
        sizes={[1, 1]}
        outOfPage={true}
        targetingParams={dfpTargetingParams}
        additionalStyle={{
          position: "absolute",
          top: 0,
          left: 0,
          backgroundColor: "var(--muted)",
          height: 0,
        }}
      /> */}
    </>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  try {
    const variables = {
      first: 12,
      where: {
        status: "PUBLISH",
        taxQuery: {
          relation: "AND",
          taxArray: [
            {
              field: "SLUG",
              operator: "AND",
              taxonomy: "CATEGORY",
              terms: ["photos"],
            },
          ],
        },
      },
    };
    const response = await getFilteredCategoryPosts(variables);

    return {
      props: {
        posts: response.posts,
      },
      revalidate: 300,
    };
  } catch (error) {
    console.error("Error fetching posts:", error);
    return {
      props: {
        posts: { edges: [] },
      },
      revalidate: 110,
    };
  }
};

export default PhotosPage;
