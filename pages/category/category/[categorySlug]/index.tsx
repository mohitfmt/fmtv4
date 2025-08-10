// pages/category/category/[categorySlug]/index.tsx

import { GetStaticProps, GetStaticPaths } from "next";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { SubCategoryPostLayout } from "@/components/categories-landing-page/subcategories-landing-page/SubCategoryPageLayout";
import { PostCardProps } from "@/types/global";
import { seoSubCategories } from "@/constants/sub-categories-meta-config";
import {
  CategoryJsonLD,
  CategoryMetadata,
} from "@/components/common/CategoryMetaData";
import siteConfig from "@/constants/site-config";
import { getFilteredCategoryPosts } from "@/lib/gql-queries/get-filtered-category-posts";
import { getRedirectUrl } from "@/constants/canonical-url-mappings";
import ErrorPage from "next/error";
import Link from "next/link";

interface Props {
  categorySlug: string;
  posts: {
    edges: Array<{
      node: PostCardProps;
    }>;
  };
  totalCount?: number;
  lastModified?: string;
  shouldRedirect?: string;
  isError?: boolean;
}

interface SeoConfig {
  h1Title: string;
  metaTitle: string;
  description: string;
  keywords: string[];
}

type SeoSubCategoriesType = Record<string, SeoConfig>;

// Helper function to calculate revalidation time based on content age
const getRevalidationTime = (lastModified?: string): number => {
  if (!lastModified) return 600; // 10 minutes default

  const age = Date.now() - new Date(lastModified).getTime();
  const hours = age / (1000 * 60 * 60);

  if (hours < 24) return 300; // 5 minutes for fresh content
  if (hours < 168) return 900; // 15 minutes for week-old content
  return 1800; // 30 minutes for older content
};

const CategoryPage = ({
  categorySlug,
  posts,
  totalCount,
  lastModified,
  shouldRedirect,
  isError,
}: Props) => {
  const router = useRouter();

  // Handle client-side redirect for non-canonical URLs
  useEffect(() => {
    if (shouldRedirect && typeof window !== "undefined") {
      router.replace(shouldRedirect, undefined, { shallow: true });
    }
  }, [shouldRedirect, router]);

  // Handle error state
  if (isError) {
    return <ErrorPage statusCode={404} />;
  }

  // Create AdsTargetingParams with enhanced keywords
  const AdsTargetingParams = {
    pos: "listing",
    section: [`${categorySlug}-landing-page`, "landing-page", "category"],
    key: [
      categorySlug,
      "Free Malaysia Today",
      "Malaysia News",
      `${categorySlug} news`,
      `latest ${categorySlug}`,
      "FMT",
    ].slice(0, 10), // Limit keywords
  };

  const typedSeoSubCategories = seoSubCategories as SeoSubCategoriesType;
  const seoData = typedSeoSubCategories[categorySlug];

  const pathName = `${categorySlug}`;
  const fullPathName = `/category/category/${categorySlug}`;

  const metadataConfig = {
    title: `${seoData?.metaTitle ?? categorySlug} | Free Malaysia Today (FMT)`,
    description:
      seoData?.description ||
      `Stay updated with the latest ${categorySlug} news, breaking stories, and in-depth analysis from Malaysia's trusted news source.`,
    keywords: seoData?.keywords || [
      categorySlug,
      "Malaysia",
      "News",
      "Free Malaysia Today",
      `${categorySlug} news`,
      `latest ${categorySlug}`,
      "breaking news",
      "Malaysia news",
    ],
    category: categorySlug,
    fullPathName,
    pathName,
    imageAlt: `${categorySlug} - ${siteConfig.siteName}`,
    articleCount: totalCount,
    lastModified: lastModified,
  };

  return (
    <>
      {/* SEO Meta Tags */}
      <CategoryMetadata config={metadataConfig} />

      {/* Structured Data */}
      <CategoryJsonLD
        posts={posts}
        pathName={fullPathName}
        title={metadataConfig.title}
        description={metadataConfig.description}
        category={categorySlug}
        articleCount={totalCount}
      />

      {/* Main Content with Semantic HTML */}
      <main role="main" aria-label={`${categorySlug} news articles`}>
        <section aria-labelledby="category-title" className="category-content">
          <header>
            <h1 id="category-title" className="sr-only">
              {seoData?.h1Title || categorySlug}
            </h1>
          </header>

          {/* Article Feed */}
          <div
            role="feed"
            aria-busy={router.isFallback ? "true" : "false"}
            aria-label={`${categorySlug} articles feed`}
          >
            <SubCategoryPostLayout
              title={seoData?.h1Title || categorySlug}
              posts={posts}
              categorySlug={categorySlug}
              AdsTargetingParams={AdsTargetingParams}
            />
          </div>
        </section>

        {/* Navigation hints for screen readers */}
        <nav aria-label="Category navigation" className="sr-only">
          <h2>Related Categories</h2>
          <ul>
            <li>
              <Link href="/news">News</Link>
            </li>
            <li>
              <Link href="/business">Business</Link>
            </li>
            <li>
              <Link href="/sports">Sports</Link>
            </li>
            <li>
              <Link href="/lifestyle">Lifestyle</Link>
            </li>
            <li>
              <Link href="/opinion">Opinion</Link>
            </li>
          </ul>
        </nav>
      </main>

      {/* Prefetch related categories for better performance */}
      <link rel="prefetch" href="/news" />
      <link rel="prefetch" href="/business" />
      <link rel="prefetch" href="/sports" />
    </>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  // Pre-generate paths for known categories
  const knownCategories = [
    "nation",
    "bahasa",
    "business",
    "leisure",
    "opinion",
    "sports",
    "world",
    "sabahsarawak",
    "south-east-asia",
    "tempatan",
    "pandangan",
    "dunia",
    "local-business",
    "world-business",
    "editorial",
    "column",
    "letters",
    "fmt-worldviews",
    "football",
    "badminton",
    "motorsports",
    "tennis",
    "education",
    "food",
    "entertainment",
    "health",
    "money",
    "travel",
    "tech",
    "pets",
    "automotive",
    "property",
    "simple-stories",
  ];

  const paths = knownCategories.map((slug) => ({
    params: { categorySlug: slug },
  }));

  return {
    paths,
    fallback: "blocking", // Generate new paths on-demand
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const categorySlug = params?.categorySlug as string;

  // Check if this URL should redirect to canonical
  const currentPath = `/category/category/${categorySlug}`;
  const redirectUrl = getRedirectUrl(currentPath);

  try {
    // Build the query with status check
    const taxQuery = {
      relation: "AND",
      taxArray: [
        {
          field: "SLUG",
          operator: "AND",
          taxonomy: "CATEGORY",
          terms: [categorySlug],
        },
      ],
    };

    const variables = {
      first: 25,
      where: {
        taxQuery,
        // Only get published posts
        status: "PUBLISH",
      },
    };

    const response = await getFilteredCategoryPosts(variables);

    // Check if we have valid posts
    if (!response?.posts?.edges || response.posts.edges.length === 0) {
      // Category exists but has no posts - still valid
      console.log(`Category ${categorySlug} has no posts yet`);
    }

    // Get the most recent post date for cache control
    const lastModified =
      response?.posts?.edges?.[0]?.node?.modifiedGmt ||
      response?.posts?.edges?.[0]?.node?.dateGmt;

    const totalCount = response?.posts?.edges?.length || 0;

    return {
      props: {
        categorySlug,
        posts: response?.posts || { edges: [] },
        totalCount,
        lastModified: lastModified || null,
        shouldRedirect: redirectUrl,
      },
      revalidate: getRevalidationTime(lastModified),
    };
  } catch (error) {
    console.error(`Error fetching category ${categorySlug}:`, error);

    // Check if it's a 404 or actual error
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      // Category doesn't exist - return 404
      return {
        notFound: true,
        revalidate: 60, // Check again in 1 minute
      };
    }

    // Other errors - return error state but still render
    return {
      props: {
        categorySlug,
        posts: { edges: [] },
        isError: true,
      },
      revalidate: 60, // Quick retry on errors
    };
  }
};

export default CategoryPage;
