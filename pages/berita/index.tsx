import { GetStaticProps } from "next";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { categoriesNavigation } from "@/constants/categories-navigation";
import {
  CategoryJsonLD,
  CategoryMetadata,
} from "@/components/common/CategoryMetaData";
import { categoriesMetadataConfigs } from "@/constants/categories-meta-config";
import { GET_FILTERED_CATEGORY } from "@/lib/gql-queries/get-filtered-category";
import { CategoryPostsLayout } from "@/components/categories-landing-page/CategoryPostsLayout";
import { CategoryLandingProps } from "@/types/global";
import { CustomHomeBeritaExcludeVariables } from "@/constants/categories-custom-variables";
import { beritaLandingTargetingParams } from "@/constants/ads-targeting-params/berita";

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
    // Get super-news post
    const superResponse = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
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
                terms: ["super-bm"],
              },
            ],
          },
        },
      },
    });

    // Get top-news posts excluding super-news
    const topResponse = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
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
      },
    });

    // Combine posts
    const combinedPosts = {
      edges: [...superResponse.posts.edges, ...topResponse.posts.edges],
    };

    // Find current page config
    const currentPage = categoriesNavigation.find(
      (p) => p.path === pathName.replaceAll("/", "")
    );

    // Get subcategory posts with exclude variables
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

export default HomeBerita;
