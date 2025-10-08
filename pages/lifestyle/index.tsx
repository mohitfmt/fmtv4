import { GetServerSideProps } from "next";
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

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
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
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=1500, stale-while-revalidate=3600"
    );
    res.setHeader("Cache-Tag", "page:lifestyle,category:lifestyle");
    return {
      props: {
        posts: combinedPosts,
        currentPage: currentPage || null,
        subCategoryPosts: initialSubCategoryPosts,
      },
    };
  } catch (error) {
    console.error("Error in getServerSideProps:", error);
    res.setHeader(
      "Cache-Control",
      "private, no-cache, no-store, must-revalidate"
    );

    return {
      props: {
        posts: { edges: [] },
        currentPage: null,
        subCategoryPosts: [],
        error: "Failed to load content",
      },
    };
  }
};
export default HomeLifestyle;
