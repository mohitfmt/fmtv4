export const GET_TAG = `
  query GetTag($tagId: ID!, $idType: TagIdType) {
    tag(id: $tagId, idType: $idType) {
      databaseId
      id
      name
      slug
      uri
      count
      description
    }
  }
`;
