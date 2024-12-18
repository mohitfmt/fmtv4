import { gqlFetchAPI } from "./gql-fetch-api";

export async function getAllPostsWithSlug() {
  const data = await gqlFetchAPI(`
      {
        posts(first: 50) {
          edges {
            node {
              slug
              uri
              tags {
                edges {
                  node {
                    name
                  }
                }
              }
            }
          }
        }
      }
    `);
  return data?.posts;
}
