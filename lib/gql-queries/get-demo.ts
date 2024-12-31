// lib/gql-queries/get-filtered-category.ts
export const GET_FILTERED_DEMO = `
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