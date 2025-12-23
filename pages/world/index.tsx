import { GetStaticProps } from "next";
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

export const getStaticProps: GetStaticProps = async () => {
  try {
    const variablesInitialPosts = {
      first: 5,
      where: {
        offsetPagination: { offset: 0, size: 5 },
        status: "PUBLISH",
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

    // ✅ DEFENSIVE: Fetch initial posts for each subcategory with error handling
    const initialSubCategoryPosts = await Promise.all(
      (currentPage?.subCategories || []).map(async (category) => {
        try {
          const variables = {
            first: 6,
            where: {
              offsetPagination: { offset: 0, size: 6 },
              status: "PUBLISH",
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

          // ✅ DEFENSIVE: Validate data structure before accessing
          if (!posts || !posts.posts || !Array.isArray(posts.posts.edges)) {
            console.warn(
              `[${pathName}] Subcategory "${category.slug}" returned invalid data structure:`,
              {
                hasPost: !!posts,
                hasPosts: !!posts?.posts,
                edgesType: typeof posts?.posts?.edges,
              }
            );

            return {
              slug: category.slug,
              posts: { edges: [] },
              bigImage: true,
            };
          }

          return {
            slug: category.slug,
            posts: {
              edges: posts.posts.edges,
            },
            bigImage: true,
          };
        } catch (error) {
          console.error(
            `[${pathName}] Failed to fetch subcategory "${category.slug}":`,
            error
          );

          return {
            slug: category.slug,
            posts: { edges: [] },
            bigImage: true,
          };
        }
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
export default HomeWorld;
