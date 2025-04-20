import { GetStaticProps, GetStaticPaths } from "next";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { GET_FILTERED_CATEGORY } from "@/lib/gql-queries/get-filtered-category";
import { SubCategoryPostLayout } from "@/components/categories-landing-page/subcategories-landing-page/SubCategoryPageLayout";
import { PostCardProps } from "@/types/global";
import {
  CategoryJsonLD,
  CategoryMetadata,
} from "@/components/common/CategoryMetaData";
import { seoSubCategories } from "@/constants/sub-categories-meta-config";
import siteConfig from "@/constants/site-config";
// import { useVisibilityRefresh } from "@/hooks/useVisibilityRefresh";

interface Props {
  subcategorySlug: string;
  posts: {
    edges: Array<{
      node: PostCardProps;
    }>;
  };
  category: string;
}

interface SeoConfig {
  h1Title: string;
  metaTitle: string;
  description: string;
  keywords: string[];
}

type SeoSubCategoriesType = Record<string, SeoConfig>;

const SubCategoryPage = ({ subcategorySlug, category, posts }: Props) => {
  // useVisibilityRefresh();
  const AdsTargetingParams = {
    pos: "listing",
    section: [`${subcategorySlug}-landing-page`, "landing-page"],
    key: [
      `${subcategorySlug}`,
      "Free Malaysia Today",
      "Malaysia News",
      "Latest Malaysia News",
      "Breaking News Malaysia",
      "Malaysia Politics News",
      "gambling",
      "religion",
      "alcohol",
      "lgbt",
      "sex",
      "drug abuse",
      "get rich",
      "match-making",
      "dating",
      "lottery",
    ],
  };

  const DEFAULT_SEO_CONFIG: SeoConfig = {
    h1Title: "Malaysia News",
    metaTitle: "Malaysia News",
    description: "Latest news and updates from Malaysia",
    keywords: ["Malaysia", "News", "Free Malaysia Today"],
  };

  const typedSeoSubCategories = seoSubCategories as SeoSubCategoriesType;
  // const seoData = typedSeoSubCategories[subcategorySlug];

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

    // Log for debugging that we're using a fallback
    console.log(
      `[SUBSEO] Using SEO fallback for subcategory: ${subcategorySlug}`
    );
  }

  const pathName = `/category/category/${category}/${subcategorySlug}`;

  const metadataConfig = {
    title: `${seoData?.metaTitle || subcategorySlug} | Free Malaysia Today (FMT)`,
    description:
      seoData?.description || `Latest ${subcategorySlug} news from Malaysia`,
    keywords: seoData?.keywords || ["Malaysia", "News", subcategorySlug],
    category,
    pathName,
    imageAlt: siteConfig.siteName,
  };

  return (
    <>
      <CategoryMetadata config={metadataConfig} />
      <CategoryJsonLD
        posts={posts}
        pathName={pathName}
        title={metadataConfig.title}
      />

      <SubCategoryPostLayout
        title={seoData.h1Title || subcategorySlug}
        posts={posts}
        categorySlug={subcategorySlug}
        AdsTargetingParams={AdsTargetingParams}
      />
    </>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  // Generate paths for all subcategories
  return {
    paths: [],
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const subcategorySlug = params?.subcategorySlug as string;
  const category = params?.categorySlug as string;

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

    const response = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
      variables: {
        first: 25,
        where: {
          taxQuery,
        },
      },
    });

    // Get subcategory title from navigation

    return {
      props: {
        subcategorySlug,
        category,
        title: subcategorySlug,
        posts: response.posts,
      },
      revalidate: 60,
    };
  } catch (error) {
    console.error("Error fetching posts:", error);
    return {
      props: {
        subcategorySlug,
        category,
        posts: { edges: [] },
      },
      revalidate: 10,
    };
  }
};

export default SubCategoryPage;
