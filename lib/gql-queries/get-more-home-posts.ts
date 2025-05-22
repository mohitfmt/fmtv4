import { gqlFetchAPI } from "./gql-fetch-api";
import { withLRUCache } from "@/lib/cache/withLRU";
import { LRUCache } from "lru-cache";

export const moreHomePostsCache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * 60, // 1 minute
  allowStale: false,
  updateAgeOnGet: false,
});

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

export const getMoreHomePosts = withLRUCache(
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
