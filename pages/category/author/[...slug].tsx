import { GetStaticProps, GetStaticPaths } from "next";
import Head from "next/head";
import { PostCardProps } from "@/types/global";
import AuthorLayout from "@/components/author-page/AuthorLayout";
import { getAuthor } from "@/lib/gql-queries/get-user";
import siteConfig from "@/constants/site-config";
import { defaultAlternateLocale } from "@/constants/alternate-locales";
import { getFilteredCategoryPosts } from "@/lib/gql-queries/get-filtered-category-posts";
import { getWebPageSchema } from "@/constants/jsonlds/shared-schemas";
import { fbPageIds } from "@/constants/social";
import { getAuthorCredentials } from "@/constants/author-credentials"; // ✅ NEW

interface Author {
  name: string;
  description: string;
  slug: string;
  databaseId: number;
  avatar: {
    url: string;
  };
}

interface AuthorPageProps {
  author: Author;
  posts: {
    edges: Array<{
      node: PostCardProps;
    }>;
    pageInfo: {
      endCursor: string;
    };
  };
}

export default function AuthorPage({ author, posts }: AuthorPageProps) {
  const domainUrl = siteConfig.baseUrl;
  const fullUrl = `${domainUrl}/category/author/${author.slug}`;

  // ✅ Get author credentials for E-E-A-T
  const credentials = getAuthorCredentials(author.slug);

  // Enhanced description with credentials
  const description =
    author.description ||
    credentials?.bio ||
    `${author.name}${credentials?.jobTitle ? `, ${credentials.jobTitle}` : ""} - Latest articles and insights on Free Malaysia Today. ${
      credentials?.postCount
        ? `${credentials.postCount.toLocaleString()} articles published.`
        : ""
    }`;

  // ✅ Author image with intelligent fallback (like tag page)
  const firstPost = posts?.edges?.[0]?.node;
  const authorImage =
    author?.avatar?.url ||
    firstPost?.featuredImage?.node?.sourceUrl ||
    siteConfig.iconPath;

  // ✅ Image dimensions with proper handling
  const imageWidth = 400;
  const imageHeight = 400;
  const imageAlt = `${author.name}${credentials?.jobTitle ? ` - ${credentials.jobTitle}` : ""} | Free Malaysia Today`;

  // Meta title with credentials
  const metaTitle = `${author.name}${
    credentials?.jobTitle ? ` - ${credentials.jobTitle}` : ""
  } | Articles & Insights | ${siteConfig.siteShortName}`;

  // Keywords
  const keywords = `${author.name}, ${credentials?.jobTitle || "journalist"}, FMT, Free Malaysia Today, Malaysian news, ${author.name} articles`;

  // ✅ Calculate topics covered from recent posts
  const getTopicsCovered = () => {
    const tags = new Set<string>();
    posts.edges.slice(0, 10).forEach(({ node }) => {
      node.tags?.edges?.forEach(({ node: tag }: any) => {
        if (tag?.name) tags.add(tag.name);
      });
    });
    return Array.from(tags).slice(0, 5);
  };

  const topicsCovered = getTopicsCovered();

  // ✅ Enhanced JSON-LD with E-E-A-T
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      // Breadcrumbs
      {
        "@type": "BreadcrumbList",
        "@id": `${fullUrl}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: domainUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Authors",
            item: `${domainUrl}/category/author`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: author.name,
            item: fullUrl,
          },
        ],
      },

      // ✅ Enhanced Person Schema with E-E-A-T
      {
        "@type": "Person",
        "@id": `${fullUrl}#person`,
        name: author.name,
        url: fullUrl,
        description: description,

        // ✅ E-E-A-T Enhancement from credentials
        ...(credentials?.jobTitle && { jobTitle: credentials.jobTitle }),
        ...(credentials?.sameAs &&
          credentials.sameAs.length > 0 && {
            sameAs: credentials.sameAs,
          }),
        ...(credentials?.email && { email: credentials.email }),

        // Image as ImageObject
        image: {
          "@type": "ImageObject",
          url: authorImage,
          width: imageWidth,
          height: imageHeight,
          caption: imageAlt,
        },

        // Name components (if available from credentials)
        ...(credentials?.firstName && { givenName: credentials.firstName }),
        ...(credentials?.lastName && { familyName: credentials.lastName }),

        // Professional affiliation
        worksFor: {
          "@type": "NewsMediaOrganization",
          "@id": `${domainUrl}#organization`,
          name: "Free Malaysia Today",
          url: domainUrl,
          sameAs: [
            "https://www.facebook.com/FreeMalaysiaToday",
            "https://twitter.com/fmtoday",
            "https://www.linkedin.com/company/free-malaysia-today",
          ],
        },

        // ✅ Topics of expertise
        ...(topicsCovered.length > 0 && {
          knowsAbout: topicsCovered,
        }),

        // Main entity of page
        mainEntityOfPage: {
          "@type": "ProfilePage",
          "@id": `${fullUrl}#profilepage`,
        },
      },

      // ✅ ProfilePage Schema
      {
        "@type": "ProfilePage",
        "@id": `${fullUrl}#profilepage`,
        url: fullUrl,
        name: `${author.name} - Author Profile`,
        description: description,
        inLanguage: "en-MY",
        mainEntity: {
          "@id": `${fullUrl}#person`,
        },
        breadcrumb: {
          "@id": `${fullUrl}#breadcrumb`,
        },
        isPartOf: {
          "@type": "WebSite",
          "@id": `${domainUrl}#website`,
        },
        publisher: {
          "@type": "NewsMediaOrganization",
          "@id": `${domainUrl}#organization`,
        },
      },

      // ✅ ItemList of author's articles with E-E-A-T
      {
        "@type": "ItemList",
        "@id": `${fullUrl}#itemlist`,
        url: fullUrl,
        numberOfItems: posts.edges.length,
        itemListElement: posts.edges.slice(0, 10).map(({ node }, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "NewsArticle",
            "@id": `${domainUrl}${node.uri}`,
            headline: node.title,
            url: `${domainUrl}${node.uri}`,
            datePublished: node.dateGmt ? `${node.dateGmt}Z` : undefined,
            // ✅ Image with conditional mediaDetails (like category pages)
            image: node.featuredImage?.node
              ? {
                  "@type": "ImageObject",
                  url:
                    node.featuredImage?.node?.sourceUrl ||
                    `${domainUrl}/icon-512x512.png`,
                }
              : {
                  "@type": "ImageObject",
                  url: siteConfig.iconPath,
                },
            author: {
              "@id": `${fullUrl}#person`,
            },
            publisher: {
              "@type": "NewsMediaOrganization",
              "@id": `${domainUrl}#organization`,
            },
          },
        })),
      },

      // WebPage
      {
        "@type": "WebPage",
        "@id": `${fullUrl}#webpage`,
        url: fullUrl,
        name: metaTitle,
        description: description,
        inLanguage: "en-MY",
        isPartOf: {
          "@type": "WebSite",
          "@id": `${domainUrl}#website`,
        },
        about: {
          "@id": `${fullUrl}#person`,
        },
        breadcrumb: {
          "@id": `${fullUrl}#breadcrumb`,
        },
        publisher: {
          "@type": "NewsMediaOrganization",
          "@id": `${domainUrl}#organization`,
        },
      },
    ],
  };

  return (
    <>
      <Head>
        {/* Essential Meta Tags */}
        <title>{metaTitle}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />

        {/* Author Information */}
        <meta name="author" content={author.name} />
        <link rel="author" href={fullUrl} />

        {/* ✅ If has LinkedIn - powerful E-E-A-T signal */}
        {credentials?.hasLinkedIn && (
          <link
            rel="me"
            href={
              credentials.sameAs.find((url) => url.includes("linkedin")) || ""
            }
          />
        )}

        {/* Canonical and Alternate URLs */}
        <link rel="canonical" href={fullUrl} />
        <link rel="alternate" hrefLang="x-default" href={fullUrl} />
        <link rel="alternate" hrefLang="en-MY" href={fullUrl} />

        {/* ✅ RSS Feeds for Author */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title={`${author.name} - RSS Feed`}
          href={`${siteConfig.baseUrl}/feeds/rss/author/${author.slug}`}
        />
        <link
          rel="alternate"
          type="application/atom+xml"
          title={`${author.name} - Atom Feed`}
          href={`${siteConfig.baseUrl}/feeds/atom/author/${author.slug}`}
        />
        <link
          rel="alternate"
          type="application/feed+json"
          title={`${author.name} - JSON Feed`}
          href={`${siteConfig.baseUrl}/feeds/json/author/${author.slug}`}
        />

        {/* ✅ Performance Hints */}
        <link rel="preconnect" href="https://media.freemalaysiatoday.com" />
        <link rel="dns-prefetch" href="https://media.freemalaysiatoday.com" />
        {authorImage && <link rel="preload" as="image" href={authorImage} />}

        {/* ✅ Facebook Meta Tags */}
        <meta property="fb:app_id" content="193538481218906" />
        {fbPageIds.map((id) => (
          <meta key={id} property="fb:pages" content={id} />
        ))}

        {/* Open Graph Tags - Profile Type */}
        <meta property="og:type" content="profile" />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={fullUrl} />
        <meta property="og:site_name" content="Free Malaysia Today" />
        <meta property="og:locale" content="en_MY" />
        {defaultAlternateLocale?.map((locale: any) => (
          <meta key={locale} property="og:locale:alternate" content={locale} />
        ))}

        {/* ✅ Author Image */}
        <meta property="og:image" content={authorImage} />
        <meta property="og:image:secure_url" content={authorImage} />
        <meta property="og:image:width" content={imageWidth.toString()} />
        <meta property="og:image:height" content={imageHeight.toString()} />
        <meta property="og:image:type" content="image/webp" />
        <meta property="og:image:alt" content={imageAlt} />

        {/* ✅ Profile-specific Open Graph */}
        {credentials?.firstName && (
          <meta property="profile:first_name" content={credentials.firstName} />
        )}
        {credentials?.lastName && (
          <meta property="profile:last_name" content={credentials.lastName} />
        )}
        <meta property="profile:username" content={author.slug} />

        {/* Publisher Info */}
        <meta
          property="article:publisher"
          content="https://www.facebook.com/FreeMalaysiaToday"
        />

        {/* ✅ Twitter Card Tags - Large Image */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fmtoday" />
        <meta name="twitter:creator" content="@fmtoday" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={authorImage} />
        <meta name="twitter:image:alt" content={imageAlt} />
        <meta name="twitter:domain" content="freemalaysiatoday.com" />
        <meta name="twitter:url" content={fullUrl} />

        {/* ✅ If author has Twitter */}
        {credentials?.hasTwitter && (
          <meta
            name="twitter:creator"
            content={
              credentials.sameAs
                .find((url) => url.includes("twitter") || url.includes("x.com"))
                ?.replace("https://twitter.com/", "@")
                .replace("https://x.com/", "@") || "@fmtoday"
            }
          />
        )}

        {/* Additional SEO Meta Tags */}
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <meta
          name="googlebot"
          content="index, follow, max-image-preview:large, max-snippet:-1"
        />
        <meta name="publisher" content="Free Malaysia Today" />
        <meta
          name="copyright"
          content={`© ${new Date().getFullYear()} Free Malaysia Today`}
        />

        {/* Pinterest */}
        <meta name="pinterest:media" content={authorImage} />
        <meta name="pinterest:description" content={description} />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(getWebPageSchema()),
          }}
        />
      </Head>

      <AuthorLayout author={author} posts={posts} />
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    return {
      paths: [],
      fallback: "blocking",
    };
  } catch (error) {
    console.error("Error in getStaticPaths:", error);
    return { paths: [], fallback: "blocking" };
  }
};

export const getStaticProps: GetStaticProps<AuthorPageProps> = async ({
  params,
}) => {
  const slugArray = params?.slug;
  if (!slugArray || !Array.isArray(slugArray) || slugArray.length === 0) {
    return { notFound: true };
  }

  const authorSlug = slugArray[slugArray.length - 1];

  try {
    const userData = await getAuthor({ userId: authorSlug, idType: "SLUG" });

    if (!userData?.user) {
      return { notFound: true };
    }

    const variables = {
      first: 24,
      where: {
        author: userData.user.databaseId,
        status: "PUBLISH",
      },
    };
    const postsData = await getFilteredCategoryPosts(variables);

    return {
      props: {
        author: userData.user,
        posts: postsData.posts,
      },
      revalidate: 1500,
    };
  } catch (error) {
    console.error("Error in getStaticProps:", error);
    return { notFound: true };
  }
};
