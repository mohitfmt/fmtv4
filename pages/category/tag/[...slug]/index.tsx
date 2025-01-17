import { GetStaticProps, GetStaticPaths } from "next";
import TagLayout from "@/components/tags-page/TagLayout";
import { GET_FILTERED_CATEGORY } from "@/lib/gql-queries/get-filtered-category";
import { GET_TAG } from "@/lib/gql-queries/get-tag";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { PostCardProps, Tag } from "@/types/global";
import Head from "next/head";
import { stripHTML } from "@/lib/utils";

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
  const domainUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "https://www.freemalaysiatoday.com/"
  ).replace(/\/$/, "");

  const fullUrl = `${domainUrl}/tag/${tag.slug}`;
  const description = `Latest ${tag.name} news and updates from Free Malaysia Today. Browse ${tag.count}+ articles about ${tag.name}. Stay informed with our comprehensive coverage of ${tag.name}-related topics.`;

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      // Breadcrumbs
      {
        "@type": "BreadcrumbList",
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
            item: `${domainUrl}/category/tag/${tag.slug}`,
          },
        ],
      },
      // Collection Page
      {
        "@type": "CollectionPage",
        "@id": fullUrl,
        name: `${tag.name} News & Articles`,
        description: stripHTML(tag?.description || ""),
        url: fullUrl,
        numberOfItems: tag?.count,
        publisher: {
          "@type": "Organization",
          name: "Free Malaysia Today",
          url: domainUrl,
        },
      },
      // ItemList for articles
      {
        "@type": "ItemList",
        itemListElement: posts.edges.map(({ node }, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Article",
            headline: node.title,
            url: `${domainUrl}/${node.slug}`,
            datePublished: `${node.dateGmt}Z`,
            author: {
              "@type": "Person",
              name: node.author?.node?.name || "FMT Reporters",
              url: `${domainUrl}/${node.author?.node?.slug}`,
            },
            image: node.featuredImage?.node?.sourceUrl || "",
            publisher: {
              "@type": "Organization",
              name: "Free Malaysia Today",
              url: domainUrl,
            },
          },
        })),
      },
    ],
  };

  return (
    <>
      <Head>
        <title>{`${tag.name} News (${tag.count}+ Articles) | Free Malaysia Today`}</title>
        <meta name="description" content={description} />
        <meta
          name="keywords"
          content={`${tag.name}, ${tag.name} news, malaysia ${tag.name}, ${tag.name} updates, fmt news`}
        />

        {/* Canonical URL */}
        <link rel="canonical" href={fullUrl} />

        {/* Robots */}
        <meta
          name="robots"
          content="index, follow, max-snippet:350, max-image-preview:large, max-video-preview:-1"
        />

        {/* Open Graph */}
        <meta
          property="og:title"
          content={`${tag.name} - Latest News & Updates | Free Malaysia Today`}
        />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={fullUrl} />
        <meta property="og:site_name" content="Free Malaysia Today" />
        <meta property="og:locale" content="en_MY" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta
          name="twitter:title"
          content={`${tag.name} News & Updates | FMT`}
        />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:site" content="@fmtoday" />

        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
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
        tags(first: 15) {
          edges {
            node {
              id
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
  // Ensure params exists and slug is either a string or array
  const slug = params?.slug;
  const tagSlug = Array.isArray(slug) ? slug[0] : slug;

  if (!tagSlug) {
    return { notFound: true };
  }

  try {
    // Fetch tag data
    const tagData = await gqlFetchAPI(GET_TAG, {
      variables: {
        tagId: tagSlug,
        idType: "SLUG",
      },
    });

    if (!tagData?.tag) {
      return { notFound: true };
    }

    // Modify the posts query to use taxQuery for filtering by tag
    const postsData = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
      variables: {
        first: 24, // Increased to ensure we have enough posts
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
      },
    });

    return {
      props: {
        tag: tagData.tag,
        posts: postsData.posts,
      },
      revalidate: 300,
    };
  } catch (error) {
    console.error("Error fetching data:", error);
    return { notFound: true };
  }
};
