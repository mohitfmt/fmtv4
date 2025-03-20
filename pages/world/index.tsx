import { GetStaticProps } from "next";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { CustomHomeWorldExcludeVariables } from "@/constants/categories-custom-variables";
import { categoriesNavigation } from "@/constants/categories-navigation";
import {
  CategoryJsonLD,
  CategoryMetadata,
} from "@/components/common/CategoryMetaData";
import { categoriesMetadataConfigs } from "@/constants/categories-meta-config";
import { GET_FILTERED_CATEGORY } from "@/lib/gql-queries/get-filtered-category";
import { CategoryPostsLayout } from "@/components/categories-landing-page/CategoryPostsLayout";
import { CategoryLandingProps } from "@/types/global";
import { newsLandingTargetingParams } from "@/constants/ads-targeting-params/news";

const categoryTitle = "News: World & South East Asia";
const excludeVariables = CustomHomeWorldExcludeVariables;
const pathName = "/world";
const terms = "world";

const HomeWorld = ({
  posts,
  currentPage,
  subCategoryPosts,
}: CategoryLandingProps) => {
  return (
    <>
      <CategoryMetadata config={categoriesMetadataConfigs.news} />
      <CategoryJsonLD
        posts={posts}
        pathName="/news"
        title={categoriesMetadataConfigs.news.title}
      />

      <CategoryPostsLayout
        title={categoryTitle}
        posts={posts}
        currentPage={currentPage}
        AdsTargetingParams={newsLandingTargetingParams}
        subCategoryPosts={subCategoryPosts}
        categoryName={terms}
      />
    </>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  // Find current page config
  const currentPage = categoriesNavigation.find(
    (p) => p.path === pathName.replaceAll("/", "")
  );

  try {
    // Initial fetch for main category
    const initialPosts = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
      variables: {
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
      },
    });

    // Fetch initial posts for each subcategory
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
      revalidate: 10,
    };
  }
};
export default HomeWorld;
