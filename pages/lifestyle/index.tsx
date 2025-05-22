import { GetStaticProps } from "next";
import { CustomHomeLifestyleExcludeVariables } from "@/constants/categories-custom-variables";
import { categoriesNavigation } from "@/constants/categories-navigation";
import {
  CategoryJsonLD,
  CategoryMetadata,
} from "@/components/common/CategoryMetaData";
import { categoriesMetadataConfigs } from "@/constants/categories-meta-config";
import { CategoryPostsLayout } from "@/components/categories-landing-page/CategoryPostsLayout";
import { CategoryLandingProps } from "@/types/global";
import { lifestyleLandingTargetingParams } from "@/constants/ads-targeting-params/lifestyle";
import { getFilteredCategoryPosts } from "@/lib/gql-queries/get-filtered-category-posts";

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
    const variablesTopResponse = {
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
    };
    const variables4Posts = {
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
    };
    const topResponse = await getFilteredCategoryPosts(variablesTopResponse);
    const leisureResponse = await getFilteredCategoryPosts(variables4Posts);

    const combinedPosts = {
      edges: [...topResponse.posts.edges, ...leisureResponse.posts.edges],
    };

    const currentPage = categoriesNavigation.find(
      (p) => p.path === pathName.replaceAll("/", "")
    );

    const initialSubCategoryPosts = await Promise.all(
      (currentPage?.subCategories || []).map(async (category) => {
        const variables = {
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
        const posts = await getFilteredCategoryPosts(variables);

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
