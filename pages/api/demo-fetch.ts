// utils/category-fetcher.ts
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";

export interface CategoryPost {
  id?: string;
  title: string;
  excerpt: string;
  uri: string;
  date: string;
  slug: string;
  categories: {
    edges: Array<{
      node: {
        slug: string;
        name: string;
      };
    }>;
  };
  featuredImage: {
    node: {
      sourceUrl: string;
    };
  };
}

export interface CategoryPostsResponse {
  posts: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
    edges: Array<{
      cursor: string;
      node: CategoryPost;
    }>;
  };
}

const GET_POSTS_WITH_CURSOR = `
  query GetPosts(
    $first: Int
    $after: String
    $where: RootQueryToPostConnectionWhereArgs
  ) {
    posts(
      first: $first
      after: $after
      where: $where
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        cursor
        node {
          id
          title
          excerpt
          uri
          date
          slug
          categories {
            edges {
              node {
                slug
                name
              }
            }
          }
          featuredImage {
            node {
              sourceUrl
            }
          }
        }
      }
    }
  }
`;

export interface FetchCategoryPostsParams {
  categorySlug: string;
  first?: number;
  after?: string | null;
  excludeVariables?: {
    status?: string;
    taxQuery?: {
      taxArray: Array<{
        terms: string[];
        operator: string;
        taxonomy: string;
        field: string;
      }>;
      relation: string;
    };
  };
}

export async function fetchCategoryPosts({
  categorySlug,
  first = 5,
  after = null,
  excludeVariables,
}: FetchCategoryPostsParams): Promise<CategoryPostsResponse> {
  try {
    const baseTaxArray = [
      {
        terms: [categorySlug],
        operator: "AND",
        taxonomy: "CATEGORY",
        field: "SLUG",
      },
    ];

    const taxArray = excludeVariables?.taxQuery?.taxArray
      ? [...baseTaxArray, ...excludeVariables.taxQuery.taxArray]
      : baseTaxArray;

    const variables = {
      first,
      after,
      where: {
        taxQuery: {
          taxArray,
          relation: excludeVariables?.taxQuery?.relation || "AND",
        },
        status: excludeVariables?.status || "PUBLISH",
      },
    };

    const response = await gqlFetchAPI(
      GET_POSTS_WITH_CURSOR,
      variables
    );

    if (!response?.posts?.edges) {
      throw new Error("Invalid response format from API");
    }

    return response;
  } catch (error) {
    console.error(`Error fetching posts for category ${categorySlug}:`, error);
    return {
      posts: {
        pageInfo: {
          hasNextPage: false,
          endCursor: "",
        },
        edges: [],
      },
    };
  }
}