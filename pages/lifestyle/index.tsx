import { GetStaticProps } from "next";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { CustomHomeLifestyleExcludeVariables } from "@/constants/categories-custom-variables";
import { categoriesNavigation } from "@/constants/categories-navigation";
import {
  CategoryJsonLD,
  CategoryMetadata,
} from "@/components/common/CategoryMetaData";
import { categoriesMetadataConfigs } from "@/constants/categories-meta-config";
import { GET_FILTERED_CATEGORY } from "@/lib/gql-queries/get-filtered-category";
import { CategoryPostsLayout } from "@/components/categories-landing-page/CategoryPostsLayout";
import { CategoryLandingProps } from "@/types/global";
import { lifestyleLandingTargetingParams } from "@/constants/ads-targeting-params/lifestyle";

const categoryTitle = "Lifestyle";
const excludeVariables = CustomHomeLifestyleExcludeVariables;
const pathName = "/lifestyle";
const terms = "leisure";

const HomeLifestyle = ({
  posts,
  currentPage,
  subCategoryPosts,
}: CategoryLandingProps) => {
  return (
    <>
      <CategoryMetadata config={categoriesMetadataConfigs.lifestyle} />
      <CategoryJsonLD
        posts={posts}
        pathName="/lifestyle"
        title={categoriesMetadataConfigs.lifestyle.title}
      />

      <CategoryPostsLayout
        title={categoryTitle}
        posts={posts}
        currentPage={currentPage}
        AdsTargetingParams={lifestyleLandingTargetingParams}
        subCategoryPosts={subCategoryPosts}
        categoryName={terms}
      />
    </>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  try {
    // Get top-lifestyle post
    const topResponse = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
      variables: {
        first: 1,
        where: {
          taxQuery: {
            relation: "AND",
            taxArray: [
              {
                field: "SLUG",
                operator: "AND",
                taxonomy: "CATEGORY",
                terms: ["top-lifestyle"],
              },
            ],
          },
        },
      },
    });

    // Get leisure posts excluding top-lifestyle
    const leisureResponse = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
      variables: {
        first: 4,
        where: {
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
          excludeQuery: [
            {
              first: 1,
              status: "PUBLISH",
              taxQuery: {
                relation: "AND",
                taxArray: [
                  {
                    field: "SLUG",
                    operator: "AND",
                    taxonomy: "CATEGORY",
                    terms: ["top-lifestyle"],
                  },
                ],
              },
            },
          ],
        },
      },
    });

    const combinedPosts = {
      edges: [...topResponse.posts.edges, ...leisureResponse.posts.edges],
    };

    const currentPage = categoriesNavigation.find(
      (p) => p.path === pathName.replaceAll("/", "")
    );

    const initialSubCategoryPosts = await Promise.all(
      (currentPage?.subCategories || []).map(async (category) => {
        const posts = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
          variables: {
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
          },
        });

        return {
          slug: category.slug,
          posts: { edges: posts.posts.edges },
          bigImage: true,
        };
      })
    );

    return {
      props: {
        posts: combinedPosts,
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
export default HomeLifestyle;
