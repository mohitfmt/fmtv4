export const GET_HEADLINES = `
  query CategoryPosts($categoryName: String!) {
    posts(
      first: 1
      where: {
        categoryName: $categoryName
        status: PUBLISH
      }
    ) {
      edges {
        node {
          title
          uri
          categories {
            edges {
              node {
                slug
                name
              }
            }
          }
        }
      }
    }
  }
`;
