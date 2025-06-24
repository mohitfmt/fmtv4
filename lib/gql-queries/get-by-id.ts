export const GET_POST_BY_SLUG = `
query GetPost($id: ID!, $idType: PostIdType!) {
  post(id: $id, idType: $idType) {
    databaseId
    id
    title
    content
    slug
    uri
    dateGmt
    author {
      node {
        databaseId
        name
        slug
        uri
      }
    }
    featuredImage {
      node {
        sourceUrl
      }
    }
    excerpt
    categories {
      edges {
        node {
          databaseId  
          name
          slug
        }
      }
    }
    tags (first: 100) {
      edges {
        node {
          databaseId
          slug
          name
        }
      }
    }
  }
}
`;
