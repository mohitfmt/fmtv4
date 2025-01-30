// pages/category/category/[categorySlug]/index.tsx
import { GetStaticProps, GetStaticPaths } from "next";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { GET_FILTERED_CATEGORY } from "@/lib/gql-queries/get-filtered-category";
import { SubCategoryPostLayout } from "@/components/categories-landing-page/subcategories-landing-page/SubCategoryPageLayout";
import { PostCardProps } from "@/types/global";
import { seoSubCategories } from "@/constants/sub-categories-meta-config";
import {
  CategoryJsonLD,
  CategoryMetadata,
} from "@/components/common/CategoryMetaData";

interface Props {
  categorySlug: string;
  posts: {
    edges: Array<{
      node: PostCardProps;
    }>;
  };
}

interface SeoConfig {
  h1Title: string;
  metaTitle: string;
  description: string;
  keywords: string[];
}

type SeoSubCategoriesType = Record<string, SeoConfig>;

const CategoryPage = ({ categorySlug, posts }: Props) => {
  // Create AdsTargetingParams

  const AdsTargetingParams = {
    pos: "listing",
    section: [`${categorySlug}-landing-page`, "landing-page"],
    key: [],
  };

  const typedSeoSubCategories = seoSubCategories as SeoSubCategoriesType;
  const seoData = typedSeoSubCategories[categorySlug];

  const pathName = `/category/category/${categorySlug}`;

  const metadataConfig = {
    title: `${seoData?.metaTitle} | Free Malaysia Today (FMT)` || `FMT`,
    description: seoData?.description,
    keywords: seoData?.keywords,
    category: categorySlug,
    pathName,
  };

  // Find current page from categoriesNavigation

  return (
    <>
      <CategoryMetadata config={metadataConfig} />
      <CategoryJsonLD
        posts={posts}
        pathName={pathName}
        title={categorySlug}
      />
      <SubCategoryPostLayout
        title={seoData?.h1Title || categorySlug}
        posts={posts}
        categorySlug={categorySlug}
        AdsTargetingParams={AdsTargetingParams}
      />
    </>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const categorySlug = params?.categorySlug as string;

  try {
    // Build the tax query for the category
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

    // Fetch exactly 3 posts using gqlFetchAPI
    const response = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
      variables: {
        first: 25,
        where: {
          taxQuery,
        },
      },
    });

    return {
      props: {
        categorySlug,
        posts: response.posts,
      },
      revalidate: 300,
    };
  } catch (error) {
    console.error("Error fetching posts:", error);
    return {
      props: {
        categorySlug,
        posts: { edges: [] },
      },
      revalidate: 60,
    };
  }
};

export default CategoryPage;
