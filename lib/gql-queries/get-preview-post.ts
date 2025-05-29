export const GET_POST = `
  query GetPost($id: ID!, $idType: PostIdType!, $asPreview: Boolean) {
    post(id: $id, idType: $idType, asPreview: $asPreview) {
      id
      databaseId
      dateGmt
      modifiedGmt
      slug
      title
      content
      excerpt
      uri
      author {
        node {
          databaseId
          name
          slug
          uri
        }
      }
      categories {
        edges {
          node {
            databaseId
            name
            slug
          }
        }
      }
      tags(first: 100) {
        edges {
          node {
            databaseId
            name
            slug
          }
        }
      }
      featuredImage {
        node {
          databaseId
          sourceUrl
          altText
          mediaDetails {
            height
            width
          }
        }
      }
    }
  }
`;
