import { GetServerSideProps } from "next";
import { CustomHomeSportsExcludeVariables } from "@/constants/categories-custom-variables";
import { categoriesNavigation } from "@/constants/categories-navigation";
import {
  CategoryJsonLD,
  CategoryMetadata,
} from "@/components/common/CategoryMetaData";
import { categoriesMetadataConfigs } from "@/constants/categories-meta-config";
import { CategoryPostsLayout } from "@/components/categories-landing-page/CategoryPostsLayout";
import { CategoryLandingProps } from "@/types/global";
import { sportsLandingTargetingParams } from "@/constants/ads-targeting-params/sports";
import { getFilteredCategoryPosts } from "@/lib/gql-queries/get-filtered-category-posts";

const categoryTitle = "Sports";
const excludeVariables = CustomHomeSportsExcludeVariables;
const pathName = "/sports";
const terms = "sports";

const HomeSports = ({
  posts,
  currentPage,
  subCategoryPosts,
}: CategoryLandingProps) => {
  return (
    <>
      <CategoryMetadata config={categoriesMetadataConfigs.sports} />
      <CategoryJsonLD
        posts={posts}
        pathName="/sports"
        title={categoriesMetadataConfigs.sports.title}
      />

      <CategoryPostsLayout
        title={categoryTitle}
        posts={posts}
        currentPage={currentPage}
        AdsTargetingParams={sportsLandingTargetingParams}
        subCategoryPosts={subCategoryPosts}
        categoryName={terms}
      />
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  try {
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
          posts: {
            edges: posts.posts.edges,
          },
          bigImage: true,
        };
      })
    );
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=1500, stale-while-revalidate=3600"
    );
    res.setHeader("Cache-Tag", "page:sports,category:sports");
    return {
      props: {
        posts: {
          edges: initialPosts.posts.edges,
        },
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
export default HomeSports;
