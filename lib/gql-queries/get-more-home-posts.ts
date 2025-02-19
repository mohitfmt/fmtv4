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