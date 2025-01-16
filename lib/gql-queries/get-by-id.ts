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
          name
          slug
        }
      }
    }
    tags {
      edges {
        node {
          slug
          name
        }
      }
    }
  }
}
`;
