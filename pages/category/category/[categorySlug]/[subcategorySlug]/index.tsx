// pages/category/category/[categorySlug]/[subcategorySlug]/index.tsx

import { GetStaticProps, GetStaticPaths } from "next";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { SubCategoryPostLayout } from "@/components/categories-landing-page/subcategories-landing-page/SubCategoryPageLayout";
import { PostCardProps } from "@/types/global";
import {
  CategoryJsonLD,
  CategoryMetadata,
} from "@/components/common/CategoryMetaData";
import { seoSubCategories } from "@/constants/sub-categories-meta-config";
import siteConfig from "@/constants/site-config";
import { getFilteredCategoryPosts } from "@/lib/gql-queries/get-filtered-category-posts";
import { getRedirectUrl } from "@/constants/canonical-url-mappings";
import ErrorPage from "next/error";

interface Props {
  subcategorySlug: string;
  posts: {
    edges: Array<{
      node: PostCardProps;
    }>;
  };
  category: string;
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

// Helper function to calculate revalidation time based on content age and type
const getRevalidationTime = (
  lastModified?: string,
  category?: string
): number => {
  // High-priority categories get more frequent updates
  const highPriorityCategories = ["nation", "bahasa", "business", "world"];
  const isHighPriority = highPriorityCategories.includes(category || "");

  if (!lastModified) {
    return isHighPriority ? 300 : 600; // 5 or 10 minutes default
  }

  const age = Date.now() - new Date(lastModified).getTime();
  const hours = age / (1000 * 60 * 60);

  if (hours < 24) {
    return isHighPriority ? 300 : 600; // 5-10 minutes for fresh content
  }
  if (hours < 168) {
    return isHighPriority ? 900 : 1200; // 15-20 minutes for week-old
  }
  return 1800; // 30 minutes for older content
};

const SubCategoryPage = ({
  subcategorySlug,
  category,
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

  // Enhanced AdsTargetingParams
  const AdsTargetingParams = {
    pos: "listing",
    section: [
      `${subcategorySlug}-landing-page`,
      `${category}-subcategory`,
      "subcategory-page",
      "landing-page",
    ],
    key: [
      subcategorySlug,
      category,
      "Free Malaysia Today",
      `${subcategorySlug} news`,
      `${category} ${subcategorySlug}`,
      "Malaysia News",
      "FMT",
    ].slice(0, 10), // Limit keywords for performance
  };

  const DEFAULT_SEO_CONFIG: SeoConfig = {
    h1Title: `${subcategorySlug.charAt(0).toUpperCase() + subcategorySlug.slice(1)} News`,
    metaTitle: `${subcategorySlug.charAt(0).toUpperCase() + subcategorySlug.slice(1)} News`,
    description: `Latest ${subcategorySlug} news and updates from Malaysia. Stay informed with breaking stories and in-depth coverage from Free Malaysia Today.`,
    keywords: [
      subcategorySlug,
      `${subcategorySlug} news`,
      "Malaysia",
      "News",
      "Free Malaysia Today",
      category,
      `${category} news`,
    ],
  };

  const typedSeoSubCategories = seoSubCategories as SeoSubCategoriesType;

  // Get SEO data with fallback
  let seoData: SeoConfig;

  if (typedSeoSubCategories[subcategorySlug]) {
    // Direct match found
    seoData = typedSeoSubCategories[subcategorySlug];
  } else {
    // Try to find a match with normalized slug
    const normalizedSlug = subcategorySlug.replace(/-/g, "").toLowerCase();
    const matchedKey = Object.keys(typedSeoSubCategories).find(
      (key) => key.replace(/-/g, "").toLowerCase() === normalizedSlug
    );

    seoData = matchedKey
      ? typedSeoSubCategories[matchedKey]
      : DEFAULT_SEO_CONFIG;

    // Log for monitoring (not visible to users)
    if (!matchedKey) {
      console.log(`Using SEO fallback for subcategory: ${subcategorySlug}`);
    }
  }

  const pathName = subcategorySlug;
  const fullPathName = `/category/category/${category}/${subcategorySlug}`;

  const metadataConfig = {
    title: `${seoData?.metaTitle || subcategorySlug} | Free Malaysia Today (FMT)`,
    description: seoData?.description || DEFAULT_SEO_CONFIG.description,
    keywords: seoData?.keywords || DEFAULT_SEO_CONFIG.keywords,
    category,
    fullPathName,
    pathName,
    imageAlt: `${subcategorySlug} - ${siteConfig.siteName}`,
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
        category={`${category}/${subcategorySlug}`}
        articleCount={totalCount}
      />

      {/* Main Content with Semantic HTML */}
      <main
        role="main"
        aria-label={`${subcategorySlug} news articles in ${category} category`}
      >
        <article>
          <header>
            {/* Breadcrumb Navigation */}
            <nav aria-label="Breadcrumb" className="breadcrumb">
              <ol
                itemScope
                itemType="https://schema.org/BreadcrumbList"
                className="flex items-center space-x-2 text-sm"
              >
                <li
                  itemProp="itemListElement"
                  itemScope
                  itemType="https://schema.org/ListItem"
                >
                  <a itemProp="item" href="/" className="hover:underline">
                    <span itemProp="name" className="uppercase">
                      Home
                    </span>
                  </a>
                  <meta itemProp="position" content="1" />
                </li>
                <li className="mx-2">/</li>
                <li
                  itemProp="itemListElement"
                  itemScope
                  itemType="https://schema.org/ListItem"
                >
                  <a
                    itemProp="item"
                    href={`/category/category/${category}`}
                    className="hover:underline"
                  >
                    <span itemProp="name" className="uppercase">
                      {category === "leisure" ? "lifestyle" : category}
                    </span>
                  </a>
                  <meta itemProp="position" content="2" />
                </li>
                <li className="mx-2">/</li>
                <li
                  itemProp="itemListElement"
                  itemScope
                  itemType="https://schema.org/ListItem"
                  className="font-semibold"
                >
                  <span itemProp="name" className="uppercase">
                    {seoData.h1Title || subcategorySlug}
                  </span>
                  <meta itemProp="position" content="3" />
                </li>
              </ol>
            </nav>

            <h1 id="subcategory-title" className="sr-only">
              {seoData.h1Title || subcategorySlug}
            </h1>
          </header>

          {/* Article Feed */}
          <section
            aria-labelledby="subcategory-title"
            className="subcategory-content"
          >
            <div
              role="feed"
              aria-busy={router.isFallback ? "true" : "false"}
              aria-label={`${subcategorySlug} articles feed`}
            >
              <SubCategoryPostLayout
                title={seoData.h1Title || subcategorySlug}
                posts={posts}
                categorySlug={subcategorySlug}
                AdsTargetingParams={AdsTargetingParams}
              />
            </div>
          </section>
        </article>

        {/* Related Subcategories Navigation */}
        <aside
          role="complementary"
          aria-label="Related subcategories"
          className="sr-only"
        >
          <h2>Explore More</h2>
          <nav>
            <ul>
              <li>
                <a href={`/category/category/${category}`}>All {category}</a>
              </li>
              <li>
                <a href="/news">Latest News</a>
              </li>
              <li>
                <a href="/business">Business</a>
              </li>
              <li>
                <a href="/sports">Sports</a>
              </li>
            </ul>
          </nav>
        </aside>
      </main>

      {/* Prefetch parent category for better navigation */}
      <link rel="prefetch" href={`/category/category/${category}`} />
      <link rel="prefetch" href={`/${category}`} />
    </>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  // Pre-generate paths for known subcategories with their parent categories
  const knownSubcategories = [
    { category: "nation", subcategory: "sabahsarawak" },
    { category: "bahasa", subcategory: "tempatan" },
    { category: "bahasa", subcategory: "pandangan" },
    { category: "bahasa", subcategory: "dunia" },
    { category: "business", subcategory: "local-business" },
    { category: "business", subcategory: "world-business" },
    { category: "leisure", subcategory: "food" },
    { category: "leisure", subcategory: "entertainment" },
    { category: "leisure", subcategory: "health" },
    { category: "leisure", subcategory: "money" },
    { category: "leisure", subcategory: "travel" },
    { category: "leisure", subcategory: "tech" },
    { category: "leisure", subcategory: "pets" },
    { category: "leisure", subcategory: "automotive" },
    { category: "leisure", subcategory: "property" },
    { category: "leisure", subcategory: "simple-stories" },
    { category: "opinion", subcategory: "editorial" },
    { category: "opinion", subcategory: "column" },
    { category: "opinion", subcategory: "letters" },
    { category: "opinion", subcategory: "fmt-worldviews" },
    { category: "sports", subcategory: "football" },
    { category: "sports", subcategory: "badminton" },
    { category: "sports", subcategory: "motorsports" },
    { category: "sports", subcategory: "tennis" },
    { category: "world", subcategory: "south-east-asia" },
  ];

  const paths = knownSubcategories.map(({ category, subcategory }) => ({
    params: {
      categorySlug: category,
      subcategorySlug: subcategory,
    },
  }));

  return {
    paths,
    fallback: "blocking", // Generate new paths on-demand
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const subcategorySlug = params?.subcategorySlug as string;
  const category = params?.categorySlug as string;

  // Check if this URL should redirect to canonical
  const currentPath = `/category/category/${category}/${subcategorySlug}`;
  const redirectUrl = getRedirectUrl(currentPath);

  try {
    const taxQuery = {
      relation: "AND",
      taxArray: [
        {
          field: "SLUG",
          operator: "AND",
          taxonomy: "CATEGORY",
          terms: [subcategorySlug],
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

    // Get the most recent post date for cache control
    const lastModified =
      response?.posts?.edges?.[0]?.node?.modifiedGmt ||
      response?.posts?.edges?.[0]?.node?.dateGmt;

    const totalCount = response?.posts?.edges?.length || 0;

    return {
      props: {
        subcategorySlug,
        category,
        title: subcategorySlug,
        posts: response?.posts || { edges: [] },
        totalCount,
        lastModified: lastModified || null,
        shouldRedirect: redirectUrl,
      },
      revalidate: getRevalidationTime(lastModified, category),
    };
  } catch (error) {
    console.error(
      `Error fetching subcategory ${category}/${subcategorySlug}:`,
      error
    );

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      // Try to redirect to parent category
      console.log(`Subcategory not found, redirecting to parent: ${category}`);

      return {
        redirect: {
          destination: `/category/category/${category}`,
          permanent: false,
        },
      };
    }

    // Other errors - return error state
    return {
      props: {
        subcategorySlug,
        category,
        posts: { edges: [] },
        isError: true,
      },
      revalidate: 60, // Quick retry on errors
    };
  }
};

export default SubCategoryPage;
