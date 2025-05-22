import { GetStaticProps } from "next";
import { CustomHomeBusinessExcludeVariables } from "@/constants/categories-custom-variables";
import { categoriesNavigation } from "@/constants/categories-navigation";
import {
  CategoryJsonLD,
  CategoryMetadata,
} from "@/components/common/CategoryMetaData";
import { categoriesMetadataConfigs } from "@/constants/categories-meta-config";
import { CategoryPostsLayout } from "@/components/categories-landing-page/CategoryPostsLayout";
import { CategoryLandingProps } from "@/types/global";
import { businessLandingTargetingParams } from "@/constants/ads-targeting-params/business";
import { getFilteredCategoryPosts } from "@/lib/gql-queries/get-filtered-category-posts";

const categoryTitle = "Local & World Business News";
const excludeVariables = CustomHomeBusinessExcludeVariables;
const pathName = "/business";
const terms = "top-business";

const HomeBusiness = ({
  posts,
  currentPage,
  subCategoryPosts,
}: CategoryLandingProps) => {
  return (
    <>
      <CategoryMetadata config={categoriesMetadataConfigs.business} />
      <CategoryJsonLD
        posts={posts}
        pathName="/business"
        title={categoriesMetadataConfigs.business.title}
      />

      <CategoryPostsLayout
        title={categoryTitle}
        posts={posts}
        currentPage={currentPage}
        AdsTargetingParams={businessLandingTargetingParams}
        subCategoryPosts={subCategoryPosts}
        categoryName={terms}
      />
    </>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  try {
    // Initial fetch for main category
    const variablesInitialPosts = {
      first: 5,
      where: {
        offsetPagination: { offset: 0, size: 5 },
        taxQuery: {
          relation: "AND",
          taxArray: [
            {
              field: "SLUG",
              operator: "AND",
              taxonomy: "CATEGORY",
              terms: [`${terms}`],
            },
          ],
        },
      },
    };
    const initialPosts = await getFilteredCategoryPosts(variablesInitialPosts);

    // Find current page config
    const currentPage = categoriesNavigation.find(
      (p) => p.path === pathName.replaceAll("/", "")
    );

    // Fetch initial posts for each subcategory
    const initialSubCategoryPosts = await Promise.all(
      (currentPage?.subCategories || []).map(async (category) => {
        const variables4Posts = {
          first: 6,
          where: {
            offsetPagination: { offset: 0, size: 6 },
            taxQuery: {
              relation: "AND",
              taxArray: [
                {
                  field: "SLUG",
                  operator: "AND",
                  taxonomy: "CATEGORY",
                  terms: [category.slug],
                },
              ],
            },
            excludeQuery: excludeVariables,
          },
        };
        const posts = await getFilteredCategoryPosts(variables4Posts);

        return {
          slug: category.slug,
          posts: {
            edges: posts.posts.edges,
          },
          bigImage: true,
        };
      })
    );

    return {
      props: {
        posts: {
          edges: initialPosts.posts.edges,
        },
        currentPage: currentPage || null,
        subCategoryPosts: initialSubCategoryPosts,
      },
      revalidate: 1500,
    };
  } catch (error) {
    console.error("Error in getStaticProps:", error);
    return {
      props: {
        posts: { edges: [] },
        currentPage: null,
        subCategoryPosts: [],

        error: "Failed to load content",
      },
      revalidate: 110,
    };
  }
};
export default HomeBusiness;
