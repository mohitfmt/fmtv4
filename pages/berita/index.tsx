import { GetStaticProps } from "next";
import { categoriesNavigation } from "@/constants/categories-navigation";
import {
  CategoryJsonLD,
  CategoryMetadata,
} from "@/components/common/CategoryMetaData";
import { categoriesMetadataConfigs } from "@/constants/categories-meta-config";
import { CategoryPostsLayout } from "@/components/categories-landing-page/CategoryPostsLayout";
import { CategoryLandingProps } from "@/types/global";
import { CustomHomeBeritaExcludeVariables } from "@/constants/categories-custom-variables";
import { beritaLandingTargetingParams } from "@/constants/ads-targeting-params/berita";
import { getFilteredCategoryPosts } from "@/lib/gql-queries/get-filtered-category-posts";

const categoryTitle = "Berita Malaysia & Dunia Terkini";
const excludeVariables = CustomHomeBeritaExcludeVariables;
const pathName = "/berita";
const terms = "top-bm";

const HomeBerita = ({
  posts,
  currentPage,
  subCategoryPosts,
}: CategoryLandingProps) => {
  return (
    <>
      <CategoryMetadata config={categoriesMetadataConfigs.berita} />
      <CategoryJsonLD
        posts={posts}
        pathName="/berita"
        title={categoriesMetadataConfigs.business.title}
      />

      <CategoryPostsLayout
        title={categoryTitle}
        posts={posts}
        currentPage={currentPage}
        AdsTargetingParams={beritaLandingTargetingParams}
        subCategoryPosts={subCategoryPosts}
        categoryName={terms}
      />
    </>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  try {
    // Get super-bm post
    const variables = {
      first: 1,
      where: {
        taxQuery: {
          relation: "AND",
          taxArray: [
            {
              field: "SLUG",
              operator: "AND",
              taxonomy: "CATEGORY",
              terms: ["super-bm"],
            },
          ],
        },
      },
    };

    const variablesTopResponse = {
      first: 4,
      where: {
        taxQuery: {
          relation: "AND",
          taxArray: [
            {
              field: "SLUG",
              operator: "AND",
              taxonomy: "CATEGORY",
              terms: ["top-bm"],
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
                  terms: ["super-bm"],
                },
              ],
            },
          },
        ],
      },
    };

    const superResponse = await getFilteredCategoryPosts(variables);
    const topResponse = await getFilteredCategoryPosts(variablesTopResponse);

    // ✅ DEFENSIVE: Validate both responses before combining
    const superEdges = superResponse?.posts?.edges || [];
    const topEdges = topResponse?.posts?.edges || [];

    if (superEdges.length === 0 && topEdges.length === 0) {
      console.warn(`[${pathName}] Both super-bm and top-bm returned no posts`);
    }

    // Combine posts
    const combinedPosts = {
      edges: [...superEdges, ...topEdges],
    };

    // Find current page config
    const currentPage = categoriesNavigation.find(
      (p) => p.path === pathName.replaceAll("/", "")
    );

    // ✅ DEFENSIVE: Get subcategory posts with exclude variables
    const initialSubCategoryPosts = await Promise.all(
      (currentPage?.subCategories || []).map(async (category) => {
        try {
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

          // ✅ DEFENSIVE: Validate data structure
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
            posts: { edges: posts.posts.edges },
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

export default HomeBerita;
