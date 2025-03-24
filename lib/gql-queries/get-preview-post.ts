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
          name
          slug
          uri
        }
      }
      categories {
        edges {
          node {
            name
            slug
          }
        }
      }
      tags(first: 100) {
        edges {
          node {
            name
            slug
          }
        }
      }
      featuredImage {
        node {
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
