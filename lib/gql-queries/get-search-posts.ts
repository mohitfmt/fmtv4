export const GET_SEARCH_POSTS = `
  query Search($where: RootQueryToPostConnectionWhereArgs) {
    posts(where: $where) {
      edges {
        node {
          id
          databaseId
          slug
          uri
          title
          date
          categories {
           edges {
             node {
               databaseId
               name
             }
           }
         }       
          featuredImage {
            node {
              sourceUrl
            }
          }
          excerpt
        }
      }
    }
  }
`;
