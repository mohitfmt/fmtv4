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
  section: [`${pathName}`],
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
    const mainData = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
      variables: {
        first: 60,
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
        },
      },
    });

    // console.log("MainData", mainData.posts.edges[0].node.featuredImage);

    const subCategoryPosts = await Promise.all(
      categoriesNavigation
        .find((p) => p.path === pathName.replaceAll("/", ""))
        ?.subCategories.map(async (category) => {
          const data = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
            variables: {
              first: 60,
              where: {
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
              edges: data.posts.edges,
            },
          };
        }) || []
    );

    // console.log("subCat:", subCategoryPosts);

    const currentPage = categoriesNavigation.find(
      (p) => p.path === pathName.replaceAll("/", "")
    );

    return {
      props: {
        posts: {
          edges: mainData.posts.edges,
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
        posts: {
          edges: [],
        },
        currentPage: null,
        subCategoryPosts: [],
        AdsTargetingParams: dfpTargetingParams,
        error: "Failed to load content",
      },
      revalidate: 30,
    };
  }
};

export default HomeSports;
