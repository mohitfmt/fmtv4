import { GetStaticProps, GetStaticPaths } from "next";
import Head from "next/head";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { PostCardProps } from "@/types/global";
import { GET_FILTERED_CATEGORY } from "@/lib/gql-queries/get-filtered-category";
import AuthorLayout from "@/components/author-page/AuthorLayout";
import { GET_AUTHOR } from "@/lib/gql-queries/get-user";

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
  const domainUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "https://www.freemalaysiatoday.com/"
  ).replace(/\/$/, "");

  const fullUrl = `${domainUrl}/category/author/${author.slug}`;
  const description =
    author.description ||
    `Latest articles by ${author.name} on Free Malaysia Today`;

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
      // Person
      {
        "@type": "Person",
        "@id": fullUrl,
        name: author.name,
        description: author.description,
        url: fullUrl,
        image: author.avatar?.url,
        worksFor: {
          "@type": "Organization",
          name: "Free Malaysia Today",
          url: domainUrl,
        },
      },
    ],
  };

  return (
    <>
      <Head>
        <title>{`${author.name} | Free Malaysia Today (FMT)`}</title>
        <meta name="description" content={description} />
        <meta
          name="keywords"
          content={`${author.name}, author, news, articles, insights`}
        />
        <link rel="canonical" href={fullUrl} />
        <meta
          name="robots"
          content="index, follow, max-snippet:350, max-image-preview:large, max-video-preview:-1"
        />
        <meta
          property="og:title"
          content={`${author.name} | Free Malaysia Today (FMT)`}
        />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={fullUrl} />
        <meta property="og:site_name" content="Free Malaysia Today" />
        <meta property="og:locale" content="en_MY" />
        <meta
          property="profile:first_name"
          content={author.name.split(" ")[0]}
        />
        <meta
          property="profile:last_name"
          content={author.name.split(" ").slice(1).join(" ")}
        />
        <meta name="twitter:card" content="summary" />
        <meta
          name="twitter:title"
          content={`${author.name} | Free Malaysia Today`}
        />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:site" content="@fmtoday" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
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
  // For catch-all routes, params.slug will be an array
  const slugArray = params?.slug;
  if (!slugArray || !Array.isArray(slugArray) || slugArray.length === 0) {
    return { notFound: true };
  }

  // Get the last segment of the slug array
  const authorSlug = slugArray[slugArray.length - 1];

  try {
    const userData = await gqlFetchAPI(GET_AUTHOR, {
      variables: {
        userId: authorSlug,
        idType: "SLUG",
      },
    });

    if (!userData?.user) {
      return { notFound: true };
    }

    const postsData = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
      variables: {
        first: 24,
        where: {
          author: userData.user.databaseId,
        },
      },
    });

    return {
      props: {
        author: userData.user,
        posts: postsData.posts,
      },
      revalidate: 360,
    };
  } catch (error) {
    console.error("Error in getStaticProps:", error);
    return { notFound: true };
  }
};
