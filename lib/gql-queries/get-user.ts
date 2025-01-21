export const GET_AUTHOR = `
  query GetUser($userId: ID!, $idType: UserNodeIdTypeEnum) {
    user(id: $userId, idType: $idType) {
      id
      databaseId
      avatar {
        url
      }
      databaseId
      description
      slug
      name
      nicename
    }
  }
`;
