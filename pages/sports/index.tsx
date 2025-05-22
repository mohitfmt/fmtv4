import { GetStaticProps } from "next";
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

export const getStaticProps: GetStaticProps = async () => {
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
export default HomeSports;
