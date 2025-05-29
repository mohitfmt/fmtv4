// lib/gql-queries/get-more-home-posts.ts - UPDATED VERSION
import { gqlFetchAPI } from "./gql-fetch-api";
import { withSmartLRUCache } from "@/lib/cache/withSmartLRU";
import { moreHomePostsCache } from "@/lib/cache/smart-cache-registry";

// Remove old cache creation

async function rawGetMoreHomePosts({
  category,
  offset,
  size,
}: {
  category: string;
  offset: number;
  size: number;
}) {
  try {
    const data = await gqlFetchAPI(GET_MORE_HOME_POSTS_QUERY, {
      variables: { category, offset, size },
    });
    return data;
  } catch (error) {
    console.error(
      `[getMoreHomePosts] Error for ${category} @ page offset ${offset}:`,
      error
    );
    return null;
  }
}

export const getMoreHomePosts = withSmartLRUCache(
  ({ category, offset, size }) => `moreHomePosts:${category}:${offset}:${size}`,
  rawGetMoreHomePosts,
  moreHomePostsCache
);

export const GET_MORE_HOME_POSTS_QUERY = `
  query GetPosts($category: String!, $offset: Int!, $size: Int!) {
    posts(
      where: {
        categoryName: $category,
        offsetPagination: { offset: $offset, size: $size }
        excludeQuery: [
          {
            status: PUBLISH
            first: 1
            taxQuery: {
              relation: AND
              taxArray: [
                {
                  field: SLUG
                  operator: AND
                  taxonomy: CATEGORY
                  terms: ["super-highlight"]
                }
              ]
            }
          }
          {
            status: PUBLISH
            first: 4
            taxQuery: {
              relation: AND
              taxArray: [
                {
                  field: SLUG
                  operator: AND
                  taxonomy: CATEGORY
                  terms: ["highlight"]
                }
              ]
            }
          }
        ]
      }
    ) {
      edges {
        node {
          databaseId
          title
          excerpt
          slug
          uri
          date
          featuredImage {
            node {
              sourceUrl
            }
          }
          categories {
            edges {
              node {
                slug
                name
                id
              }
            }
          }
          author {
            node {
              slug
              name
              firstName
              lastName
              avatar {
                url
              }
            }
          }
        }
      }
      pageInfo {
        offsetPagination {
          total
        }
      }
    }
  }
`;
