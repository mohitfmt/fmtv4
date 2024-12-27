import { GetStaticProps } from "next";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { CustomHomeSportsExcludeVariables } from "@/constants/categories-custom-variables";
import { categoriesNavigation } from "@/constants/categories-navigation";
import {
  CategoryJsonLD,
  CategoryMetadata,
} from "@/components/common/CategoryMetaData";
import { categoriesMetadataConfigs } from "@/constants/categories-meta-config";
import {
  GET_FILTERED_CATEGORY,
  PostsResponse,
} from "@/lib/gql-queries/get-filtered-category";
import { CategoryPostsLayout } from "@/components/categories-landing-page/CategoryPostsLayout";

interface SubCategoryPost {
  slug: string;
  posts: {
    edges: PostsResponse["posts"]["edges"];
  };
  bigImage: boolean;
}

interface HomeSportsProps {
  posts: {
    edges: PostsResponse["posts"]["edges"];
  };
  currentPage: (typeof categoriesNavigation)[0] | undefined;
  error?: string;
  subCategoryPosts: SubCategoryPost[];
  AdsTargetingParams: {
    pos: string;
    section: string[];
  };
}

const categoryTitle = "Sports";
const excludeVariables = CustomHomeSportsExcludeVariables;
const pathName = "/sports";
const terms = "sports";

const dfpTargetingParams = {
  pos: "listing",
  section: ["sports", "landing-page", "sports-landing-page"],
  key: [
    "sports",
    "sports news",
    "sports betting",
    "sports gambling",
    "sports analysis",
    "sports predictions",
    "badminton",
    "basketball",
    "boxing",
    "cricket",
    "cycling",
    "football",
    "golf",
    "hockey",
    "tennis",
    "rugby",
    "swimming",
    "table tennis",
    "volleyball",
    "wrestling",
    "athletics",
    "motorsport",
    "gambling",
    "religion",
    "alcohol",
    "lgbt",
    "sex",
    "drug abuse",
    "get rich",
    "match-making",
    "dating",
    "lottery",
  ],
};

const HomeSports = ({
  posts,
  currentPage,
  subCategoryPosts,
}: HomeSportsProps) => {
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
        AdsTargetingParams={dfpTargetingParams}
        subCategoryPosts={subCategoryPosts}
      />
    </>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  try {
    // Main category: Initial 5 posts, then chunks of 5 up to 100
    const mainChunkSize = 5;
    const totalPosts = 20;
    const mainChunks = [];

    for (let offset = 0; offset < totalPosts; offset += mainChunkSize) {
      const chunk = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
        variables: {
          first: mainChunkSize,
          where: {
            offsetPagination: { offset, size: mainChunkSize },
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

      // If we got fewer posts than requested, we've reached the end
      if (chunk.posts.edges.length === 0) break;
      mainChunks.push(...chunk.posts.edges);
    }

    // Find current page config to get subcategories
    const currentPage = categoriesNavigation.find(
      (p) => p.path === pathName.replaceAll("/", "")
    );

    // Fetch subcategory posts in parallel
    const subCategoryPosts = await Promise.all(
      (currentPage?.subCategories || []).map(async (category) => {
        const subChunkSize = 6;
        const totalSubPosts = 18;
        const subChunks = [];

        for (let offset = 0; offset < totalSubPosts; offset += subChunkSize) {
          const chunk = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
            variables: {
              first: subChunkSize,
              where: {
                offsetPagination: { offset, size: subChunkSize },
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

          // If we got fewer posts than requested, we've reached the end
          if (chunk.posts.edges.length === 0) break;
          subChunks.push(...chunk.posts.edges);
        }

        return {
          slug: category.slug,
          posts: {
            edges: subChunks,
          },
        };
      })
    );

    return {
      props: {
        posts: {
          edges: mainChunks,
        },
        currentPage: currentPage || null,
        subCategoryPosts,
        AdsTargetingParams: dfpTargetingParams,
      },
      revalidate: 300,
    };
  } catch (error) {
    console.error("Error in getStaticProps:", error);
    return {
      props: {
        posts: { edges: [] },
        currentPage: null,
        subCategoryPosts: [],
        AdsTargetingParams: dfpTargetingParams,
        error: "Failed to load content",
      },
      revalidate: 10,
    };
  }
};

export default HomeSports;
