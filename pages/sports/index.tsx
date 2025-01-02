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
        categoryName={pathName}
      />
    </>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  try {
    // Initial fetch for main category
    const initialPosts = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
      variables: {
        first: 5,
        where: {
          offsetPagination: { offset: 0, size: 9 },
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

    // Find current page config
    const currentPage = categoriesNavigation.find(
      (p) => p.path === pathName.replaceAll("/", "")
    );

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
      revalidate: 300,
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
export default HomeSports;
