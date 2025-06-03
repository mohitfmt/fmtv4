import { GetStaticProps, GetStaticPaths } from "next";
import Head from "next/head";
import { PostCardProps } from "@/types/global";
import AuthorLayout from "@/components/author-page/AuthorLayout";
import { getAuthor } from "@/lib/gql-queries/get-user";
import siteConfig from "@/constants/site-config";
import { defaultAlternateLocale } from "@/constants/alternate-locales";
import { WebPageJsonLD } from "@/constants/jsonlds/org";
import { getFilteredCategoryPosts } from "@/lib/gql-queries/get-filtered-category-posts";

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
        name: author?.name,
        description: description,
        url: fullUrl,
        image: author?.avatar?.url,
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
        <title>{`${author?.name ?? "Author"} | Free Malaysia Today (FMT)`}</title>
        <meta name="description" content={description} />
        <meta
          name="keywords"
          content={`${author?.name}, author, news, articles, insights`}
        />
        <link rel="canonical" href={`${fullUrl.replace("/", "")}`} />
        <link
          rel="alternate"
          hrefLang="x-default"
          href={`${fullUrl.replace(/^\/|\/$/g, "")}`}
        />
        {/* <link
          rel="alternate"
          type="application/atom+xml"
          title="Atom Feed"
          href={`${domainUrl}/feeds/atom/${author?.slug.replace(/^\/|\/$/g, "")}`}
        />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="RSS Feed"
          href={`${siteConfig.baseUrl}/feeds/rss/${author?.slug.replace(/^\/|\/$/g, "")}`}
        />
        <link
          rel="alternate"
          type="application/feed+json"
          title="JSON Feed"
          href={`${siteConfig.baseUrl}/feeds/json/${author?.slug.replace(/^\/|\/$/g, "")}`}
        /> */}
        <meta
          property="og:title"
          content={`${author?.name ?? "Author"} | Free Malaysia Today (FMT)`}
        />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={fullUrl} />
        <meta property="og:site_name" content="Free Malaysia Today" />
        <meta property="og:locale" content="en_MY" />
        {defaultAlternateLocale?.map((locale: any) => (
          <meta key={locale} property="og:locale:alternate" content={locale} />
        ))}
        <meta
          property="profile:first_name"
          content={author.name.split(" ")[0]}
        />
        <meta
          property="profile:last_name"
          content={author.name.split(" ").slice(1).join(" ")}
        />
        <meta property="profile:username" content={author?.name} />
        <meta name="twitter:card" content="summary" />
        <meta
          name="twitter:title"
          content={`${author?.name} | Free Malaysia Today`}
        />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:site" content="@fmtoday" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          async
          // defer
        />
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WebPageJsonLD) }}
          type="application/ld+json"
          async
          // defer
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
