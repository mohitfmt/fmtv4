import { GetStaticProps, GetStaticPaths } from "next";
import TagLayout from "@/components/tags-page/TagLayout";
import { getTag } from "@/lib/gql-queries/get-tag";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { PostCardProps, Tag } from "@/types/global";
import Head from "next/head";
import siteConfig from "@/constants/site-config";
import { fbPageIds } from "@/constants/social";
import { defaultAlternateLocale } from "@/constants/alternate-locales";
import { getFilteredCategoryPosts } from "@/lib/gql-queries/get-filtered-category-posts";
import { getWebPageSchema } from "@/constants/jsonlds/shared-schemas";
import { getAuthorCredentials } from "@/constants/author-credentials";

interface TagNode {
  uri: string;
  slug: string;
  count: number;
  description: string;
}

interface TagPageProps {
  tag: Tag;
  posts: {
    edges: Array<{
      node: PostCardProps;
    }>;
  };
}

export default function TagPage({ tag, posts }: TagPageProps) {
  const domainUrl = siteConfig.baseUrl;
  const fullUrl = `${domainUrl}/category/tag/${tag.slug}`;
  const description = `Latest ${tag.name} news and updates from Free Malaysia Today. Browse ${tag.count}+ articles about ${tag.name}. Stay informed with our comprehensive coverage of ${tag.name}-related topics.`;

  // ✅ Get first post for featured image (better than logo for social sharing)
  const firstPost = posts?.edges?.[0]?.node;
  const featuredImageUrl =
    firstPost?.featuredImage?.node?.sourceUrl || siteConfig.iconPath;

  // ✅ Standard social media image dimensions
  const imageWidth = 1600;
  const imageHeight = 1000;
  const imageAlt = firstPost?.title || `${tag.name} - Free Malaysia Today`;

  // ✅ Enhanced JSON-LD with author credentials
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
            name: "Tags",
            item: `${domainUrl}/category/tag`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: tag.name,
            item: fullUrl,
          },
        ],
      },

      // Enhanced Collection Page
      {
        "@type": "CollectionPage",
        "@id": fullUrl,
        url: fullUrl,
        name: `${tag.name} - Latest News & Updates`,
        description: description,
        inLanguage: "en-MY",
        isPartOf: {
          "@type": "WebSite",
          "@id": `${domainUrl}#website`,
        },
        about: {
          "@type": "Thing",
          name: tag.name,
          description: `News and articles about ${tag.name}`,
        },
        numberOfItems: tag.count,
        publisher: {
          "@type": "NewsMediaOrganization",
          "@id": `${domainUrl}#organization`,
          name: "Free Malaysia Today",
        },
      },

      // Enhanced ItemList with author E-E-A-T
      {
        "@type": "ItemList",
        "@id": `${fullUrl}#itemlist`,
        url: fullUrl,
        numberOfItems: posts.edges.length,
        itemListElement: posts.edges.map(({ node }, index) => {
          // ✅ Get author credentials for E-E-A-T
          const authorSlug = node?.author?.node?.slug;
          const authorCredentials = authorSlug
            ? getAuthorCredentials(authorSlug)
            : null;

          return {
            "@type": "ListItem",
            position: index + 1,
            item: {
              "@type": "NewsArticle",
              "@id": `${domainUrl}${node.uri}`,
              url: `${domainUrl}${node.uri}`,
              headline: node.title,
              image: {
                "@type": "ImageObject",
                url:
                  node.featuredImage?.node?.sourceUrl ||
                  `${domainUrl}/icon-512x512.png`,
              },
              datePublished: node?.dateGmt ? `${node.dateGmt}Z` : undefined,

              // ✅ Enhanced Author with E-E-A-T
              author: {
                "@type": "Person",
                name: node.author?.node?.name || "FMT Reporters",
                url: `${domainUrl}${node.author?.node?.uri || "/category/author/fmt-reporters"}`,
                // ✅ Add job title if available
                ...(authorCredentials?.jobTitle && {
                  jobTitle: authorCredentials.jobTitle,
                }),
                // ✅ Add social profiles if available
                ...(authorCredentials?.sameAs &&
                  authorCredentials.sameAs.length > 0 && {
                    sameAs: authorCredentials.sameAs,
                  }),
                worksFor: {
                  "@type": "NewsMediaOrganization",
                  "@id": `${domainUrl}#organization`,
                  name: "Free Malaysia Today",
                },
              },

              publisher: {
                "@type": "NewsMediaOrganization",
                "@id": `${domainUrl}#organization`,
                name: "Free Malaysia Today",
                url: domainUrl,
                logo: {
                  "@type": "ImageObject",
                  url: `${domainUrl}/icon-512x512.png`,
                },
              },
            },
          };
        }),
      },

      // WebPage
      {
        "@type": "WebPage",
        "@id": `${fullUrl}#webpage`,
        url: fullUrl,
        name: `${tag.name} - Free Malaysia Today`,
        description: description,
        inLanguage: "en-MY",
        isPartOf: {
          "@type": "WebSite",
          "@id": `${domainUrl}#website`,
        },
        breadcrumb: {
          "@id": `${fullUrl}#breadcrumb`,
        },
      },
    ],
  };

  return (
    <>
      <Head>
        {/* Essential Meta Tags */}
        <title>{`${tag.name.replace(/\b\w/g, (c) => c.toUpperCase())} News (${tag.count}+ Articles) | Free Malaysia Today`}</title>
        <meta name="description" content={description} />
        <meta
          name="keywords"
          content={`${tag.name}, ${tag.name} news, malaysia ${tag.name}, ${tag.name} updates, fmt news`}
        />

        {/* Canonical URL */}
        <link rel="canonical" href={fullUrl} />
        <link rel="alternate" hrefLang="x-default" href={fullUrl} />
        <link rel="alternate" hrefLang="en-MY" href={fullUrl} />

        {/* RSS Feeds */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title={`${tag.name} - RSS Feed`}
          href={`${domainUrl}/feeds/rss/${tag.slug.replace(/^\/|\/$/g, "")}`}
        />
        <link
          rel="alternate"
          type="application/atom+xml"
          title={`${tag.name} - Atom Feed`}
          href={`${domainUrl}/feeds/atom/${tag.slug.replace(/^\/|\/$/g, "")}`}
        />
        <link
          rel="alternate"
          type="application/feed+json"
          title={`${tag.name} - JSON Feed`}
          href={`${domainUrl}/feeds/json/${tag.slug.replace(/^\/|\/$/g, "")}`}
        />

        {/* ✅ Performance Hints */}
        <link rel="preconnect" href="https://media.freemalaysiatoday.com" />
        <link rel="dns-prefetch" href="https://media.freemalaysiatoday.com" />
        {firstPost?.featuredImage?.node?.sourceUrl && (
          <link rel="preload" as="image" href={featuredImageUrl} />
        )}

        {/* ✅ Facebook Meta Tags */}
        <meta property="fb:app_id" content="193538481218906" />
        {fbPageIds.map((id) => (
          <meta key={id} property="fb:pages" content={id} />
        ))}

        {/* Open Graph Tags */}
        <meta
          property="og:title"
          content={`${tag.name} - Latest News & Updates | Free Malaysia Today`}
        />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={fullUrl} />
        <meta property="og:site_name" content="Free Malaysia Today" />
        <meta property="og:locale" content="en_MY" />
        {defaultAlternateLocale?.map((locale: any) => (
          <meta key={locale} property="og:locale:alternate" content={locale} />
        ))}

        {/* ✅ Enhanced: Use first post image instead of logo */}
        <meta property="og:image" content={featuredImageUrl} />
        <meta property="og:image:secure_url" content={featuredImageUrl} />
        <meta property="og:image:width" content={imageWidth.toString()} />
        <meta property="og:image:height" content={imageHeight.toString()} />
        <meta property="og:image:type" content="image/webp" />
        <meta property="og:image:alt" content={imageAlt} />

        {/* Publisher */}
        <meta
          property="article:publisher"
          content="https://www.facebook.com/FreeMalaysiaToday"
        />

        {/* ✅ Enhanced: Twitter Large Image Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fmtoday" />
        <meta name="twitter:creator" content="@fmtoday" />
        <meta
          name="twitter:title"
          content={`${tag.name} - Latest News & Updates`}
        />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={featuredImageUrl} />
        <meta name="twitter:image:alt" content={imageAlt} />
        <meta name="twitter:domain" content="freemalaysiatoday.com" />
        <meta name="twitter:url" content={fullUrl} />

        {/* Additional SEO Meta Tags */}
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <meta
          name="googlebot"
          content="index, follow, max-image-preview:large, max-snippet:-1"
        />
        <meta name="author" content="Free Malaysia Today" />
        <meta name="publisher" content="Free Malaysia Today" />

        {/* Pinterest */}
        <meta name="pinterest:media" content={featuredImageUrl} />
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

      <TagLayout
        title={tag.name}
        posts={posts}
        tagId={tag.databaseId.toString()}
      />
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const tagsData = await gqlFetchAPI(
      `query GetAllTagsWithUri {
        tags(first: 100) {
          edges {
            node {
              id
              databaseId
              uri
              slug
            }
          }
        }
      }`
    );

    if (!tagsData?.tags?.edges) {
      console.warn("No tags found in getStaticPaths");
      return { paths: [], fallback: "blocking" };
    }

    const paths = tagsData.tags.edges
      .filter((edge: { node: TagNode }) => !!edge?.node?.uri)
      .map(({ node }: { node: TagNode }) => ({
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

export const getStaticProps: GetStaticProps<TagPageProps> = async ({
  params,
}) => {
  const slug = params?.slug;
  const tagSlug = Array.isArray(slug) ? slug[0] : slug;

  if (!tagSlug) {
    return { notFound: true };
  }

  try {
    const tagData = await getTag(tagSlug);

    if (!tagData?.tag) {
      return { notFound: true };
    }

    const variables = {
      first: 24,
      where: {
        taxQuery: {
          taxArray: [
            {
              taxonomy: "TAG",
              field: "SLUG",
              terms: [tagSlug],
              operator: "IN",
            },
          ],
          relation: "AND",
        },
        status: "PUBLISH",
      },
    };
    const postsData = await getFilteredCategoryPosts(variables);

    return {
      props: {
        tag: tagData.tag,
        posts: postsData.posts,
      },
      revalidate: 300, // 5 minutes
    };
  } catch (error) {
    console.error("Error fetching tag or posts:", error);
    return { notFound: true };
  }
};
