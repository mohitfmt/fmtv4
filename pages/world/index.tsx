import { GetServerSideProps } from "next";
import { CustomHomeWorldExcludeVariables } from "@/constants/categories-custom-variables";
import { categoriesNavigation } from "@/constants/categories-navigation";
import {
  CategoryJsonLD,
  CategoryMetadata,
} from "@/components/common/CategoryMetaData";
import { categoriesMetadataConfigs } from "@/constants/categories-meta-config";
import { CategoryPostsLayout } from "@/components/categories-landing-page/CategoryPostsLayout";
import { CategoryLandingProps } from "@/types/global";
import { newsLandingTargetingParams } from "@/constants/ads-targeting-params/news";
import { getFilteredCategoryPosts } from "@/lib/gql-queries/get-filtered-category-posts";

const categoryTitle = "News: World & Southeast Asia";
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
      <CategoryMetadata config={categoriesMetadataConfigs.world} />
      <CategoryJsonLD
        posts={posts}
        pathName="/world"
        title={categoriesMetadataConfigs.world.title}
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

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  // Find current page config
  const currentPage = categoriesNavigation.find(
    (p) => p.path === pathName.replaceAll("/", "")
  );

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
    res.setHeader("Cache-Tag", "page:world,category:world");
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
export default HomeWorld;
